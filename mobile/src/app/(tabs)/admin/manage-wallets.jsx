import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { supabase } from "../../../utils/supabase";
import { useTheme } from "../../../contexts/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Wallet,
  Check,
  X,
  Search,
  Filter,
  User,
  Download,
  Calendar,
} from "lucide-react-native";
import BackButton from "../../../components/BackButton";
import { generateAndShareWithdrawalsReport } from "../../../utils/walletReportGenerator";

export default function ManageWalletsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("withdrawals");

  const [withdrawals, setWithdrawals] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filtres de date
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadWithdrawals(), loadWallets()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWithdrawals(), loadWallets()]);
    setRefreshing(false);
  };

  const loadWithdrawals = async () => {
    try {
      const { data: demandesData, error: demandesError } = await supabase
        .from("demandes_retrait")
        .select("*")
        .order("created_at", { ascending: false });

      if (demandesError) throw demandesError;

      if (!demandesData || demandesData.length === 0) {
        setWithdrawals([]);
        return;
      }

      const userIds = demandesData.map(d => d.user_id);
      
      // Récupérer les profils avec téléphone
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const withdrawalsWithProfiles = demandesData.map(demande => ({
        ...demande,
        profiles: profilesData?.find(p => p.id === demande.user_id) || null,
        phone: profilesData?.find(p => p.id === demande.user_id)?.phone || null
      }));

      setWithdrawals(withdrawalsWithProfiles);
    } catch (error) {
      console.error("Erreur chargement retraits:", error);
    }
  };

  const loadWallets = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (profilesError) throw profilesError;

      const { data: reservations, error: resError } = await supabase
        .from("reservations_location")
        .select(
          `
          montant_total,
          vehicules_location!inner (user_id)
        `
        )
        .eq("statut_paiement", "approved");

      if (resError) throw resError;

      const { data: withdrawalsData, error: withError } = await supabase
        .from("demandes_retrait")
        .select("user_id, montant")
        .eq("statut", "validee");

      if (withError) throw withError;

      const userBalances = {};

      profiles.forEach((p) => {
        userBalances[p.id] = {
          user: p,
          credit: 0,
          debit: 0,
          balance: 0,
          transactionCount: 0,
        };
      });

      reservations.forEach((r) => {
        const userId = r.vehicules_location?.user_id;
        if (userBalances[userId]) {
          userBalances[userId].credit += r.montant_total || 0;
          userBalances[userId].transactionCount += 1;
        }
      });

      withdrawalsData.forEach((w) => {
        if (userBalances[w.user_id]) {
          userBalances[w.user_id].debit += w.montant || 0;
          userBalances[w.user_id].transactionCount += 1;
        }
      });

      const walletsArray = Object.values(userBalances)
        .map((item) => ({
          ...item,
          balance: item.credit - item.debit,
        }))
        .filter((item) => item.transactionCount > 0)
        .sort((a, b) => b.balance - a.balance);

      setWallets(walletsArray);
    } catch (error) {
      console.error("Erreur chargement wallets:", error);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("demandes_retrait")
        .update({ statut: newStatus })
        .eq("id", id);

      if (error) throw error;

      Alert.alert(
        "Succès",
        `Demande ${newStatus === "validee" ? "validée" : "refusée"}`
      );
      loadData();
    } catch (error) {
      console.error("Erreur update status:", error);
      Alert.alert("Erreur", "Impossible de mettre à jour le statut");
    }
  };

  const confirmAction = (id, status) => {
    Alert.alert(
      status === "validee" ? "Valider le retrait" : "Refuser le retrait",
      status === "validee"
        ? "Confirmez-vous avoir effectué le virement au client ?"
        : "Voulez-vous vraiment refuser cette demande ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          style: status === "validee" ? "default" : "destructive",
          onPress: () => handleUpdateStatus(id, status),
        },
      ]
    );
  };

  const handleGenerateReport = async () => {
    try {
      let validatedWithdrawals = withdrawals.filter(
        (w) => w.statut === "validee"
      );

      if (startDate && endDate) {
        validatedWithdrawals = validatedWithdrawals.filter((w) => {
          const createdAt = new Date(w.created_at);
          return createdAt >= startDate && createdAt <= endDate;
        });
      }

      if (validatedWithdrawals.length === 0) {
        Alert.alert(
          "Aucun retrait",
          "Aucun retrait validé pour la période sélectionnée"
        );
        return;
      }

      await generateAndShareWithdrawalsReport(
        validatedWithdrawals,
        startDate,
        endDate
      );
      setShowFilterModal(false);
    } catch (error) {
      console.error("Erreur génération rapport:", error);
      Alert.alert("Erreur", "Impossible de générer le rapport");
    }
  };

  const filteredWithdrawals = withdrawals
    .filter((w) => {
      if (activeTab === "withdrawals") {
        return (
          w.statut === "en_attente" ||
          w.statut === "validee" ||
          w.statut === "refusee"
        );
      }
      return true;
    })
    .filter(
      (w) =>
        w.profiles?.full_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        w.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredWallets = wallets.filter(
    (w) =>
      w.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <BackButton
          title="Gestion Portefeuilles"
          fallback="/(tabs)/admin/dashboard"
          style={{ paddingHorizontal: 0, width: "75%" }}
        />
        <TouchableOpacity
          style={[styles.reportButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Download size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabsContainer, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "withdrawals" && {
              borderBottomColor: theme.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("withdrawals")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "withdrawals"
                    ? theme.primary
                    : theme.textSecondary,
              },
            ]}
          >
            Demandes (
            {withdrawals.filter((w) => w.statut === "en_attente").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "wallets" && {
              borderBottomColor: theme.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab("wallets")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "wallets" ? theme.primary : theme.textSecondary,
              },
            ]}
          >
            Portefeuilles ({wallets.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[styles.searchContainer, { backgroundColor: theme.surface }]}
      >
        <Search size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Rechercher un utilisateur..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
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
        {loading ? (
          <ActivityIndicator
            size="large"
            color={theme.primary}
            style={{ marginTop: 40 }}
          />
        ) : (
          <>
            {activeTab === "withdrawals" ? (
              <View style={styles.list}>
                {filteredWithdrawals.length === 0 ? (
                  <Text
                    style={[styles.emptyText, { color: theme.textSecondary }]}
                  >
                    Aucune demande trouvée
                  </Text>
                ) : (
                  filteredWithdrawals.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.card, { backgroundColor: theme.surface }]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.userInfo}>
                          <View
                            style={[
                              styles.avatar,
                              { backgroundColor: theme.primaryLight },
                            ]}
                          >
                            <User size={20} color={theme.primary} />
                          </View>
                          <View>
                            <Text
                              style={[styles.userName, { color: theme.text }]}
                            >
                              {item.profiles?.full_name ||
                                "Utilisateur inconnu"}
                            </Text>
                            <Text
                              style={[
                                styles.userEmail,
                                { color: theme.textSecondary },
                              ]}
                            >
                              {item.profiles?.email}
                            </Text>
                            {item.phone && (
                              <Text
                                style={[
                                  styles.userPhone,
                                  { color: theme.textSecondary },
                                ]}
                              >
                                📞 {item.phone}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View
                          style={[
                            styles.amountBadge,
                            { backgroundColor: theme.primaryLight + "20" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.amountText,
                              { color: theme.primary },
                            ]}
                          >
                            {item.montant?.toLocaleString()} FCFA
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardFooter}>
                        <Text
                          style={[
                            styles.dateText,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {new Date(item.created_at).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </Text>

                        {item.statut === "en_attente" ? (
                          <View style={styles.actions}>
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                { backgroundColor: "#FEE2E2" },
                              ]}
                              onPress={() => confirmAction(item.id, "refusee")}
                            >
                              <X size={20} color="#DC2626" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                { backgroundColor: "#D1FAE5" },
                              ]}
                              onPress={() => confirmAction(item.id, "validee")}
                            >
                              <Check size={20} color="#059669" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  item.statut === "validee"
                                    ? "#D1FAE5"
                                    : "#FEE2E2",
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color:
                                  item.statut === "validee"
                                    ? "#059669"
                                    : "#DC2626",
                                fontSize: 12,
                                fontWeight: "600",
                              }}
                            >
                              {item.statut === "validee" ? "Validé" : "Refusé"}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : (
              <View style={styles.list}>
                {filteredWallets.length === 0 ? (
                  <Text
                    style={[styles.emptyText, { color: theme.textSecondary }]}
                  >
                    Aucun portefeuille actif
                  </Text>
                ) : (
                  filteredWallets.map((item) => (
                    <View
                      key={item.user.id}
                      style={[styles.card, { backgroundColor: theme.surface }]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.userInfo}>
                          <View
                            style={[
                              styles.avatar,
                              { backgroundColor: theme.borderLight },
                            ]}
                          >
                            <Wallet size={20} color={theme.textSecondary} />
                          </View>
                          <View>
                            <Text
                              style={[styles.userName, { color: theme.text }]}
                            >
                              {item.user?.full_name || "Utilisateur inconnu"}
                            </Text>
                            <Text
                              style={[
                                styles.userEmail,
                                { color: theme.textSecondary },
                              ]}
                            >
                              {item.user?.email}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.walletStats,
                          { borderTopColor: theme.borderLight },
                        ]}
                      >
                        <View style={styles.statItem}>
                          <Text
                            style={[
                              styles.statLabel,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Total Gagné
                          </Text>
                          <Text
                            style={[styles.statValue, { color: theme.success }]}
                          >
                            +{item.credit.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text
                            style={[
                              styles.statLabel,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Retiré
                          </Text>
                          <Text
                            style={[styles.statValue, { color: theme.error }]}
                          >
                            -{item.debit.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text
                            style={[
                              styles.statLabel,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Solde
                          </Text>
                          <Text
                            style={[
                              styles.statValue,
                              { color: theme.primary, fontWeight: "700" },
                            ]}
                          >
                            {item.balance.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de filtre pour le rapport */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Rapport des Retraits Validés
            </Text>

            <View style={styles.dateFilters}>
              <Text
                style={[styles.filterLabel, { color: theme.textSecondary }]}
              >
                Filtrer par période (optionnel)
              </Text>

              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowStartPicker(true)}
              >
                <Calendar size={20} color={theme.textSecondary} />
                <Text style={[styles.dateButtonText, { color: theme.text }]}>
                  {startDate
                    ? startDate.toLocaleDateString("fr-FR")
                    : "Date de début"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowEndPicker(true)}
              >
                <Calendar size={20} color={theme.textSecondary} />
                <Text style={[styles.dateButtonText, { color: theme.text }]}>
                  {endDate
                    ? endDate.toLocaleDateString("fr-FR")
                    : "Date de fin"}
                </Text>
              </TouchableOpacity>

              {(startDate || endDate) && (
                <TouchableOpacity
                  style={[styles.clearButton, { borderColor: theme.error }]}
                  onPress={() => {
                    setStartDate(null);
                    setEndDate(null);
                  }}
                >
                  <Text style={{ color: theme.error }}>
                    Effacer les filtres
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: theme.background },
                ]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={{ color: theme.text }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleGenerateReport}
              >
                <Text style={{ color: "#FFF", fontWeight: "600" }}>
                  Générer le rapport
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DatePickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}
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
  reportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: { flex: 1, paddingHorizontal: 16 },
  list: { gap: 12 },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 16 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
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
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
  },
  userPhone: {
    fontSize: 11,
    marginTop: 2,
  },
  amountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  amountText: {
    fontWeight: "700",
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  walletStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  dateFilters: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 16,
  },
  clearButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  confirmButton: {},
});
