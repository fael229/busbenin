import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { Search, MapPin, Clock, Star, Filter, Heart, ArrowRight, Bus, Package, X, Check, ChevronDown, DollarSign, TrendingUp, Award } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useSession } from "../../contexts/SessionProvider";
import { useTheme } from "../../contexts/ThemeProvider";

export default function TrajetsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { session } = useSession();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();
  const [depart, setDepart] = useState(
    typeof params.depart === "string" ? decodeURIComponent(params.depart) : ""
  );
  const [arrivee, setArrivee] = useState(
    typeof params.arrivee === "string" ? decodeURIComponent(params.arrivee) : ""
  );
  const [trajets, setTrajets] = useState([]);
  const [filteredTrajets, setFilteredTrajets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  
  // États pour les filtres
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [compagnies, setCompagnies] = useState([]);
  const [filters, setFilters] = useState({
    prixMin: "",
    prixMax: "",
    compagnieIds: [],
    noteMin: 0,
    sortBy: "pertinence", // pertinence, prix_asc, prix_desc, note, populaire
    horaireDebut: "",
    horaireFin: "",
  });

  // Keep local state in sync if the route params change (e.g., user searches again)
  useEffect(() => {
    setDepart(
      typeof params.depart === "string" ? decodeURIComponent(params.depart) : ""
    );
    setArrivee(
      typeof params.arrivee === "string" ? decodeURIComponent(params.arrivee) : ""
    );
  }, [params.depart, params.arrivee]);

  // Charger les compagnies au montage
  useEffect(() => {
    loadCompagnies();
  }, []);

  // Recharge les données quand l'onglet reçoit le focus ou que les paramètres changent
  useEffect(() => {
    if (isFocused) {
      searchTrajets();
      if (session?.user?.id) {
        loadFavorites();
      }
    }
  }, [isFocused, depart, arrivee, session?.user?.id]);

  // Appliquer les filtres quand trajets ou filters changent
  useEffect(() => {
    applyFilters();
  }, [trajets, filters]);

  // Realtime: update favorites and results automatically
  useEffect(() => {
    const userId = session?.user?.id;
    const channels = [];
    if (userId) {
      const favCh = supabase
        .channel('realtime-favoris-trajets')
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
      .channel('realtime-trajets-trajets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trajets' },
        () => {
          searchTrajets();
        }
      )
      .subscribe();
    channels.push(trajetsCh);

    return () => {
      channels.forEach((ch) => {
        try { supabase.removeChannel(ch); } catch {}
      });
    };
  }, [session?.user?.id, depart, arrivee]);

  const loadCompagnies = async () => {
    try {
      const { data, error } = await supabase
        .from("compagnies")
        .select("id, nom")
        .order("nom");
      if (error) throw error;
      setCompagnies(data ?? []);
    } catch (e) {
      console.error("Error loading compagnies:", e);
      setCompagnies([]);
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
      const ids = new Set((data ?? []).map((r) => r.trajet_id));
      setFavorites(ids);
    } catch (e) {
      setFavorites(new Set());
    }
  };

  const toggleFavorite = async (trajetId) => {
    if (!session?.user?.id) {
      return;
    }
    const isFav = favorites.has(trajetId);
    try {
      if (!isFav) {
        setFavorites((prev) => new Set(prev).add(trajetId));
        const { error } = await supabase
          .from("favoris")
          .insert({ user_id: session.user.id, trajet_id: trajetId });
        if (error && error.code !== "23505") {
          throw error;
        }
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

  const searchTrajets = async () => {
    try {
      setLoading(true);

      const dep = (depart || "").trim();
      const arr = (arrivee || "").trim();

      const baseSelect = `
        *,
        compagnies ( nom )
      `;

      let data = [];
      let error = null;

      if (dep && arr) {
        // 1) Strict: depart contains dep AND arrivee contains arr
        let q1 = supabase.from("trajets").select(baseSelect).ilike("depart", `%${dep}%`).ilike("arrivee", `%${arr}%`);
        ({ data, error } = await q1);

        if (!error && (data?.length ?? 0) === 0) {
          // 2) Swapped: user might have inverted fields
          let q2 = supabase.from("trajets").select(baseSelect).ilike("depart", `%${arr}%`).ilike("arrivee", `%${dep}%`);
          ({ data, error } = await q2);
        }

        if (!error && (data?.length ?? 0) === 0) {
          // 3) Broader OR match on either field
          let q3 = supabase
            .from("trajets")
            .select(baseSelect)
            .or(`depart.ilike.%${dep}%,arrivee.ilike.%${arr}%`);
          ({ data, error } = await q3);
        }
      } else if (dep || arr) {
        const term = dep || arr;
        // Match either depart or arrivee
        let q = supabase
          .from("trajets")
          .select(baseSelect)
          .or(`depart.ilike.%${term}%,arrivee.ilike.%${term}%`);
        ({ data, error } = await q);
      } else {
        // No filters: return all trajets ordered from newest to oldest
        let qAll = supabase
          .from("trajets")
          .select(baseSelect)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false });
        ({ data, error } = await qAll);
      }

      if (error) {
        throw error;
      }

      setTrajets(data ?? []);
    } catch (error) {
      console.error("Error fetching trajets:", error);
      setTrajets([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...trajets];

    // Filtre par prix
    if (filters.prixMin) {
      const min = parseFloat(filters.prixMin);
      filtered = filtered.filter((t) => parseFloat(t.prix) >= min);
    }
    if (filters.prixMax) {
      const max = parseFloat(filters.prixMax);
      filtered = filtered.filter((t) => parseFloat(t.prix) <= max);
    }

    // Filtre par compagnies
    if (filters.compagnieIds.length > 0) {
      filtered = filtered.filter((t) =>
        filters.compagnieIds.includes(t.compagnie_id)
      );
    }

    // Filtre par note minimale
    if (filters.noteMin > 0) {
      filtered = filtered.filter((t) => parseFloat(t.note || 0) >= filters.noteMin);
    }

    // Filtre par horaire
    if (filters.horaireDebut || filters.horaireFin) {
      filtered = filtered.filter((t) => {
        if (!t.horaires || !Array.isArray(t.horaires)) return false;
        return t.horaires.some((h) => {
          const [hh, mm] = h.split(":").map((x) => parseInt(x, 10));
          const minutes = hh * 60 + mm;
          let matchDebut = true;
          let matchFin = true;
          if (filters.horaireDebut) {
            const [dh, dm] = filters.horaireDebut.split(":").map((x) => parseInt(x, 10));
            const debutMin = dh * 60 + dm;
            matchDebut = minutes >= debutMin;
          }
          if (filters.horaireFin) {
            const [fh, fm] = filters.horaireFin.split(":").map((x) => parseInt(x, 10));
            const finMin = fh * 60 + fm;
            matchFin = minutes <= finMin;
          }
          return matchDebut && matchFin;
        });
      });
    }

    // Tri
    switch (filters.sortBy) {
      case "prix_asc":
        filtered.sort((a, b) => parseFloat(a.prix) - parseFloat(b.prix));
        break;
      case "prix_desc":
        filtered.sort((a, b) => parseFloat(b.prix) - parseFloat(a.prix));
        break;
      case "note":
        filtered.sort((a, b) => parseFloat(b.note || 0) - parseFloat(a.note || 0));
        break;
      case "populaire":
        filtered.sort((a, b) => (b.nb_avis || 0) - (a.nb_avis || 0));
        break;
      default:
        // pertinence: garder l'ordre par défaut
        break;
    }

    setFilteredTrajets(filtered);
  };

  const resetFilters = () => {
    setFilters({
      prixMin: "",
      prixMax: "",
      compagnieIds: [],
      noteMin: 0,
      sortBy: "pertinence",
      horaireDebut: "",
      horaireFin: "",
    });
  };

  const toggleCompagnie = (id) => {
    setFilters((prev) => {
      const isSelected = prev.compagnieIds.includes(id);
      return {
        ...prev,
        compagnieIds: isSelected
          ? prev.compagnieIds.filter((cid) => cid !== id)
          : [...prev.compagnieIds, id],
      };
    });
  };

  const countActiveFilters = () => {
    let count = 0;
    if (filters.prixMin || filters.prixMax) count++;
    if (filters.compagnieIds.length > 0) count++;
    if (filters.noteMin > 0) count++;
    if (filters.sortBy !== "pertinence") count++;
    if (filters.horaireDebut || filters.horaireFin) count++;
    return count;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await searchTrajets();
    if (session?.user?.id) {
      await loadFavorites();
    }
    setRefreshing(false);
  };

  const handleSearch = () => {
    searchTrajets();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

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
        {/* Header amélioré avec stats */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{
            backgroundColor: theme.surface,
            borderRadius: 16,
            padding: 20,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Search size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: theme.text,
                    marginBottom: 4,
                  }}
                >
                  Recherche de trajets
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    backgroundColor: theme.primaryLight || theme.surfaceSecondary,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                  }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: theme.primary,
                      }}
                    >
                      {filteredTrajets.length} résultat{filteredTrajets.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Formulaire de recherche amélioré */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 16,
              padding: 20,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
              borderWidth: 1,
              borderColor: theme.borderLight,
            }}
          >
            {/* Champs de recherche */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 10 }}>
                TRAJET
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor: depart ? theme.primary : theme.borderLight,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      backgroundColor: theme.background,
                    }}
                  >
                    <MapPin
                      size={18}
                      color={depart ? theme.primary : theme.textSecondary}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: theme.text,
                        fontWeight: '500',
                      }}
                      placeholder="Départ"
                      placeholderTextColor={theme.textTertiary}
                      value={depart}
                      onChangeText={setDepart}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor: arrivee ? theme.primary : theme.borderLight,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      backgroundColor: theme.background,
                    }}
                  >
                    <MapPin
                      size={18}
                      color={arrivee ? theme.primary : theme.textSecondary}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: theme.text,
                        fontWeight: '500',
                      }}
                      placeholder="Arrivée"
                      placeholderTextColor={theme.textTertiary}
                      value={arrivee}
                      onChangeText={setArrivee}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Boutons d'action */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  marginRight: 10,
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4,
                }}
                onPress={handleSearch}
                activeOpacity={0.85}
              >
                <Search size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: "#FFFFFF",
                  }}
                >
                  Rechercher
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: countActiveFilters() > 0 ? theme.primary : theme.surfaceSecondary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: countActiveFilters() > 0 ? theme.primary : theme.borderLight,
                  position: 'relative',
                }}
                activeOpacity={0.7}
                onPress={() => setShowFilterModal(true)}
              >
                <Filter size={20} color={countActiveFilters() > 0 ? "#FFFFFF" : theme.textSecondary} />
                {countActiveFilters() > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    backgroundColor: theme.error,
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                      {countActiveFilters()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Results */}
        <View style={{ paddingHorizontal: 20 }}>
          {loading ? (
            <View style={{
              backgroundColor: theme.surface,
              borderRadius: 16,
              padding: 40,
              alignItems: "center",
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.primaryLight || theme.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
                <Bus size={28} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 4 }}>
                Recherche en cours...
              </Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                Veuillez patienter
              </Text>
            </View>
          ) : filteredTrajets.length === 0 ? (
            <View style={{
              backgroundColor: theme.surface,
              borderRadius: 16,
              padding: 40,
              alignItems: "center",
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Package size={32} color={theme.textSecondary} />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                Aucun trajet trouvé
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: theme.textSecondary,
                  textAlign: "center",
                  lineHeight: 22,
                  paddingHorizontal: 20,
                }}
              >
                Essayez de modifier vos critères de recherche ou explorez d'autres destinations
              </Text>
            </View>
          ) : (
            filteredTrajets.map((trajet) => (
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
                  onPress={() => router.push(`/trajet/${trajet.id}?fromTrajets=true`)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
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
                          color: theme.primary,
                          fontWeight: "500",
                          marginBottom: 4,
                        }}
                      >
                        {trajet.compagnies.nom}
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
                          {trajet.note} ({trajet.nb_avis} avis)
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

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Clock size={14} color={theme.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                      Départs:{" "}
                      {trajet.horaires ? trajet.horaires.join(", ") : "N/A"}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.textSecondary,
                    }}
                  >
                    {trajet.gare}
                  </Text>
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
      </ScrollView>

      {/* Modal de filtres avancés */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} 
          onPress={() => setShowFilterModal(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable 
              style={{
                backgroundColor: theme.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                height: '85%',
                overflow: 'hidden',
              }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.borderLight,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: theme.primaryLight || theme.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Filter size={18} color={theme.primary} />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text }}>
                    Filtres
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: theme.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={{ flex: 1 }} 
                contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
              <View style={{ paddingHorizontal: 20 }}>
                {/* Tri */}
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <TrendingUp size={18} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                      Trier par
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {[
                      { value: 'pertinence', label: 'Pertinence' },
                      { value: 'prix_asc', label: 'Prix croissant' },
                      { value: 'prix_desc', label: 'Prix décroissant' },
                      { value: 'note', label: 'Meilleure note' },
                      { value: 'populaire', label: 'Popularité' },
                    ].map((sort) => (
                      <TouchableOpacity
                        key={sort.value}
                        onPress={() => setFilters((prev) => ({ ...prev, sortBy: sort.value }))}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: filters.sortBy === sort.value ? theme.primary : theme.surfaceSecondary,
                          borderWidth: 1,
                          borderColor: filters.sortBy === sort.value ? theme.primary : theme.borderLight,
                          marginRight: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          fontWeight: filters.sortBy === sort.value ? '600' : '500',
                          color: filters.sortBy === sort.value ? '#FFFFFF' : theme.text,
                        }}>
                          {sort.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Prix */}
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <DollarSign size={18} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                      Fourchette de prix (FCFA)
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary, marginBottom: 6 }}>
                        Minimum
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 2,
                          borderColor: filters.prixMin ? theme.primary : theme.borderLight,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          fontSize: 15,
                          color: theme.text,
                          backgroundColor: theme.background,
                        }}
                        placeholder="500"
                        placeholderTextColor={theme.textTertiary}
                        keyboardType="numeric"
                        value={filters.prixMin}
                        onChangeText={(text) => setFilters((prev) => ({ ...prev, prixMin: text }))}
                      />
                    </View>
                    <Text style={{ fontSize: 18, color: theme.textSecondary, marginTop: 20, marginHorizontal: 8 }}>—</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary, marginBottom: 6 }}>
                        Maximum
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 2,
                          borderColor: filters.prixMax ? theme.primary : theme.borderLight,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          fontSize: 15,
                          color: theme.text,
                          backgroundColor: theme.background,
                        }}
                        placeholder="10000"
                        placeholderTextColor={theme.textTertiary}
                        keyboardType="numeric"
                        value={filters.prixMax}
                        onChangeText={(text) => setFilters((prev) => ({ ...prev, prixMax: text }))}
                      />
                    </View>
                  </View>
                </View>

                {/* Note minimale */}
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Award size={18} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                      Note minimale
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    {[0, 3, 3.5, 4, 4.5].map((note, index) => (
                      <TouchableOpacity
                        key={note}
                        onPress={() => setFilters((prev) => ({ ...prev, noteMin: note }))}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: filters.noteMin === note ? theme.primary : theme.surfaceSecondary,
                          borderWidth: 1,
                          borderColor: filters.noteMin === note ? theme.primary : theme.borderLight,
                          alignItems: 'center',
                          marginRight: index < 4 ? 8 : 0,
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          fontWeight: filters.noteMin === note ? '600' : '500',
                          color: filters.noteMin === note ? '#FFFFFF' : theme.text,
                        }}>
                          {note === 0 ? 'Toutes' : `${note}+`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Horaires */}
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Clock size={18} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                      Horaires de départ
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary, marginBottom: 6 }}>
                        Après
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 2,
                          borderColor: filters.horaireDebut ? theme.primary : theme.borderLight,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          fontSize: 15,
                          color: theme.text,
                          backgroundColor: theme.background,
                        }}
                        placeholder="06:00"
                        placeholderTextColor={theme.textTertiary}
                        value={filters.horaireDebut}
                        onChangeText={(text) => setFilters((prev) => ({ ...prev, horaireDebut: text }))}
                      />
                    </View>
                    <Text style={{ fontSize: 18, color: theme.textSecondary, marginTop: 20, marginHorizontal: 8 }}>—</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary, marginBottom: 6 }}>
                        Avant
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 2,
                          borderColor: filters.horaireFin ? theme.primary : theme.borderLight,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          fontSize: 15,
                          color: theme.text,
                          backgroundColor: theme.background,
                        }}
                        placeholder="18:00"
                        placeholderTextColor={theme.textTertiary}
                        value={filters.horaireFin}
                        onChangeText={(text) => setFilters((prev) => ({ ...prev, horaireFin: text }))}
                      />
                    </View>
                  </View>
                </View>

                {/* Compagnies */}
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Bus size={18} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                      Compagnies
                    </Text>
                    {filters.compagnieIds.length > 0 && (
                      <View style={{
                        marginLeft: 8,
                        backgroundColor: theme.primary,
                        borderRadius: 10,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
                          {filters.compagnieIds.length}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {compagnies.map((compagnie) => {
                      const isSelected = filters.compagnieIds.includes(compagnie.id);
                      return (
                        <TouchableOpacity
                          key={compagnie.id}
                          onPress={() => toggleCompagnie(compagnie.id)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: isSelected ? theme.primary : theme.surfaceSecondary,
                            borderWidth: 1,
                            borderColor: isSelected ? theme.primary : theme.borderLight,
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginRight: 8,
                            marginBottom: 8,
                          }}
                        >
                          {isSelected && (
                            <Check size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          )}
                          <Text style={{
                            fontSize: 14,
                            fontWeight: isSelected ? '600' : '500',
                            color: isSelected ? '#FFFFFF' : theme.text,
                          }}>
                            {compagnie.nom}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={{
              flexDirection: 'row',
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: insets.bottom + 16,
              borderTopWidth: 1,
              borderTopColor: theme.borderLight,
              backgroundColor: theme.surface,
            }}>
              <TouchableOpacity
                onPress={() => {
                  resetFilters();
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: theme.surfaceSecondary,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.borderLight,
                  marginRight: 12,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
                  Réinitialiser
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowFilterModal(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                  Appliquer ({filteredTrajets.length})
                </Text>
              </TouchableOpacity>
            </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
