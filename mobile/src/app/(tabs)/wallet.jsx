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
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useSession } from "../../contexts/SessionProvider";
import { useTheme } from "../../contexts/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  AlertCircle,
  X,
  Check,
  Clock,
} from "lucide-react-native";
import BackButton from "../../components/BackButton";

export default function WalletScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await calculateBalanceAndTransactions();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await calculateBalanceAndTransactions();
    setRefreshing(false);
  };

  const calculateBalanceAndTransactions = async () => {
    try {
      if (!session?.user?.id) return;

      // 1. Récupérer les revenus des locations (Crédits)
      // On cherche d'abord les véhicules de l'utilisateur
      const { data: mesVehicules } = await supabase
        .from("vehicules_location")
        .select("id")
        .eq("user_id", session.user.id);

      let rentalIncome = [];
      if (mesVehicules && mesVehicules.length > 0) {
        const vehiculeIds = mesVehicules.map((v) => v.id);
        const { data: reservations } = await supabase
          .from("reservations_location")
          .select(
            "id, created_at, montant_total, statut_paiement, vehicules_location(marque, modele)"
          )
          .in("vehicule_id", vehiculeIds)
          .eq("statut_paiement", "approved")
          .order("created_at", { ascending: false });

        if (reservations) {
          rentalIncome = reservations.map((r) => ({
            id: r.id,
            type: "credit",
            amount: r.montant_total,
            date: r.created_at,
            status: "completed",
            description: `Location: ${r.vehicules_location?.marque} ${r.vehicules_location?.modele}`,
          }));
        }
      }

      // 2. Récupérer les demandes de retrait (Débits)
      // Note: Cette table doit être créée : demandes_retrait (id, user_id, montant, statut, created_at)
      const { data: withdrawals, error: withdrawalError } = await supabase
        .from("demandes_retrait")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      let withdrawalList = [];
      if (withdrawals) {
        withdrawalList = withdrawals.map((w) => ({
          id: w.id,
          type: "debit",
          amount: w.montant,
          date: w.created_at,
          status:
            w.statut === "validee"
              ? "completed"
              : w.statut === "refusee"
                ? "failed"
                : "pending",
          description: "Demande de retrait",
        }));
      } else if (withdrawalError && withdrawalError.code !== "PGRST116") {
        // Ignorer l'erreur si la table n'existe pas encore, pour le dev
        console.log(
          "Table demandes_retrait peut-être manquante",
          withdrawalError
        );
      }

      // 3. Calculer le solde
      const totalIncome = rentalIncome.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      const totalWithdrawn = withdrawalList
        .filter((w) => w.status === "completed" || w.status === "pending") // On déduit aussi les pending ? L'user dit "admin examinera et soustraire du solde en cas de validation".
        // Donc on ne soustrait QUE si validé pour le solde affiché ?
        // Mais pour le "solde disponible", on devrait peut-être soustraire les pending pour éviter double retrait.
        // L'user dit: "soustraire du solde en cas de validation".
        // Donc le solde affiché inclut encore les montants en attente de retrait.
        .filter((w) => w.status === "completed")
        .reduce((sum, item) => sum + item.amount, 0);

      setBalance(totalIncome - totalWithdrawn);

      // 4. Fusionner et trier les transactions
      const allTransactions = [...rentalIncome, ...withdrawalList].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setTransactions(allTransactions);
    } catch (error) {
      console.error("Erreur chargement wallet:", error);
      Alert.alert(
        "Erreur",
        "Impossible de charger les données du portefeuille"
      );
    }
  };

  const handleRequestWithdrawal = async () => {
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount < 50000) {
      Alert.alert(
        "Montant invalide",
        "Le montant minimum de retrait est de 50 000 FCFA"
      );
      return;
    }

    if (amount > balance) {
      Alert.alert(
        "Solde insuffisant",
        "Vous ne pouvez pas retirer plus que votre solde disponible."
      );
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("demandes_retrait").insert({
        user_id: session.user.id,
        montant: amount,
        statut: "en_attente",
      });

      if (error) throw error;

      Alert.alert("Succès", "Votre demande de retrait a été envoyée.");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      loadData();
    } catch (error) {
      console.error("Erreur demande retrait:", error);
      Alert.alert(
        "Erreur",
        "Impossible d'envoyer la demande. Vérifiez votre connexion."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return theme.success;
      case "pending":
        return theme.warning;
      case "failed":
        return theme.error;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "completed":
        return "Validé";
      case "pending":
        return "En attente";
      case "failed":
        return "Refusé";
      default:
        return status;
    }
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
          <BackButton title="Mon Portefeuille" fallback="/(tabs)/parametres" />
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
          title="Mon Portefeuille"
          fallback="/(tabs)/parametres"
          style={{ paddingHorizontal: 0 }}
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
        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceValue}>
            {balance.toLocaleString()} FCFA
          </Text>
          <View style={styles.balanceFooter}>
            <View style={styles.balanceInfo}>
              <Wallet size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.balanceInfoText}>Portefeuille Location</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surface }]}
            onPress={() => setShowWithdrawModal(true)}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.primaryLight },
              ]}
            >
              <ArrowUpRight size={24} color={theme.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: theme.text }]}>
              Retrait
            </Text>
            <Text
              style={[styles.actionSubLabel, { color: theme.textSecondary }]}
            >
              Min. 50 000
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.actionButton,
              { backgroundColor: theme.surface, opacity: 0.7 },
            ]}
          >
            {/* Placeholder for future features like "Add Bank Account" or "History" filter */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.borderLight },
              ]}
            >
              <History size={24} color={theme.textSecondary} />
            </View>
            <Text style={[styles.actionLabel, { color: theme.text }]}>
              Historique
            </Text>
            <Text
              style={[styles.actionSubLabel, { color: theme.textSecondary }]}
            >
              Complet
            </Text>
          </View>
        </View>

        {/* Transactions History */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Transactions récentes
          </Text>
        </View>

        <View style={styles.transactionsList}>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <History size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Aucune transaction
              </Text>
            </View>
          ) : (
            transactions.map((t) => (
              <View
                key={`${t.type}-${t.id}`}
                style={[
                  styles.transactionItem,
                  { backgroundColor: theme.surface },
                ]}
              >
                <View
                  style={[
                    styles.transactionIcon,
                    {
                      backgroundColor:
                        t.type === "credit" ? "#D1FAE5" : "#FEE2E2",
                    },
                  ]}
                >
                  {t.type === "credit" ? (
                    <ArrowDownLeft size={20} color="#059669" />
                  ) : (
                    <ArrowUpRight size={20} color="#DC2626" />
                  )}
                </View>

                <View style={styles.transactionDetails}>
                  <Text
                    style={[styles.transactionTitle, { color: theme.text }]}
                  >
                    {t.description}
                  </Text>
                  <Text
                    style={[
                      styles.transactionDate,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {new Date(t.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>

                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color: t.type === "credit" ? theme.success : theme.text,
                      },
                    ]}
                  >
                    {t.type === "credit" ? "+" : "-"}
                    {t.amount.toLocaleString()}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(t.status) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(t.status) },
                      ]}
                    >
                      {getStatusLabel(t.status)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Demander un retrait
              </Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Montant à retirer (FCFA)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
                placeholder="Ex: 50000"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />
              <Text style={[styles.helperText, { color: theme.textTertiary }]}>
                Minimum: 50 000 FCFA. Solde: {balance.toLocaleString()} FCFA
              </Text>

              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: theme.primaryLight + "20" },
                ]}
              >
                <AlertCircle size={20} color={theme.primary} />
                <Text style={[styles.infoText, { color: theme.text }]}>
                  Votre demande sera examinée par un administrateur. Une fois
                  validée, le transfert sera effectué manuellement.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: theme.primary,
                  opacity: submitting ? 0.7 : 1,
                },
              ]}
              onPress={handleRequestWithdrawal}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Confirmer la demande
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { flex: 1, padding: 16 },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 16,
  },
  balanceFooter: { flexDirection: "row", alignItems: "center" },
  balanceInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  balanceInfoText: { color: "rgba(255,255,255,0.8)", fontSize: 12 },

  actionsContainer: { flexDirection: "row", gap: 12, marginBottom: 24 },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionLabel: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  actionSubLabel: { fontSize: 12 },

  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  transactionsList: { gap: 12 },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionDetails: { flex: 1 },
  transactionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  transactionDate: { fontSize: 12 },
  transactionRight: { alignItems: "flex-end" },
  transactionAmount: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "600" },

  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, marginTop: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalBody: { marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  helperText: { fontSize: 12, marginBottom: 24 },
  infoBox: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  submitButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
