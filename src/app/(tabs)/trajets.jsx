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
import { Search, MapPin, Clock, Star, Filter, Heart } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useSession } from "../../contexts/SessionProvider";

export default function TrajetsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { session } = useSession();
  const [depart, setDepart] = useState(
    typeof params.depart === "string" ? decodeURIComponent(params.depart) : ""
  );
  const [arrivee, setArrivee] = useState(
    typeof params.arrivee === "string" ? decodeURIComponent(params.arrivee) : ""
  );
  const [trajets, setTrajets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState(new Set());

  // Keep local state in sync if the route params change (e.g., user searches again)
  useEffect(() => {
    setDepart(
      typeof params.depart === "string" ? decodeURIComponent(params.depart) : ""
    );
    setArrivee(
      typeof params.arrivee === "string" ? decodeURIComponent(params.arrivee) : ""
    );
  }, [params.depart, params.arrivee]);

  useEffect(() => {
    searchTrajets();
  }, [depart, arrivee]); // Re-run search when depart or arrivee changes

  useEffect(() => {
    loadFavorites();
  }, [session?.user?.id]);

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

  const handleSearch = () => {
    searchTrajets();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "600",
              color: "#1F2937",
              marginBottom: 8,
            }}
          >
            Recherche de trajets
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#6B7280",
            }}
          >
            {trajets.length} trajet{trajets.length > 1 ? "s" : ""} trouvé
            {trajets.length > 1 ? "s" : ""}
          </Text>
        </View>

        {/* Search Filters */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <MapPin
                    size={16}
                    color="#6B7280"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: "#1F2937",
                    }}
                    placeholder="Départ"
                    placeholderTextColor="#9CA3AF"
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
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <MapPin
                    size={16}
                    color="#6B7280"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: "#1F2937",
                    }}
                    placeholder="Arrivée"
                    placeholderTextColor="#9CA3AF"
                    value={arrivee}
                    onChangeText={setArrivee}
                  />
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#1E88E5",
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  marginRight: 8,
                }}
                onPress={handleSearch}
                activeOpacity={0.8}
              >
                <Search size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  Rechercher
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.7}
              >
                <Filter size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Results */}
        <View style={{ paddingHorizontal: 20 }}>
          {loading ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 16, color: "#6B7280" }}>
                Recherche en cours...
              </Text>
            </View>
          ) : trajets.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#1F2937",
                  marginBottom: 8,
                }}
              >
                Aucun trajet trouvé
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Essayez de modifier vos critères de recherche
              </Text>
            </View>
          ) : (
            trajets.map((trajet) => (
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
                    marginBottom: 12,
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
                        color: "#1E88E5",
                        fontWeight: "500",
                        marginBottom: 4,
                      }}
                    >
                      {trajet.compagnies.nom}
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
                        {trajet.note} ({trajet.nb_avis} avis)
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <TouchableOpacity
                      onPress={() => toggleFavorite(trajet.id)}
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

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Clock size={14} color="#6B7280" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    Départs:{" "}
                    {trajet.horaires ? trajet.horaires.join(", ") : "N/A"}
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  {trajet.gare}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
