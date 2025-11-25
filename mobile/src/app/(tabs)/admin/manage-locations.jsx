import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../utils/supabase";
import { useTheme } from "../../../contexts/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Car,
  Calendar,
  Trash2,
  Eye,
  Search,
  Filter,
} from "lucide-react-native";
import BackButton from "../../../components/BackButton";

export default function AdminManageLocations() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [vehicules, setVehicules] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("vehicules"); // 'vehicules' or 'reservations'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadVehicules(), loadReservations()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadVehicules = async () => {
    try {
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicules_location")
        .select("*")
        .order("created_at", { ascending: false });

      if (vehiclesError) throw vehiclesError;

      if (!vehiclesData || vehiclesData.length === 0) {
        setVehicules([]);
        return;
      }

      const userIds = [
        ...new Set(vehiclesData.map((v) => v.user_id).filter(Boolean)),
      ];

      let profilesMap = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profilesData) {
          profilesData.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      const mergedData = vehiclesData.map((v) => ({
        ...v,
        profiles: profilesMap[v.user_id] || { full_name: "Inconnu" },
      }));

      setVehicules(mergedData);
    } catch (error) {
      console.error("Error loading vehicles:", error);
      Alert.alert("Erreur", "Impossible de charger les véhicules");
    }
  };

  const loadReservations = async () => {
    try {
      const { data, error } = await supabase
        .from("reservations_location")
        .select(
          `
          *,
          vehicules_location (marque, modele)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error("Error loading reservations:", error);
      Alert.alert("Erreur", "Impossible de charger les réservations");
    }
  };

  const handleDeleteVehicule = (id) => {
    Alert.alert(
      "Supprimer le véhicule",
      "Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("vehicules_location")
                .delete()
                .eq("id", id);

              if (error) throw error;
              Alert.alert("Succès", "Véhicule supprimé");
              loadVehicules();
            } catch (error) {
              Alert.alert("Erreur", "Impossible de supprimer le véhicule");
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background, paddingTop: insets.top },
        ]}
      >
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <BackButton />
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Gestion Location
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Gestion Location
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabsContainer, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "vehicules" && {
              borderBottomColor: theme.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("vehicules")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "vehicules"
                    ? theme.primary
                    : theme.textSecondary,
              },
            ]}
          >
            Véhicules ({vehicules.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "reservations" && {
              borderBottomColor: theme.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("reservations")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "reservations"
                    ? theme.primary
                    : theme.textSecondary,
              },
            ]}
          >
            Réservations ({reservations.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
          />
        }
      >
        <View style={styles.contentContainer}>
          {activeTab === "vehicules" ? (
            vehicules.length === 0 ? (
              <View style={styles.emptyState}>
                <Car size={48} color={theme.textTertiary} />
                <Text
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  Aucun véhicule trouvé
                </Text>
              </View>
            ) : (
              vehicules.map((vehicule) => (
                <View
                  key={vehicule.id}
                  style={[styles.card, { backgroundColor: theme.surface }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>
                        {vehicule.marque} {vehicule.modele}
                      </Text>
                      <Text
                        style={[
                          styles.cardSubtitle,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Proprio: {vehicule.profiles?.full_name || "Inconnu"}
                      </Text>
                    </View>
                    <Text style={[styles.price, { color: theme.primary }]}>
                      {vehicule.prix_par_jour.toLocaleString()} F/j
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: theme.borderLight },
                      ]}
                      onPress={() => router.push(`/location/${vehicule.id}`)}
                    >
                      <Eye size={16} color={theme.text} />
                      <Text style={[styles.actionText, { color: theme.text }]}>
                        Voir
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: "#FEE2E2" },
                      ]}
                      onPress={() => handleDeleteVehicule(vehicule.id)}
                    >
                      <Trash2 size={16} color="#DC2626" />
                      <Text style={[styles.actionText, { color: "#DC2626" }]}>
                        Supprimer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          ) : reservations.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Aucune réservation trouvée
              </Text>
            </View>
          ) : (
            reservations.map((reservation) => (
              <View
                key={reservation.id}
                style={[styles.card, { backgroundColor: theme.surface }]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {reservation.vehicules_location?.marque}{" "}
                      {reservation.vehicules_location?.modele}
                    </Text>
                    <Text
                      style={[
                        styles.cardSubtitle,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Client: {reservation.nom_locataire}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          reservation.statut_paiement === "approved"
                            ? "#D1FAE5"
                            : reservation.statut_paiement === "pending"
                              ? "#FEF3C7"
                              : "#FEE2E2",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color:
                          reservation.statut_paiement === "approved"
                            ? "#059669"
                            : reservation.statut_paiement === "pending"
                              ? "#D97706"
                              : "#DC2626",
                      }}
                    >
                      {reservation.statut_paiement === "approved"
                        ? "PAYÉ"
                        : reservation.statut_paiement === "pending"
                          ? "ATTENTE"
                          : "REFUSÉ"}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 14, color: theme.text }}>
                    {new Date(reservation.date_debut).toLocaleDateString(
                      "fr-FR"
                    )}{" "}
                    -{" "}
                    {new Date(reservation.date_fin).toLocaleDateString("fr-FR")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: theme.primary,
                      marginTop: 4,
                    }}
                  >
                    {reservation.montant_total?.toLocaleString()} FCFA
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: { flex: 1, paddingVertical: 16, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "600" },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, marginTop: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  cardSubtitle: { fontSize: 12 },
  price: { fontSize: 16, fontWeight: "700" },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionText: { fontSize: 12, fontWeight: "600" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
});
