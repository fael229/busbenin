import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, MapPin, Clock, Star, Heart } from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useSession } from "../../contexts/SessionProvider";

export default function AccueilScreen() {
  // Récupère les informations sur les marges de sécurité de l'écran
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  // State pour la ville de départ
  const [depart, setDepart] = useState("");
  // State pour la ville d'arrivée
  const [arrivee, setArrivee] = useState("");
  // State pour les trajets populaires
  const [trajetsPopulaires, setTrajetsPopulaires] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [destinations, setDestinations] = useState([]);

  // Charge les trajets populaires au montage du composant
  useEffect(() => {
    loadPopularRoutes();
    loadDestinations();
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [session?.user?.id]);

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
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Barre de statut */}
      <StatusBar style="dark" />

      {/* Contenu principal scrollable */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "600",
              color: "#1E88E5",
              marginBottom: 8,
            }}
          >
            Bus Bénin
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#6B7280",
              lineHeight: 24,
            }}
          >
            Trouvez facilement vos trajets en bus au Bénin
          </Text>
        </View>

        {/* Carte de recherche */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#1F2937",
                marginBottom: 20,
              }}
            >
              Rechercher un trajet
            </Text>

            {/* Input pour la ville de départ */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Départ
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
              >
                <MapPin size={20} color="#6B7280" style={{ marginRight: 12 }} />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: "#1F2937",
                  }}
                  placeholder="Ville de départ"
                  placeholderTextColor="#9CA3AF"
                  value={depart}
                  onChangeText={setDepart}
                />
              </View>
            </View>

            {/* Input pour la ville d'arrivée */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Arrivée
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
              >
                <MapPin size={20} color="#6B7280" style={{ marginRight: 12 }} />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: "#1F2937",
                  }}
                  placeholder="Ville d'arrivée"
                  placeholderTextColor="#9CA3AF"
                  value={arrivee}
                  onChangeText={setArrivee}
                />
              </View>
            </View>

            {/* Bouton de recherche */}
            <TouchableOpacity
              style={{
                backgroundColor: "#1E88E5",
                borderRadius: 8,
                paddingVertical: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
              onPress={handleSearch}
              activeOpacity={0.8}
            >
              <Search size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#FFFFFF",
                }}
              >
                Rechercher
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Villes populaires */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#1F2937",
              marginBottom: 16,
            }}
          >
            Destinations populaires
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {destinations.map((dest) => (
              <TouchableOpacity
                key={dest.id}
                style={{
                  backgroundColor: "#F3F4F6",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 12,
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
                    fontSize: 14,
                    fontWeight: "500",
                    color: "#1E88E5",
                  }}
                >
                  {dest.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Trajets populaires */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#1F2937",
              marginBottom: 16,
            }}
          >
            Trajets populaires
          </Text>
          {trajetsPopulaires.length === 0 ? (
            // Affiche un message de chargement si les trajets populaires ne sont pas encore chargés
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ fontSize: 14, color: "#6B7280" }}>
                Chargement des trajets populaires...
              </Text>
            </View>
          ) : (
            // Affiche la liste des trajets populaires
            trajetsPopulaires.map((trajet) => (
              <TouchableOpacity
                key={trajet.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
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
                        color: "#1F2937",
                        marginBottom: 4,
                      }}
                    >
                      {trajet.depart} → {trajet.arrivee}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#6B7280",
                        marginBottom: 4,
                      }}
                    >
                      {trajet.compagnie}
                    </Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Star size={14} color="#F59E0B" fill="#F59E0B" />
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#6B7280",
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
                        color={favorites.has(trajet.id) ? "#EF4444" : "#6B7280"}
                        fill={favorites.has(trajet.id) ? "#EF4444" : "transparent"}
                      />
                    </TouchableOpacity>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: "#1E88E5",
                      }}
                    >
                      {trajet.prix} FCFA
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Clock size={14} color="#6B7280" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    {trajet.horaires ? trajet.horaires.join(", ") : "N/A"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
