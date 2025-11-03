import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, Phone, MapPin, Building2 } from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "../../utils/supabase";

export default function CompagniesScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [compagnies, setCompagnies] = useState([]);
  const [filteredCompagnies, setFilteredCompagnies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompagnies();
  }, []);

  useEffect(() => {
    filterCompagnies();
  }, [searchQuery, compagnies]);

  const loadCompagnies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("compagnies")
        .select("id, nom, logo_url, trajets:trajets(arrivee)");
      if (error) throw error;
      const mapped = (data ?? []).map((c) => ({
        id: c.id,
        nom: c.nom,
        logo_url: c.logo_url,
        adresse: c.adresse ?? undefined,
        telephone: c.telephone ?? undefined,
        destinations: Array.from(new Set((c.trajets ?? []).map((t) => t.arrivee))).filter(Boolean),
      }));
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

  const handleCall = (telephone) => {
    Linking.openURL(`tel:${telephone}`);
  };

  const handleWhatsApp = (telephone) => {
    const cleanPhone = telephone.replace(/[^0-9]/g, "");
    const message =
      "Bonjour, je souhaite avoir des informations sur vos trajets.";
    Linking.openURL(
      `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`,
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F9FAFB",
        }}
      >
        <Text style={{ fontSize: 16, color: "#6B7280" }}>Chargement...</Text>
      </View>
    );
  }

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
            Compagnies de transport
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#6B7280",
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
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#D1D5DB",
              paddingHorizontal: 16,
              paddingVertical: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Search size={20} color="#6B7280" style={{ marginRight: 12 }} />
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: "#1F2937",
              }}
              placeholder="Rechercher une compagnie ou destination..."
              placeholderTextColor="#9CA3AF"
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
                color="#9CA3AF"
                style={{ marginBottom: 16 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#1F2937",
                  marginBottom: 8,
                }}
              >
                Aucune compagnie trouvée
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Essayez de modifier votre recherche
              </Text>
            </View>
          ) : (
            filteredCompagnies.map((compagnie) => (
              <View
                key={compagnie.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
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
                      backgroundColor: "#1E88E5",
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
                        color: "#1F2937",
                        marginBottom: 4,
                      }}
                    >
                      {compagnie.nom}
                    </Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <MapPin
                        size={14}
                        color="#6B7280"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={{ fontSize: 14, color: "#6B7280" }}>
                        {compagnie.adresse}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Destinations */}
                {compagnie.destinations &&
                  compagnie.destinations.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#1F2937",
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
                              backgroundColor: "#EBF8FF",
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
                                color: "#1E88E5",
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

                {/* Contact Actions */}
                {compagnie.telephone && (
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
                      onPress={() => handleCall(compagnie.telephone)}
                      activeOpacity={0.8}
                    >
                      <Phone
                        size={16}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#FFFFFF",
                        }}
                      >
                        Appeler
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: "#10B981",
                        borderRadius: 8,
                        paddingVertical: 12,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        marginLeft: 8,
                      }}
                      onPress={() => handleWhatsApp(compagnie.telephone)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#FFFFFF",
                          marginRight: 6,
                        }}
                      >
                        💬
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#FFFFFF",
                        }}
                      >
                        WhatsApp
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
