import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { Search, MapPin, Clock, Star, Heart, TrendingUp, ArrowRight, Bus, Award, Tag, Building2 } from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useSession } from "../../contexts/SessionProvider";
import { useTheme } from "../../contexts/ThemeProvider";

export default function AccueilScreen() {
  // Récupère les informations sur les marges de sécurité de l'écran
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();
  // State pour la ville de départ
  const [depart, setDepart] = useState("");
  // State pour la ville d'arrivée
  const [arrivee, setArrivee] = useState("");
  // State pour les trajets populaires
  const [trajetsPopulaires, setTrajetsPopulaires] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [destinations, setDestinations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [compagnies, setCompagnies] = useState([]);
  const [offresSpeciales, setOffresSpeciales] = useState([]);

  // Recharge les données à chaque fois que l'onglet reçoit le focus
  useEffect(() => {
    if (isFocused) {
      loadPopularRoutes();
      loadDestinations();
      loadCompagnies();
      loadOffresSpeciales();
      if (session?.user?.id) {
        loadFavorites();
      }
    }
  }, [isFocused, session?.user?.id]);

  // Realtime: refresh favorites and popular routes when data changes
  useEffect(() => {
    const userId = session?.user?.id;
    const channels = [];
    if (userId) {
      const favCh = supabase
        .channel('realtime-favoris-home')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'favoris', filter: `user_id=eq.${userId}` },
          () => {
            loadFavorites();
          }
        )
        .subscribe();
      channels.push(favCh);
    }
    const trajetsCh = supabase
      .channel('realtime-trajets-home')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trajets' },
        () => {
          loadPopularRoutes();
        }
      )
      .subscribe();
    channels.push(trajetsCh);
    const destCh = supabase
      .channel('realtime-destinations-home')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'destinations' },
        () => { loadDestinations(); }
      )
      .subscribe();
    channels.push(destCh);

    return () => {
      channels.forEach((ch) => {
        try { supabase.removeChannel(ch); } catch {}
      });
    };
  }, [session?.user?.id]);

  const loadDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('id, nom')
        .order('nom', { ascending: true });
      if (error) throw error;
      setDestinations(data ?? []);
    } catch (e) {
      setDestinations([]);
    }
  };

  const loadCompagnies = async () => {
    try {
      // Charger les compagnies avec leurs trajets pour calculer les notes
      const { data, error } = await supabase
        .from('compagnies')
        .select('id, nom, logo_url, trajets(note, nb_avis)')
        .order('nom', { ascending: true })
        .limit(10);
      
      if (error) {
        console.error("Erreur lors du chargement des compagnies:", error);
        setCompagnies([]);
        return;
      }

      // Calculer la note moyenne pour chaque compagnie
      const compagniesAvecNote = (data ?? []).map((compagnie) => {
        const trajets = compagnie.trajets || [];
        let totalNote = 0;
        let totalAvis = 0;
        
        trajets.forEach((trajet) => {
          if (trajet.note && trajet.nb_avis) {
            totalNote += trajet.note * trajet.nb_avis;
            totalAvis += trajet.nb_avis;
          }
        });
        
        const noteMoyenne = totalAvis > 0 ? (totalNote / totalAvis).toFixed(1) : null;
        
        return {
          id: compagnie.id,
          nom: compagnie.nom,
          logo_url: compagnie.logo_url,
          note: noteMoyenne,
          nb_avis: totalAvis,
        };
      });

      // Trier par note décroissante et prendre les 5 meilleures
      const sorted = compagniesAvecNote
        .filter((c) => c.note !== null)
        .sort((a, b) => parseFloat(b.note) - parseFloat(a.note))
        .slice(0, 5);

      // Si moins de 5 compagnies notées, ajouter les autres
      if (sorted.length < 5) {
        const notRated = compagniesAvecNote
          .filter((c) => c.note === null)
          .slice(0, 5 - sorted.length);
        sorted.push(...notRated);
      }

      setCompagnies(sorted);
    } catch (e) {
      console.error("Erreur complète chargement compagnies:", e);
      setCompagnies([]);
    }
  };

  const loadOffresSpeciales = async () => {
    try {
      const { data, error } = await supabase
        .from('trajets')
        .select('id, depart, arrivee, prix, note, compagnies:compagnie_id(nom)')
        .order('prix', { ascending: true })
        .limit(3);
      if (error) throw error;
      const mapped = (data ?? []).map((t) => ({
        ...t,
        compagnie: t?.compagnies?.nom ?? undefined,
      }));
      setOffresSpeciales(mapped);
    } catch (e) {
      setOffresSpeciales([]);
    }
  };

  const loadFavorites = async () => {
    try {
      if (!session?.user?.id) {
        setFavorites(new Set());
        return;
      }
      const { data, error } = await supabase
        .from("favoris")
        .select("trajet_id")
        .eq("user_id", session.user.id);
      if (error) throw error;
      setFavorites(new Set((data ?? []).map((r) => r.trajet_id)));
    } catch (e) {
      setFavorites(new Set());
    }
  };

  const toggleFavorite = async (trajetId) => {
    if (!session?.user?.id) return;
    const isFav = favorites.has(trajetId);
    try {
      if (!isFav) {
        setFavorites((prev) => new Set(prev).add(trajetId));
        const { error } = await supabase
          .from("favoris")
          .insert({ user_id: session.user.id, trajet_id: trajetId });
        if (error && error.code !== "23505") throw error;
      } else {
        const next = new Set(favorites);
        next.delete(trajetId);
        setFavorites(next);
        const { error } = await supabase
          .from("favoris")
          .delete()
          .eq("user_id", session.user.id)
          .eq("trajet_id", trajetId);
        if (error) throw error;
      }
    } catch (e) {
      await loadFavorites();
    }
  };

  // Fonction pour charger les trajets populaires depuis Supabase
  const loadPopularRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from("trajets")
        .select("id, depart, arrivee, prix, note, nb_avis, horaires, compagnies:compagnie_id(nom)")
        .order("note", { ascending: false })
        .order("nb_avis", { ascending: false })
        .limit(3);
      if (error) throw error;
      const mapped = (data ?? []).map((t) => ({
        ...t,
        compagnie: t?.compagnies?.nom ?? undefined,
      }));
      setTrajetsPopulaires(mapped);
    } catch (error) {
      console.error("Erreur lors du chargement des trajets populaires:", error);
      setTrajetsPopulaires([]);
    }
  };

  // Fonction pour le pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPopularRoutes(),
        loadDestinations(),
        loadCompagnies(),
        loadOffresSpeciales(),
        session?.user?.id && loadFavorites(),
      ]);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fonction pour gérer la recherche de trajets
  const handleSearch = () => {
    if (depart && arrivee) {
      // Redirige vers la page des trajets avec les villes de départ et d'arrivée en paramètres
      const d = encodeURIComponent(depart);
      const a = encodeURIComponent(arrivee);
      router.push(`/(tabs)/trajets?depart=${d}&arrivee=${a}`);
    } else {
      // Redirige vers la page des trajets sans paramètres
      router.push("/(tabs)/trajets");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Barre de statut */}
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Contenu principal scrollable */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
      >
        {/* Header avec gradient visuel */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <View style={{ 
            backgroundColor: theme.surface,
            borderRadius: 20,
            padding: 24,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}>
                <Bus size={28} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "700",
                    color: theme.text,
                    marginBottom: 4,
                  }}
                >
                  Bus Bénin
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.textSecondary,
                    lineHeight: 20,
                  }}
                >
                  Votre compagnon de voyage
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 13,
                color: theme.textSecondary,
                lineHeight: 22,
              }}
            >
              Trouvez et réservez facilement vos trajets en bus à travers le Bénin 
            </Text>
          </View>
        </View>

        {/* Carte de recherche avec design amélioré */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 16,
              padding: 24,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 5,
              borderWidth: 1,
              borderColor: theme.borderLight,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: theme.primaryLight || theme.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Search size={20} color={theme.commun} />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: theme.text,
                }}
              >
                Rechercher un trajet
              </Text>
            </View>

            {/* Input pour la ville de départ avec style amélioré */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.text,
                  marginBottom: 10,
                }}
              >
                Départ
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: depart ? theme.primary : theme.borderLight,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: theme.background,
                }}
              >
                <MapPin size={20} color={depart ? theme.primary : theme.textSecondary} style={{ marginRight: 12 }} />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: theme.text,
                    fontWeight: '500',
                  }}
                  placeholder="Ville de départ"
                  placeholderTextColor={theme.textTertiary}
                  value={depart}
                  onChangeText={setDepart}
                />
              </View>
            </View>

            {/* Input pour la ville d'arrivée avec style amélioré */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.text,
                  marginBottom: 10,
                }}
              >
                Arrivée
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: arrivee ? theme.primary : theme.borderLight,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: theme.background,
                }}
              >
                <MapPin size={20} color={arrivee ? theme.primary : theme.textSecondary} style={{ marginRight: 12 }} />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: theme.text,
                    fontWeight: '500',
                  }}
                  placeholder="Ville d'arrivée"
                  placeholderTextColor={theme.textTertiary}
                  value={arrivee}
                  onChangeText={setArrivee}
                />
              </View>
            </View>

            {/* Bouton de recherche amélioré */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
              onPress={handleSearch}
              activeOpacity={0.85}
            >
              <Search size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: "#FFFFFF",
                  letterSpacing: 0.5,
                }}
              >
                Rechercher des trajets
              </Text>
              <ArrowRight size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Destinations populaires avec header amélioré */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: theme.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}>
              <TrendingUp size={18} color={theme.primary} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: theme.text,
              }}
            >
              Destinations populaires
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20, paddingBottom: 20}}
          >
            {destinations.map((dest) => (
              <TouchableOpacity
                key={dest.id}
                style={{
                  backgroundColor: theme.surface,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 24,
                  marginRight: 12,
                  borderWidth: 2,
                  borderColor: (depart === dest.nom || arrivee === dest.nom) ? theme.primary : theme.borderLight,
                  shadowColor: theme.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.02,
                  shadowRadius: 8,
                  elevation: 1,
                }}
                onPress={() => {
                  // Si la ville de départ n'est pas définie, on la définit
                  if (!depart) {
                    setDepart(dest.nom);
                  } else if (!arrivee && dest.nom !== depart) {
                    // Si la ville d'arrivée n'est pas définie et que la ville sélectionnée est différente de la ville de départ, on la définit
                    setArrivee(dest.nom);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: (depart === dest.nom || arrivee === dest.nom) ? theme.primary : theme.text,
                  }}
                >
                  {dest.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Trajets populaires avec header et badge */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: theme.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}>
                <Star size={18} color={theme.warning} fill={theme.warning} />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: theme.text,
                }}
              >
                Trajets populaires
              </Text>
            </View>
            <View style={{
              backgroundColor: theme.primaryLight || theme.surfaceSecondary,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>Top {trajetsPopulaires.length}</Text>
            </View>
          </View>
          {trajetsPopulaires.length === 0 ? (
            // Affiche un message de chargement si les trajets populaires ne sont pas encore chargés
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                Chargement des trajets populaires...
              </Text>
            </View>
          ) : (
            // Affiche la liste des trajets populaires
            trajetsPopulaires.map((trajet) => (
              <View
                key={trajet.id}
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  shadowColor: theme.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                  borderWidth: 1,
                  borderColor: theme.borderLight,
                }}
              >
                <TouchableOpacity
                  onPress={() => router.push(`/trajet/${trajet.id}`)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.text,
                          marginBottom: 4,
                        }}
                      >
                        {trajet.depart} → {trajet.arrivee}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: theme.textSecondary,
                          marginBottom: 4,
                        }}
                      >
                        {trajet.compagnie}
                      </Text>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Star size={14} color={theme.warning} fill={theme.warning} />
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.textSecondary,
                            marginLeft: 4,
                          }}
                        >
                          {trajet.note}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.preventDefault?.();
                          e.stopPropagation?.();
                          toggleFavorite(trajet.id);
                        }}
                        activeOpacity={0.7}
                        style={{ marginBottom: 8 }}
                      >
                        <Heart
                          size={20}
                          color={favorites.has(trajet.id) ? theme.error : theme.textSecondary}
                          fill={favorites.has(trajet.id) ? theme.error : "transparent"}
                        />
                      </TouchableOpacity>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "600",
                          color: theme.primary,
                        }}
                      >
                        {trajet.prix} FCFA
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Clock size={14} color={theme.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                      {trajet.horaires ? trajet.horaires.join(", ") : "N/A"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Bouton de réservation amélioré */}
                <TouchableOpacity
                  onPress={() => router.push(`/reservation/${trajet.id}`)}
                  style={{
                    backgroundColor: theme.primary,
                    padding: 14,
                    borderRadius: 12,
                    marginTop: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", marginRight: 8 }}>
                    Réserver maintenant
                  </Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Compagnies recommandées */}
        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: theme.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}>
              <Award size={18} color={theme.primary} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: theme.text,
              }}
            >
              Compagnies recommandées
            </Text>
          </View>
          {compagnies.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                Chargement des compagnies...
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20, paddingBottom: 20 }}
            >
              {compagnies.map((compagnie) => (
                <TouchableOpacity
                  key={compagnie.id}
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 16,
                    padding: 20,
                    marginRight: 16,
                    width: 160,
                    shadowColor: theme.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 1,
                    borderWidth: 1,
                    borderColor: theme.borderLight,
                  }}
                  onPress={() => router.push(`/(tabs)/trajets?compagnie=${compagnie.nom}`)}
                  activeOpacity={0.7}
                >
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: theme.primaryLight || theme.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                    overflow: 'hidden',
                  }}>
                    {compagnie.logo_url ? (
                      <Image
                        source={{ uri: compagnie.logo_url }}
                        style={{ width: 48, height: 48 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Building2 size={24} color={theme.primary} />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: theme.text,
                      marginBottom: 6,
                    }}
                    numberOfLines={1}
                  >
                    {compagnie.nom}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Star size={14} color={theme.warning} fill={theme.warning} />
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.textSecondary,
                        marginLeft: 4,
                        fontWeight: '600',
                      }}
                    >
                      {compagnie.note || "N/A"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Offres spéciales */}
        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: theme.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}>
                <Tag size={18} color={theme.success} />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: theme.text,
                }}
              >
                Offres spéciales
              </Text>
            </View>
            <View style={{
              backgroundColor: theme.successLight || theme.surfaceSecondary,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.success }}>Prix bas</Text>
            </View>
          </View>
          {offresSpeciales.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                Chargement des offres...
              </Text>
            </View>
          ) : (
            offresSpeciales.map((offre) => (
              <TouchableOpacity
                key={offre.id}
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  shadowColor: theme.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                  borderWidth: 2,
                  borderColor: theme.success,
                }}
                onPress={() => router.push(`/trajet/${offre.id}`)}
                activeOpacity={0.7}
              >
                <View style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  backgroundColor: theme.success,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>PROMO</Text>
                </View>
                <View style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <View style={{ flex: 1, paddingRight: 60 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: theme.text,
                        marginBottom: 4,
                      }}
                    >
                      {offre.depart} → {offre.arrivee}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: theme.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      {offre.compagnie}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Star size={14} color={theme.warning} fill={theme.warning} />
                      <Text
                        style={{
                          fontSize: 12,
                          color: theme.textSecondary,
                          marginLeft: 4,
                        }}
                      >
                        {offre.note}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "700",
                        color: theme.success,
                      }}
                    >
                      {offre.prix} FCFA
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
