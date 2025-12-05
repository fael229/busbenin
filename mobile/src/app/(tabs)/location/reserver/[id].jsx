import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../../utils/supabase";
import { useSession } from "../../../../contexts/SessionProvider";
import { useTheme } from "../../../../contexts/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Car,
  Calendar,
  Info,
  User,
  Phone,
  Mail,
  CreditCard,
  AlertTriangle,
  CheckCircle,
} from "lucide-react-native";
import BackButton from "../../../../components/BackButton";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  createTransaction,
  getPaymentUrl,
  processDirectPayment,
  pollTransactionStatus,
} from "../../../../utils/fedapay";
import {
  checkVehiculeDisponibilite,
  getDatesReservees,
} from "../../../../utils/vehicleAvailability";

export default function LocationReservationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useSession();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [vehicule, setVehicule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [datesReservees, setDatesReservees] = useState([]);

  const [dates, setDates] = useState({
    date_debut: new Date(),
    date_fin: new Date(new Date().setDate(new Date().getDate() + 1)),
  });
  const [showPicker, setShowPicker] = useState({
    show: false,
    mode: "date",
    type: "start",
  });
  const [totalPrice, setTotalPrice] = useState(0);

  const [nomLocataire, setNomLocataire] = useState("");
  const [telephoneLocataire, setTelephoneLocataire] = useState("");
  const [emailLocataire, setEmailLocataire] = useState("");
  const [operateurMobile, setOperateurMobile] = useState("");
  const [paymentProgress, setPaymentProgress] = useState("");

  useEffect(() => {
    fetchVehicule();
    loadDatesReservees();
  }, [id]);

  useEffect(() => {
    if (session?.user) {
      supabase
        .from("profiles")
        .select("nom, telephone, email")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            if (data.nom) setNomLocataire(data.nom);
            if (data.telephone) setTelephoneLocataire(data.telephone);
            if (data.email) setEmailLocataire(data.email);
          } else if (session.user.email) {
            setEmailLocataire(session.user.email);
          }
        });
    }
  }, [session]);

  useEffect(() => {
    if (vehicule) {
      const diffTime = Math.abs(dates.date_fin - dates.date_debut);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setTotalPrice(diffDays * vehicule.prix_par_jour);
    }
  }, [dates, vehicule]);

  // Vérifier la disponibilité quand les dates changent
  useEffect(() => {
    if (dates.date_debut && dates.date_fin && id) {
      verifierDisponibilite();
    }
  }, [dates.date_debut, dates.date_fin, id]);

  const fetchVehicule = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicules_location")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setVehicule(data);
    } catch (error) {
      console.error("Erreur:", error);
      Alert.alert("Erreur", "Impossible de charger les détails du véhicule");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadDatesReservees = async () => {
    const dates = await getDatesReservees(id);
    setDatesReservees(dates);
  };

  const verifierDisponibilite = async () => {
    setCheckingAvailability(true);
    try {
      const debut = dates.date_debut.toISOString().split("T")[0];
      const fin = dates.date_fin.toISOString().split("T")[0];
      const result = await checkVehiculeDisponibilite(id, debut, fin);
      setAvailabilityResult(result);
    } catch (error) {
      console.error("Erreur vérification:", error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentType = showPicker.type;
    setShowPicker({ ...showPicker, show: Platform.OS === "ios" });
    if (selectedDate) {
      if (currentType === "start") {
        setDates((prev) => ({ ...prev, date_debut: selectedDate }));
        if (selectedDate > dates.date_fin) {
          setDates((prev) => ({
            ...prev,
            date_fin: new Date(selectedDate.getTime() + 86400000),
          }));
        }
      } else {
        setDates((prev) => ({ ...prev, date_fin: selectedDate }));
      }
    } else {
      setShowPicker({ ...showPicker, show: false });
    }
  };

  const showDatepicker = (type) => {
    setShowPicker({ show: true, mode: "date", type });
  };

  const validerFormulaire = () => {
    if (!nomLocataire.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre nom");
      return false;
    }
    if (!telephoneLocataire.match(/^\+229\d{8,10}$/)) {
      Alert.alert("Erreur", "Le numéro doit être au format +229XXXXXXXX");
      return false;
    }
    if (!operateurMobile) {
      Alert.alert(
        "Erreur",
        "Veuillez sélectionner votre opérateur Mobile Money"
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!session) {
      Alert.alert(
        "Connexion requise",
        "Veuillez vous connecter pour réserver.",
        [
          { text: "Se connecter", onPress: () => router.push("/(auth)/login") },
          { text: "Annuler", style: "cancel" },
        ]
      );
      return;
    }

    if (!validerFormulaire()) return;

    // Vérification finale de disponibilité
    setCheckingAvailability(true);
    const debut = dates.date_debut.toISOString().split("T")[0];
    const fin = dates.date_fin.toISOString().split("T")[0];
    const { available, conflictingReservations } =
      await checkVehiculeDisponibilite(id, debut, fin);
    setCheckingAvailability(false);

    if (!available) {
      Alert.alert(
        "❌ Véhicule indisponible",
        `Ce véhicule est déjà réservé pour ${conflictingReservations.length} période(s).\n\nVeuillez choisir d'autres dates.`
      );
      return;
    }

    try {
      setProcessing(true);
      setPaymentProgress("Création de la réservation...");

      const { data: reservation, error } = await supabase
        .from("reservations_location")
        .insert([
          {
            vehicule_id: id,
            user_id: session.user.id,
            date_debut: debut,
            date_fin: fin,
            montant_total: totalPrice,
            statut: "en_attente",
            nom_locataire: nomLocataire,
            telephone_locataire: telephoneLocataire,
            email_locataire: emailLocataire,
            statut_paiement: "pending",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setPaymentProgress("Création de la transaction...");

      const transactionResult = await createTransaction({
        amount: totalPrice,
        description: `Location ${vehicule.marque} ${vehicule.modele}`,
        customerEmail: emailLocataire || session.user.email,
        customerName: nomLocataire,
        customerPhone: telephoneLocataire,
        mobileMoneyOperator: operateurMobile,
        reservationId: reservation.id,
      });

      if (!transactionResult.success) {
        throw new Error(transactionResult.error);
      }

      console.log("💾 Sauvegarde transaction_id...");
      const { error: updateError } = await supabase
        .from("reservations_location")
        .update({ transaction_id: transactionResult.transactionId })
        .eq("id", reservation.id);

      if (updateError) {
        console.error("❌ Erreur update:", updateError);
      } else {
        console.log("✅ transaction_id sauvegardé");
      }

      // Initier le paiement direct (sans redirection)
      setPaymentProgress("Envoi de la demande de paiement...");

      const paymentResult = await processDirectPayment({
        transactionToken: transactionResult.token,
        phoneNumber: telephoneLocataire,
        operator: operateurMobile,
        onProgress: (message) => {
          setPaymentProgress(message);
        },
      });

      if (!paymentResult.success) {
        throw new Error(
          paymentResult.error || "Échec de l'initiation du paiement"
        );
      }

      setPaymentProgress("Veuillez valider le paiement sur votre téléphone...");

      // Vérifier le statut du paiement en boucle
      const finalResult = await pollTransactionStatus(
        transactionResult.transactionId,
        (status, transaction) => {
          console.log("📊 Statut mis à jour :", status);
          if (status === "approved") {
            setPaymentProgress("✅ Paiement confirmé !");
          } else if (status === "pending") {
            setPaymentProgress("⏳ En attente de votre validation...");
          }
        }
      );

      if (finalResult.success && finalResult.status === "approved") {
        // Paiement confirmé
        await supabase
          .from("reservations_location")
          .update({
            statut_paiement: "approved",
            statut: "confirmee",
          })
          .eq("id", reservation.id);

        Alert.alert("✅ Paiement confirmé !", "Votre location est validée.", [
          { text: "OK", onPress: () => router.push("/mes-reservations") },
        ]);
      } else if (finalResult.status === "timeout") {
        // Timeout
        Alert.alert(
          "⏳ Paiement en cours",
          "Le paiement prend plus de temps que prévu.\n\nNous continuons de vérifier votre paiement.\n\nVérifiez le statut dans 'Mes réservations'.",
          [{ text: "OK", onPress: () => router.push("/mes-reservations") }]
        );
      } else {
        // Décliné ou annulé
        Alert.alert(
          "❌ Paiement non confirmé",
          finalResult.error || "Paiement refusé",
          [{ text: "OK", onPress: () => router.push("/mes-reservations") }]
        );
      }
    } catch (error) {
      console.error("❌ Erreur:", error);
      Alert.alert("Erreur", error.message);
    } finally {
      setProcessing(false);
      setPaymentProgress("");
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!vehicule) return null;

  const isAvailable = availabilityResult?.available !== false;
  const canSubmit =
    !processing &&
    !checkingAvailability &&
    totalPrice > 0 &&
    operateurMobile &&
    isAvailable;

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
          Réserver
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Infos véhicule */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {vehicule.photo_url ? (
            <Image
              source={{ uri: vehicule.photo_url }}
              style={styles.vehicleImage}
            />
          ) : (
            <View
              style={[
                styles.vehicleImage,
                {
                  backgroundColor: theme.borderLight,
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Car size={64} color={theme.textSecondary} />
            </View>
          )}
          <Text style={[styles.vehicleName, { color: theme.text }]}>
            {vehicule.marque} {vehicule.modele}
          </Text>
          <Text style={[styles.vehicleYear, { color: theme.textSecondary }]}>
            {vehicule.annee}
          </Text>
          <View
            style={[styles.priceBox, { backgroundColor: theme.primaryLight }]}
          >
            <Text style={[styles.priceLabel, { color: theme.commun }]}>
              Prix par jour
            </Text>
            <Text style={[styles.priceValue, { color: theme.commun }]}>
              {vehicule.prix_par_jour.toLocaleString()} FCFA
            </Text>
          </View>
          {totalPrice > 0 && (
            <View
              style={[styles.totalBox, { backgroundColor: theme.successLight }]}
            >
              <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>
                Total estimé
              </Text>
              <Text style={[styles.totalValue, { color: theme.success }]}>
                {totalPrice.toLocaleString()} FCFA
              </Text>
            </View>
          )}

          {/* Périodes réservées */}
          {datesReservees.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
                Périodes déjà réservées :
              </Text>
              {datesReservees.slice(0, 3).map((periode) => (
                <View key={periode.id} style={styles.reservedPeriod}>
                  <Text style={styles.reservedPeriodText}>
                    Du{" "}
                    {new Date(periode.date_debut).toLocaleDateString("fr-FR")}{" "}
                    au {new Date(periode.date_fin).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
              ))}
              {datesReservees.length > 3 && (
                <Text
                  style={[styles.moreReserved, { color: theme.textSecondary }]}
                >
                  + {datesReservees.length - 3} autre(s)
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Dates */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Dates de location
          </Text>

          <TouchableOpacity
            style={[styles.dateButton, { borderColor: theme.border }]}
            onPress={() => showDatepicker("start")}
          >
            <Calendar size={20} color={theme.primary} />
            <Text style={[styles.dateText, { color: theme.text }]}>
              Début: {dates.date_debut.toLocaleDateString("fr-FR")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dateButton,
              { borderColor: theme.border, marginTop: 12 },
            ]}
            onPress={() => showDatepicker("end")}
          >
            <Calendar size={20} color={theme.primary} />
            <Text style={[styles.dateText, { color: theme.text }]}>
              Fin: {dates.date_fin.toLocaleDateString("fr-FR")}
            </Text>
          </TouchableOpacity>

          {showPicker.show && (
            <>
              <DateTimePicker
                value={
                  showPicker.type === "start"
                    ? dates.date_debut
                    : dates.date_fin
                }
                mode="date"
                display="default"
                minimumDate={
                  showPicker.type === "start" ? new Date() : dates.date_debut
                }
                onChange={onDateChange}
              />
              <View
                style={[
                  styles.availabilityBox,
                  isAvailable ? styles.availableBox : styles.unavailableBox,
                ]}
              >
                {isAvailable ? (
                  <>
                    <CheckCircle size={20} color="#16A34A" />
                    <Text style={styles.availableText}>
                      Véhicule disponible
                    </Text>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={20} color="#DC2626" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.unavailableText}>
                        Véhicule indisponible
                      </Text>
                      <Text style={styles.unavailableSubtext}>
                        {availabilityResult.conflictingReservations?.length}{" "}
                        réservation(s)
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </>
          )}
        </View>

        {/* Formulaire locataire */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Vos informations
          </Text>

          <View style={[styles.inputContainer, { borderColor: theme.border }]}>
            <User size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Nom complet"
              placeholderTextColor={theme.textTertiary}
              value={nomLocataire}
              onChangeText={setNomLocataire}
            />
          </View>

          <View style={[styles.inputContainer, { borderColor: theme.border }]}>
            <Phone size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="+22901xxxxxxxx"
              placeholderTextColor={theme.textTertiary}
              value={telephoneLocataire}
              onChangeText={setTelephoneLocataire}
              keyboardType="phone-pad"
            />
          </View>

          <View style={[styles.inputContainer, { borderColor: theme.border }]}>
            <Mail size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="email@example.com"
              placeholderTextColor={theme.textTertiary}
              value={emailLocataire}
              onChangeText={setEmailLocataire}
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Opérateurs */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Opérateur Mobile Money *
          </Text>

          <View style={styles.operatorsRow}>
            {["mtn", "moov", "celtiis"].map((op) => (
              <TouchableOpacity
                key={op}
                onPress={() => setOperateurMobile(op)}
                style={[
                  styles.operatorButton,
                  operateurMobile === op && styles.operatorSelected,
                  operateurMobile === op &&
                    op === "mtn" && {
                      borderColor: "#FFCC00",
                      backgroundColor: "#FFF9E6",
                    },
                  operateurMobile === op &&
                    op === "moov" && {
                      borderColor: "#009CDE",
                      backgroundColor: "#E6F7FF",
                    },
                  operateurMobile === op &&
                    op === "celtiis" && {
                      borderColor: "#FF6B00",
                      backgroundColor: "#FFF3E6",
                    },
                ]}
              >
                <View
                  style={[
                    styles.operatorIcon,
                    op === "mtn" && { backgroundColor: "#FFCC00" },
                    op === "moov" && { backgroundColor: "#FF6B00" },
                    op === "celtiis" && { backgroundColor: "#009CDE" },
                  ]}
                >
                  <Text
                    style={[
                      styles.operatorIconText,
                      op === "mtn" && { color: "#000" },
                    ]}
                  >
                    {op === "mtn" ? "MTN" : op === "moov" ? "moov" : "Celtiis"}
                  </Text>
                </View>
                <Text style={[styles.operatorName, { color: theme.text }]}>
                  {op === "mtn"
                    ? "MTN MM"
                    : op === "moov"
                      ? "Moov Money"
                      : "Celtiis Cash"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Indicateur de progression du paiement */}
        {paymentProgress ? (
          <View
            style={{
              margin: 16,
              padding: 16,
              backgroundColor: "#FFF9E6",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#FCD34D",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <ActivityIndicator color="#D97706" />
            <Text style={{ flex: 1, color: "#92400E", fontWeight: "600" }}>
              {paymentProgress}
            </Text>
          </View>
        ) : null}

        {/* Bouton payer */}
        <TouchableOpacity
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={[
            styles.submitButton,
            { backgroundColor: canSubmit ? theme.primary : theme.borderLight },
          ]}
        >
          {processing || checkingAvailability ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <CreditCard size={20} color="#FFF" />
              <Text style={styles.submitText}>
                {paymentProgress || `Payer ${totalPrice.toLocaleString()} FCFA`}
              </Text>
            </>
          )}
        </TouchableOpacity>

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
  content: { flex: 1 },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  vehicleName: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  vehicleYear: { fontSize: 16, marginBottom: 16 },
  priceBox: { padding: 16, borderRadius: 8, marginBottom: 12 },
  priceLabel: { fontSize: 14 },
  priceValue: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  totalBox: { padding: 16, borderRadius: 8 },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 24, fontWeight: "700", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  sectionSubtitle: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  reservedPeriod: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  reservedPeriodText: { fontSize: 12, color: "#991B1B" },
  moreReserved: { fontSize: 11, marginTop: 4 },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  dateText: { fontSize: 16 },
  availabilityChecking: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  availabilityCheckingText: { color: "#1E40AF", fontSize: 14 },
  availabilityBox: {
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  availableBox: {
    backgroundColor: "#FFF3E6",
    borderColor: "#86EFAC",
    borderWidth: 1,
  },
  unavailableBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
  },
  availableText: { fontSize: 14, fontWeight: "600", color: "#15803D" },
  unavailableText: { fontSize: 14, fontWeight: "600", color: "#991B1B" },
  unavailableSubtext: { fontSize: 12, color: "#B91C1C", marginTop: 2 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  input: { flex: 1, fontSize: 16 },
  operatorsRow: { flexDirection: "row", gap: 8 },
  operatorButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  operatorSelected: {},
  operatorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  operatorIconText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  operatorName: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  submitButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
