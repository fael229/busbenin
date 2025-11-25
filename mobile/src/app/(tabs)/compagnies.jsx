import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { Search, Building2, ChevronRight, Star } from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useTheme } from "../../contexts/ThemeProvider";

export default function CompagniesScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();
  const [searchQuery, setSearchQuery] = useState("");
  const [compagnies, setCompagnies] = useState([]);
  const [filteredCompagnies, setFilteredCompagnies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Recharge les compagnies quand l'onglet reçoit le focus
  useEffect(() => {
    if (isFocused) {
      loadCompagnies();
    }
  }, [isFocused]);

  useEffect(() => {
    filterCompagnies();
  }, [searchQuery, compagnies]);

  const loadCompagnies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("compagnies")
        .select("id, nom, logo_url, telephone, trajets:trajets(arrivee, note, nb_avis)");
      if (error) throw error;
      
      const mapped = (data ?? []).map((c) => {
        const trajets = c.trajets ?? [];
        const trajetsAvecNote = trajets.filter(t => t.nb_avis > 0);
        const noteMoyenne = trajetsAvecNote.length > 0
          ? (trajetsAvecNote.reduce((sum, t) => sum + (t.note || 0), 0) / trajetsAvecNote.length).toFixed(1)
          : 0;
        const totalAvis = trajets.reduce((sum, t) => sum + (t.nb_avis || 0), 0);
        
        return {
          id: c.id,
          nom: c.nom,
          logo_url: c.logo_url,
          telephone: c.telephone ?? undefined,
          destinations: Array.from(new Set(trajets.map((t) => t.arrivee))).filter(Boolean),
          nbTrajets: trajets.length,
          noteMoyenne,
          totalAvis,
        };
      });
      setCompagnies(mapped);
    } catch (error) {
      console.error("Error fetching compagnies:", error);
      setCompagnies([]);
    } finally {
      setLoading(false);
    }
  };

  const filterCompagnies = () => {
    if (!searchQuery.trim()) {
      setFilteredCompagnies(compagnies);
      return;
    }

    const filtered = compagnies.filter(
      (compagnie) =>
        compagnie.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (compagnie.destinations &&
          compagnie.destinations.some((dest) =>
            dest.toLowerCase().includes(searchQuery.toLowerCase()),
          )),
    );
    setFilteredCompagnies(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompagnies();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.backgroundSecondary,
        }}
      >
        <Text style={{ fontSize: 16, color: theme.textSecondary }}>Chargement...</Text>
      </View>
    );
  }

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
        {/* Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 8,
            }}
          >
            Compagnies de transport
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.textSecondary,
            }}
          >
            {filteredCompagnies.length} compagnie
            {filteredCompagnies.length > 1 ? "s" : ""} disponible
            {filteredCompagnies.length > 1 ? "s" : ""}
          </Text>
        </View>

        {/* Search Bar */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.borderLight,
              paddingHorizontal: 16,
              paddingVertical: 12,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: theme.shadowOpacity,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Search size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: theme.text,
              }}
              placeholder="Rechercher une compagnie ou destination..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Companies List */}
        <View style={{ paddingHorizontal: 20 }}>
          {filteredCompagnies.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Building2
                size={48}
                color={theme.textTertiary}
                style={{ marginBottom: 16 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                Aucune compagnie trouvée
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Essayez de modifier votre recherche
              </Text>
            </View>
          ) : (
            filteredCompagnies.map((compagnie) => (
              <TouchableOpacity
                key={compagnie.id}
                onPress={() => router.push(`/compagnie/${compagnie.id}`)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 16,
                  shadowColor: theme.shadow,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: theme.shadowOpacity,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {/* Company Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      backgroundColor: theme.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                    }}
                  >
                    <Building2 size={24} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: theme.text,
                        marginBottom: 8,
                      }}
                    >
                      {compagnie.nom}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                        {compagnie.nbTrajets} trajet{compagnie.nbTrajets > 1 ? 's' : ''}
                      </Text>
                      {compagnie.totalAvis > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Star size={12} color={theme.warning} fill={theme.warning} style={{ marginRight: 2 }} />
                          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                            {compagnie.noteMoyenne} ({compagnie.totalAvis})
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={20} color={theme.textTertiary} />
                </View>

                {/* Destinations */}
                {compagnie.destinations &&
                  compagnie.destinations.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: theme.text,
                          marginBottom: 8,
                        }}
                      >
                        Destinations desservies
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {compagnie.destinations.map((destination, index) => (
                          <View
                            key={index}
                            style={{
                              backgroundColor: theme.primaryLight,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 16,
                              marginRight: 8,
                              marginBottom: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: theme.commun,
                                fontWeight: "500",
                              }}
                            >
                              {destination}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
