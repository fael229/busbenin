import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useSession } from "../../contexts/SessionProvider";
import { useTheme } from "../../contexts/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Car,
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Eye,
} from "lucide-react-native";
import BackButton from "../../components/BackButton";

export default function MesVehiculesScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [vehicules, setVehicules] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("vehicules"); // 'vehicules' ou 'reservations'

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
      const { data, error } = await supabase
        .from("vehicules_location")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVehicules(data || []);
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const loadReservations = async () => {
    try {
      const { data: mesVehicules } = await supabase
        .from("vehicules_location")
        .select("id")
        .eq("user_id", session.user.id);

      if (!mesVehicules || mesVehicules.length === 0) {
        setReservations([]);
        return;
      }

      const vehiculeIds = mesVehicules.map((v) => v.id);

      const { data, error } = await supabase
        .from("reservations_location")
        .select(
          `
          *,
          vehicules_location (marque, modele, prix_par_jour)
        `
        )
        .in("vehicule_id", vehiculeIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleDeleteVehicule = (id) => {
    Alert.alert(
      "Supprimer le véhicule",
      "Êtes-vous sûr de vouloir supprimer ce véhicule ?",
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

              Alert.alert("✅ Succès", "Véhicule supprimé");
              loadVehicules();
            } catch (error) {
              Alert.alert("❌ Erreur", "Impossible de supprimer");
            }
          },
        },
      ]
    );
  };

  const stats = {
    totalVehicules: vehicules.length,
    totalReservations: reservations.length,
    revenuTotal: reservations
      .filter(
        (r) => r.statut_paiement === "approved" && r.livraison_validee === true
      ) // Seulement les livraisons validées
      .reduce((sum, r) => sum + (r.montant_total || 0), 0),
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background, paddingTop: insets.top },
        ]}
      >
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <BackButton
            title="Mes Véhicules"
            fallback="/(tabs)/parametres"
            style={{ paddingHorizontal: 0, paddingVertical: 0 }}
          />
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
        <BackButton
          title="Mes Véhicules"
          fallback="/(tabs)/parametres"
          style={{ paddingHorizontal: 0, paddingVertical: 0 }}
        />
        <View style={{ width: 40 }} />
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
        {/* Statistiques */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Car size={24} color={theme.primary} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stats.totalVehicules}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Véhicules
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Calendar size={24} color={theme.success} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stats.totalReservations}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Réservations
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <DollarSign size={24} color={theme.warning} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {(stats.revenuTotal / 1000).toFixed(0)}K
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Revenue
            </Text>
          </View>
        </View>

        {/* Onglets */}
        <View
          style={[styles.tabsContainer, { backgroundColor: theme.surface }]}
        >
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

        {/* Contenu */}
        <View style={styles.contentContainer}>
          {activeTab === "vehicules" ? (
            <>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                onPress={() => router.push("/location/ajouter")}
              >
                <Plus size={20} color="#FFF" />
                <Text style={styles.addButtonText}>Ajouter un véhicule</Text>
              </TouchableOpacity>

              {vehicules.length === 0 ? (
                <View style={styles.emptyState}>
                  <Car size={48} color={theme.textTertiary} />
                  <Text
                    style={[styles.emptyText, { color: theme.textSecondary }]}
                  >
                    Aucun véhicule
                  </Text>
                </View>
              ) : (
                vehicules.map((vehicule) => (
                  <View
                    key={vehicule.id}
                    style={[
                      styles.vehiculeCard,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <View style={styles.vehiculeHeader}>
                      <Text
                        style={[styles.vehiculeName, { color: theme.text }]}
                      >
                        {vehicule.marque} {vehicule.modele}
                      </Text>
                      <Text
                        style={[styles.vehiculePrice, { color: theme.primary }]}
                      >
                        {vehicule.prix_par_jour.toLocaleString()} FCFA/j
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.vehiculeYear,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {vehicule.annee}
                    </Text>

                    <View style={styles.vehiculeActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: theme.borderLight },
                        ]}
                        onPress={() => router.push(`/location/${vehicule.id}`)}
                      >
                        <Eye size={16} color={theme.text} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: theme.primaryLight },
                        ]}
                        onPress={() =>
                          router.push(`/location/modifier/${vehicule.id}`)
                        }
                      >
                        <Edit size={16} color={theme.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: "#FEE2E2" },
                        ]}
                        onPress={() => handleDeleteVehicule(vehicule.id)}
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </>
          ) : (
            <>
              {reservations.length === 0 ? (
                <View style={styles.emptyState}>
                  <Calendar size={48} color={theme.textTertiary} />
                  <Text
                    style={[styles.emptyText, { color: theme.textSecondary }]}
                  >
                    Aucune réservation
                  </Text>
                </View>
              ) : (
                reservations.map((reservation) => (
                  <View
                    key={reservation.id}
                    style={[
                      styles.reservationCard,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <View style={styles.reservationHeader}>
                      <Text
                        style={[
                          styles.reservationVehicule,
                          { color: theme.text },
                        ]}
                      >
                        {reservation.vehicules_location?.marque}{" "}
                        {reservation.vehicules_location?.modele}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
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
                          style={[
                            styles.statusText,
                            {
                              color:
                                reservation.statut_paiement === "approved"
                                  ? "#059669"
                                  : reservation.statut_paiement === "pending"
                                    ? "#D97706"
                                    : "#DC2626",
                            },
                          ]}
                        >
                          {reservation.statut_paiement === "approved"
                            ? "Payé"
                            : reservation.statut_paiement === "pending"
                              ? "En attente"
                              : "Refusé"}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.reservationClient,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Client: {reservation.nom_locataire}
                    </Text>
                    <Text
                      style={[
                        styles.reservationClient,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Tél: {reservation.telephone_locataire}
                    </Text>
                    {reservation.livraison_validee && (
                      <Text
                        style={[
                          styles.reservationDates,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Livraison validée le{" "}
                        {new Date(
                          reservation.livraison_validee_at
                        ).toLocaleDateString("fr-FR")}
                      </Text>
                    )}
                    {!reservation.livraison_validee && (
                      <Text
                        style={[
                          styles.reservationDates,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Livraison non validée
                      </Text>
                    )}

                    <Text
                      style={[
                        styles.reservationDates,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {new Date(reservation.date_debut).toLocaleDateString(
                        "fr-FR"
                      )}{" "}
                      -{" "}
                      {new Date(reservation.date_fin).toLocaleDateString(
                        "fr-FR"
                      )}
                    </Text>
                    <Text
                      style={[
                        styles.reservationAmount,
                        { color: theme.primary },
                      ]}
                    >
                      {reservation.montant_total?.toLocaleString()} FCFA
                    </Text>
                  </View>
                ))
              )}
            </>
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
  content: { flex: 1 },
  statsRow: { flexDirection: "row", padding: 16, gap: 12 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: { fontSize: 24, fontWeight: "700", marginTop: 8 },
  statLabel: { fontSize: 12, marginTop: 4 },
  tabsContainer: {
    flexDirection: "row",
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: { flex: 1, paddingVertical: 16, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "600" },
  contentContainer: { padding: 16 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, marginTop: 16 },
  vehiculeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  vehiculeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  vehiculeName: { fontSize: 18, fontWeight: "700", flex: 1 },
  vehiculePrice: { fontSize: 16, fontWeight: "700" },
  vehiculeYear: { fontSize: 14, marginBottom: 12 },
  vehiculeActions: { flexDirection: "row", gap: 8 },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  reservationCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reservationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reservationVehicule: { fontSize: 16, fontWeight: "700", flex: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "600" },
  reservationClient: { fontSize: 14, marginBottom: 4 },
  reservationDates: { fontSize: 14, marginBottom: 8 },
  reservationAmount: { fontSize: 18, fontWeight: "700" },
});
