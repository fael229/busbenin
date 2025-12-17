import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react-native";
import { supabase } from "../../../utils/supabase";
import { checkTransactionStatus } from "../../../utils/fedapay";

export default function PaiementScreen() {
  const { transactionId, reservationId, paymentUrl, tableName } =
    useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failed', 'pending'
  const [checking, setChecking] = useState(false);

  const [hasOpened, setHasOpened] = useState(false);
  const [hasStartedPolling, setHasStartedPolling] = useState(false);

  // Ouvrir la page FedaPay dans le navigateur externe (comme sur le web)
  useEffect(() => {
    if (!paymentUrl || hasOpened) return;

    setHasOpened(true);

    Linking.openURL(paymentUrl).catch((error) => {
      console.error("Erreur ouverture FedaPay:", error);
      Alert.alert("Erreur", "Impossible d'ouvrir la page de paiement FedaPay");
    });
  }, [paymentUrl, hasOpened]);

  // Démarrer le polling automatique après l'ouverture du lien
  useEffect(() => {
    if (!hasOpened || hasStartedPolling || !transactionId) return;

    setHasStartedPolling(true);

    console.log("🚀 Démarrage du polling automatique dans 5 secondes...");

    // Attendre 5 secondes pour laisser le temps à l'utilisateur de payer
    setTimeout(() => {
      console.log("▶️ Début de la vérification automatique du paiement");
      verifierPaiement(true, 1, 10); // Active le mode auto-retry avec 10 tentatives max
    }, 5000);
  }, [hasOpened, hasStartedPolling, transactionId]);

  // Vérifier le statut de la transaction avec polling automatique
  const verifierPaiement = async (
    autoRetry = false,
    attempt = 1,
    maxAttempts = 10
  ) => {
    setChecking(true);
    try {
      console.log(
        `🔍 Tentative ${attempt}/${maxAttempts} - Vérification transaction:`,
        transactionId
      );

      const result = await checkTransactionStatus(transactionId);

      console.log("📊 Résultat FedaPay:", {
        success: result.success,
        status: result.status,
        transaction: result.transaction,
        attempt: `${attempt}/${maxAttempts}`,
      });

      if (result.success) {
        const status = result.status; // 'pending', 'approved', 'declined', 'canceled'

        // Préparer les données de mise à jour
        const updateData = {
          statut_paiement: status,
        };

        if (status === "approved") {
          updateData.statut = "confirmee";
        } else if (status === "declined" || status === "canceled") {
          updateData.statut = "annulee";
        }

        // Mettre à jour le statut dans Supabase
        console.log(
          "💾 Mise à jour table:",
          tableName || "reservations",
          "avec statut:",
          status
        );

        const { error } = await supabase
          .from(tableName || "reservations")
          .update(updateData)
          .eq("id", reservationId);

        if (error) {
          console.error("❌ Erreur mise à jour réservation:", error);
          Alert.alert("Erreur", `Erreur de mise à jour: ${error.message}`);
          setChecking(false);
          return;
        }

        // Gérer les différents statuts
        if (status === "approved") {
          console.log("✅ Paiement approuvé!");
          setPaymentStatus("success");
          setChecking(false);
          // Redirection automatique vers mes réservations
          setTimeout(() => {
            router.replace("/(tabs)/mes-reservations");
          }, 1500);
        } else if (status === "declined" || status === "canceled") {
          console.log("❌ Paiement refusé/annulé");
          setPaymentStatus("failed");
          setChecking(false);
        } else if (status === "pending") {
          console.log("⏳ Paiement toujours en attente");

          // Si on est en mode auto-retry et qu'il reste des tentatives
          if (autoRetry && attempt < maxAttempts) {
            console.log(`⏰ Nouvelle tentative dans 3 secondes...`);
            setTimeout(() => {
              verifierPaiement(true, attempt + 1, maxAttempts);
            }, 3000); // Attendre 3 secondes entre chaque tentative
          } else {
            setPaymentStatus("pending");
            setChecking(false);

            if (attempt >= maxAttempts) {
              Alert.alert(
                "Paiement en cours",
                `Le paiement est toujours en traitement après ${maxAttempts} tentatives.\n\nVeuillez vérifier à nouveau dans quelques instants depuis "Mes réservations".`,
                [{ text: "OK", onPress: retourReservations }]
              );
            }
          }
        }
      } else {
        console.error("❌ Échec de la vérification:", result.error);
        Alert.alert(
          "Erreur",
          `Impossible de vérifier: ${result.error || "Erreur inconnue"}`
        );
        setChecking(false);
      }
    } catch (error) {
      console.error("❌ Exception lors de la vérification:", error);
      Alert.alert("Erreur", `Erreur: ${error.message}`);
      setChecking(false);
    }
  };

  // Retour à la page des réservations
  const retourReservations = () => {
    router.replace("/(tabs)/mes-reservations");
  };

  // Affichage du résultat du paiement
  if (paymentStatus === "success") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <CheckCircle size={80} color="#10B981" />
          <Text style={styles.resultTitle}>Paiement réussi !</Text>
          <Text style={styles.resultMessage}>
            Votre réservation a été confirmée. Vous recevrez un SMS de
            confirmation.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={retourReservations}
          >
            <Text style={styles.buttonText}>Voir mes réservations</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (paymentStatus === "failed") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <XCircle size={80} color="#EF4444" />
          <Text style={styles.resultTitle}>Paiement échoué</Text>
          <Text style={styles.resultMessage}>
            Le paiement n'a pas pu être effectué. Veuillez réessayer ou
            contacter le support.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.errorButton]}
            onPress={retourReservations}
          >
            <Text style={styles.buttonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              "Annuler le paiement ?",
              "Êtes-vous sûr de vouloir annuler le paiement ?",
              [
                { text: "Non", style: "cancel" },
                {
                  text: "Oui",
                  onPress: retourReservations,
                  style: "destructive",
                },
              ]
            );
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement Mobile Money</Text>
        <View style={{ width: 24 }} />
      </View>
      {/* Informations sur le paiement sans redirection */}
      <View style={styles.loadingContainer}>
        <Text style={styles.resultTitle}>Paiement Mobile Money en cours</Text>
        <Text style={styles.resultMessage}>
          Une demande de paiement a été envoyée à votre opérateur Mobile Money.
          {"\n\n"}✅ Validez l'opération sur votre téléphone
          {"\n\n"}
          🔄 Le statut sera vérifié automatiquement toutes les 3 secondes
          {"\n\n"}
          Vous pouvez aussi vérifier manuellement ci-dessous.
        </Text>
        {checking && (
          <View style={{ marginTop: 20, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#1E88E5" />
            <Text style={{ marginTop: 10, color: "#6B7280", fontSize: 14 }}>
              Vérification en cours...
            </Text>
          </View>
        )}
      </View>

      {/* Bouton de vérification manuel en bas (en plus de la détection automatique) */}
      {!paymentStatus && !loading && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Paiement en cours ? Vous pouvez vérifier le statut
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.checkButton]}
            onPress={verifierPaiement}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Vérifier le paiement</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Overlay de chargement */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 24,
    marginBottom: 12,
  },
  resultMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  successButton: {
    backgroundColor: "#10B981",
  },
  errorButton: {
    backgroundColor: "#EF4444",
  },
  checkButton: {
    backgroundColor: "#1E88E5",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
