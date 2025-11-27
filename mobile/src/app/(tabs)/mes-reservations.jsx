import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Share,
  Car,
  Star,
} from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useSession } from "../../contexts/SessionProvider";
import { useTheme } from "../../contexts/ThemeProvider";
import { checkTransactionStatus } from "../../utils/fedapay";
import {
  shareReservationPDF,
  downloadReservationPDF,
  shareLocationReservationPDF,
  downloadLocationReservationPDF,
} from "../../utils/pdfGenerator";
import BackButton from "../../components/BackButton";
import ValidationLivraisonModal from "../../components/ValidationLivraisonModal";

export default function MesReservationsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();

  const [reservations, setReservations] = useState([]);
  const [locationReservations, setLocationReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingPDF, setProcessingPDF] = useState(null);
  const [filter, setFilter] = useState("all"); // 'all', 'trajets', 'locations'

  // État pour le modal de validation
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  useEffect(() => {
    if (isFocused) {
      loadAllReservations();
    }
  }, [isFocused]);

  const loadAllReservations = async () => {
    if (!session?.user?.id) {
      setReservations([]);
      setLocationReservations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Charger les réservations de trajets
      const { data: trajetsData, error: trajetsError } = await supabase
        .from("reservations")
        .select(
          `
          id,
          nb_places,
          horaire,
          date_voyage,
          montant_total,
          nom_passager,
          telephone_passager,
          statut,
          statut_paiement,
          fedapay_transaction_id,
          created_at,
          trajets:trajet_id (
            id,
            depart,
            arrivee,
            compagnies:compagnie_id (nom)
          )
        `
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (trajetsError) throw trajetsError;

      // Charger les réservations de location
      const { data: locationsData, error: locationsError } = await supabase
        .from("reservations_location")
        .select(
          `
          id,
          date_debut,
          date_fin,
          montant_total,
          nom_locataire,
          telephone_locataire,
          statut,
          statut_paiement,
          transaction_id,
          created_at,
          user_id,
          vehicule_id,
          livraison_validee,
          livraison_validee_at,
          vehicules_location (
            id,
            marque,
            modele,
            annee
          )
        `
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (locationsError) throw locationsError;

      // DIAGNOSTIC TEMPORAIRE - À SUPPRIMER APRÈS RÉSOLUTION
      console.log("=== DIAGNOSTIC RÉSERVATIONS ===");
      console.log("Réservations de trajets:", trajetsData?.length || 0);
      console.log("Réservations de location:", locationsData?.length || 0);

      if (locationsData && locationsData.length > 0) {
        console.log("\n--- Détail première réservation location ---");
        const firstLocation = locationsData[0];
        console.log("ID:", firstLocation.id);
        console.log("Statut paiement:", firstLocation.statut_paiement);
        console.log("Livraison validée:", firstLocation.livraison_validee);
        console.log(
          "Type livraison_validee:",
          typeof firstLocation.livraison_validee
        );
        console.log("Véhicule:", firstLocation.vehicules_location);

        // Vérifier si le champ existe
        const hasLivraisonValidee = "livraison_validee" in firstLocation;
        console.log("Le champ livraison_validee existe ?", hasLivraisonValidee);

        if (!hasLivraisonValidee) {
          console.error(
            "❌ PROBLÈME: Le champ livraison_validee n'existe pas!"
          );
          console.log(
            "📋 Solution: Exécutez le script ADD_SATISFACTION_SYSTEM.sql dans Supabase"
          );
        } else {
          console.log("✅ Le champ existe");
          console.log("Condition pour afficher le bouton:");
          console.log('  - type === "location" ?', true);
          console.log(
            '  - statut_paiement === "approved" ?',
            firstLocation.statut_paiement === "approved"
          );
          console.log(
            "  - !livraison_validee ?",
            !firstLocation.livraison_validee
          );
          console.log(
            "  -> Afficher le bouton ?",
            firstLocation.statut_paiement === "approved" &&
              !firstLocation.livraison_validee
          );
        }
      }
      console.log("=== FIN DIAGNOSTIC ===\n");
      // FIN DIAGNOSTIC

      setReservations(trajetsData || []);
      setLocationReservations(locationsData || []);
    } catch (error) {
      console.error("Erreur chargement réservations:", error);
      Alert.alert("Erreur", "Impossible de charger vos réservations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const verifierStatutPaiement = async (reservation, isLocation = false) => {
    const transactionId = isLocation
      ? reservation.transaction_id
      : reservation.fedapay_transaction_id;

    console.log("🔍 DEBUG - Vérification paiement:", {
      type: isLocation ? "location" : "trajet",
      reservationId: reservation.id,
      transactionId,
      hasTransactionId: !!transactionId,
      reservation: reservation,
    });

    if (!transactionId) {
      Alert.alert(
        "Information",
        `Aucune transaction de paiement trouvée pour cette ${isLocation ? "location" : "réservation"}.\n\nID réservation: ${reservation.id}`
      );
      return;
    }

    try {
      console.log("📡 Appel checkTransactionStatus avec:", transactionId);
      const result = await checkTransactionStatus(transactionId);

      console.log("📊 Résultat:", result);

      if (result.success) {
        // Mettre à jour le statut
        const tableName = isLocation ? "reservations_location" : "reservations";

        console.log("💾 Mise à jour table:", tableName);

        const { error } = await supabase
          .from(tableName)
          .update({
            statut_paiement: result.status,
            statut: result.status === "approved" ? "confirmee" : "en_attente",
          })
          .eq("id", reservation.id);

        if (error) {
          console.error("❌ Erreur mise à jour:", error);
          Alert.alert(
            "Erreur",
            `Erreur lors de la mise à jour: ${error.message}`
          );
          return;
        }

        Alert.alert(
          "Statut du paiement",
          `Statut: ${getStatutLabel(result.status)}\n\nTransaction ID: ${transactionId}`
        );
        loadAllReservations();
      } else {
        Alert.alert(
          "Erreur",
          `Impossible de vérifier le statut du paiement.\n\nErreur: ${result.error || "Inconnue"}`
        );
      }
    } catch (error) {
      console.error("❌ Erreur vérification paiement:", error);
      Alert.alert("Erreur", error.message || "Une erreur est survenue");
    }
  };

  const annulerReservation = async (reservationId, isLocation = false) => {
    Alert.alert(
      "Annuler la réservation",
      "Êtes-vous sûr de vouloir annuler cette réservation ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            try {
              const tableName = isLocation
                ? "reservations_location"
                : "reservations";
              const { error } = await supabase
                .from(tableName)
                .update({ statut: "annulee" })
                .eq("id", reservationId);

              if (error) throw error;

              Alert.alert("Succès", "Réservation annulée");
              loadAllReservations();
            } catch (error) {
              console.error("Erreur annulation:", error);
              Alert.alert("Erreur", error.message);
            }
          },
        },
      ]
    );
  };

  const handleSharePDF = async (reservation) => {
    if (reservation.statut_paiement !== "approved") {
      Alert.alert(
        "Information",
        "La facture n'est disponible que pour les paiements approuvés"
      );
      return;
    }

    setProcessingPDF(reservation.id);
    try {
      if (reservation.type === "location") {
        await shareLocationReservationPDF(reservation);
      } else {
        await shareReservationPDF(reservation);
      }
    } catch (error) {
      console.error("Erreur partage PDF:", error);
    } finally {
      setProcessingPDF(null);
    }
  };

  const handleDownloadPDF = async (reservation) => {
    if (reservation.statut_paiement !== "approved") {
      Alert.alert(
        "Information",
        "La facture n'est disponible que pour les paiements approuvés"
      );
      return;
    }

    setProcessingPDF(reservation.id);
    try {
      if (reservation.type === "location") {
        await downloadLocationReservationPDF(reservation);
      } else {
        await downloadReservationPDF(reservation);
      }
    } catch (error) {
      console.error("Erreur téléchargement PDF:", error);
    } finally {
      setProcessingPDF(null);
    }
  };

  const getStatutLabel = (statut) => {
    const labels = {
      pending: "En attente",
      approved: "Payé",
      declined: "Refusé",
      canceled: "Annulé",
      en_attente: "En attente",
      confirmee: "Confirmée",
      annulee: "Annulée",
      expiree: "Expirée",
    };
    return labels[statut] || statut;
  };

  const getStatutColor = (statut) => {
    const colors = {
      pending: theme.warning,
      approved: theme.success,
      declined: theme.error,
      canceled: theme.textSecondary,
      en_attente: theme.warning,
      confirmee: theme.success,
      annulee: theme.textSecondary,
      expiree: theme.error,
    };
    return colors[statut] || theme.textSecondary;
  };

  const getStatutIcon = (statut) => {
    switch (statut) {
      case "approved":
      case "confirmee":
        return <CheckCircle size={20} color={theme.success} />;
      case "declined":
      case "annulee":
      case "expiree":
        return <XCircle size={20} color={theme.error} />;
      default:
        return <AlertCircle size={20} color={theme.warning} />;
    }
  };

  // Combiner et trier les réservations
  const allReservations = [
    ...reservations.map((r) => ({ ...r, type: "trajet" })),
    ...locationReservations.map((r) => ({ ...r, type: "location" })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filteredReservations =
    filter === "all"
      ? allReservations
      : filter === "trajets"
        ? allReservations.filter((r) => r.type === "trajet")
        : allReservations.filter((r) => r.type === "location");

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
        <Text style={{ color: theme.textSecondary }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingBottom: 20,
          paddingHorizontal: 20,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <BackButton
          title="Mes réservations"
          fallback="/(tabs)/parametres"
          style={{ paddingHorizontal: 0, paddingVertical: 0, marginBottom: 8 }}
        />
        <Text
          style={{ marginTop: 4, fontSize: 14, color: theme.textSecondary }}
        >
          {allReservations.length} réservation
          {allReservations.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Filtres */}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: theme.surface,
        }}
      >
        <TouchableOpacity
          onPress={() => setFilter("all")}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor:
              filter === "all" ? theme.primary : theme.background,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: filter === "all" ? "#FFF" : theme.text,
            }}
          >
            Tout ({allReservations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("trajets")}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor:
              filter === "trajets" ? theme.primary : theme.background,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <MapPin
            size={16}
            color={filter === "trajets" ? "#FFF" : theme.text}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: filter === "trajets" ? "#FFF" : theme.text,
            }}
          >
            Trajets ({reservations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("locations")}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor:
              filter === "locations" ? theme.primary : theme.background,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Car size={16} color={filter === "locations" ? "#FFF" : theme.text} />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: filter === "locations" ? "#FFF" : theme.text,
            }}
          >
            Locations ({locationReservations.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAllReservations();
            }}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {filteredReservations.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Calendar size={48} color={theme.borderLight} />
            <Text
              style={{
                marginTop: 16,
                fontSize: 16,
                fontWeight: "600",
                color: theme.textSecondary,
              }}
            >
              Aucune réservation
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                color: theme.textTertiary,
                textAlign: "center",
              }}
            >
              Vos réservations apparaîtront ici
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/trajets")}
                style={{
                  backgroundColor: theme.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Rechercher un trajet
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/location")}
                style={{
                  backgroundColor: theme.surface,
                  borderWidth: 2,
                  borderColor: theme.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: theme.primary, fontWeight: "600" }}>
                  Louer un véhicule
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          filteredReservations.map((reservation) => (
            <View
              key={`${reservation.type}-${reservation.id}`}
              style={{
                backgroundColor: theme.surface,
                marginHorizontal: 20,
                marginTop: 12,
                borderRadius: 12,
                padding: 16,
                shadowColor: theme.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: theme.shadowOpacity,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                {reservation.type === "trajet" ? (
                  <MapPin size={18} color={theme.primary} />
                ) : (
                  <Car size={18} color={theme.primary} />
                )}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: theme.text,
                    marginLeft: 8,
                    flex: 1,
                  }}
                >
                  {reservation.type === "trajet"
                    ? `${reservation.trajets?.depart} → ${reservation.trajets?.arrivee}`
                    : `${reservation.vehicules_location?.marque} ${reservation.vehicules_location?.modele}`}
                </Text>
                {getStatutIcon(reservation.statut_paiement)}
              </View>

              {/* Compagnie / Année */}
              <Text
                style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  marginBottom: 8,
                }}
              >
                {reservation.type === "trajet"
                  ? reservation.trajets?.compagnies?.nom
                  : `${reservation.vehicules_location?.annee} • Location de véhicule`}
              </Text>

              {/* Détails */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                {reservation.type === "trajet" ? (
                  <>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Users size={14} color={theme.textSecondary} />
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.textSecondary,
                          marginLeft: 4,
                        }}
                      >
                        {reservation.nb_places} place
                        {reservation.nb_places > 1 ? "s" : ""}
                      </Text>
                    </View>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Clock size={14} color={theme.textSecondary} />
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.textSecondary,
                          marginLeft: 4,
                        }}
                      >
                        {reservation.horaire}
                      </Text>
                    </View>
                    {reservation.date_voyage && (
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Calendar size={14} color={theme.textSecondary} />
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.textSecondary,
                            marginLeft: 4,
                          }}
                        >
                          {new Date(reservation.date_voyage).toLocaleDateString(
                            "fr-FR"
                          )}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Calendar size={14} color={theme.textSecondary} />
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.textSecondary,
                          marginLeft: 4,
                        }}
                      >
                        Du{" "}
                        {new Date(reservation.date_debut).toLocaleDateString(
                          "fr-FR",
                          { day: "numeric", month: "short" }
                        )}
                      </Text>
                    </View>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Calendar size={14} color={theme.textSecondary} />
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.textSecondary,
                          marginLeft: 4,
                        }}
                      >
                        Au{" "}
                        {new Date(reservation.date_fin).toLocaleDateString(
                          "fr-FR",
                          { day: "numeric", month: "short" }
                        )}
                      </Text>
                    </View>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Clock size={14} color={theme.textSecondary} />
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.textSecondary,
                          marginLeft: 4,
                        }}
                      >
                        {Math.ceil(
                          (new Date(reservation.date_fin) -
                            new Date(reservation.date_debut)) /
                            (1000 * 60 * 60 * 24)
                        ) + 1}{" "}
                        jour(s)
                      </Text>
                    </View>
                  </>
                )}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <DollarSign size={14} color={theme.success} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: theme.success,
                      marginLeft: 2,
                    }}
                  >
                    {reservation.montant_total} FCFA
                  </Text>
                </View>
              </View>

              {/* Statuts */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <View
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    backgroundColor: `${getStatutColor(reservation.statut)}20`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: getStatutColor(reservation.statut),
                    }}
                  >
                    {getStatutLabel(reservation.statut)}
                  </Text>
                </View>
                <View
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    backgroundColor: `${getStatutColor(reservation.statut_paiement)}20`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: getStatutColor(reservation.statut_paiement),
                    }}
                  >
                    {getStatutLabel(reservation.statut_paiement)}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {reservation.statut_paiement === "pending" && (
                  <TouchableOpacity
                    onPress={() =>
                      verifierStatutPaiement(
                        reservation,
                        reservation.type === "location"
                      )
                    }
                    style={{
                      flex: 1,
                      minWidth: 120,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.primaryLight,
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    <RefreshCw size={16} color={theme.primary} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: theme.primary,
                        marginLeft: 6,
                      }}
                    >
                      Vérifier
                    </Text>
                  </TouchableOpacity>
                )}

                {reservation.statut_paiement === "approved" && (
                  <>
                    {/* Bouton de validation de livraison pour les locations non validées */}
                    {reservation.type === "location" &&
                      !reservation.livraison_validee && (
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedReservation(reservation);
                            setValidationModalVisible(true);
                          }}
                          style={{
                            flex: 1,
                            minWidth: 120,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#FFF4E5",
                            padding: 10,
                            borderRadius: 8,
                            borderWidth: 2,
                            borderColor: "#FFA500",
                          }}
                        >
                          <Star size={16} color="#FFA500" />
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: "#FFA500",
                              marginLeft: 6,
                            }}
                          >
                            Valider livraison
                          </Text>
                        </TouchableOpacity>
                      )}

                    {/* Badge de livraison validée */}
                    {reservation.type === "location" &&
                      reservation.livraison_validee && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "#E8F5E9",
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: "#4CAF50",
                          }}
                        >
                          <CheckCircle size={14} color="#4CAF50" />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: "#4CAF50",
                              marginLeft: 4,
                            }}
                          >
                            Livraison validée
                          </Text>
                        </View>
                      )}

                    <TouchableOpacity
                      onPress={() => handleSharePDF(reservation)}
                      disabled={processingPDF === reservation.id}
                      style={{
                        flex: 1,
                        minWidth: 120,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme.successLight,
                        padding: 10,
                        borderRadius: 8,
                        opacity: processingPDF === reservation.id ? 0.5 : 1,
                      }}
                    >
                      <Share size={16} color={theme.success} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: theme.success,
                          marginLeft: 6,
                        }}
                      >
                        {processingPDF === reservation.id
                          ? "Génération..."
                          : "Partager PDF"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDownloadPDF(reservation)}
                      disabled={processingPDF === reservation.id}
                      style={{
                        flex: 1,
                        minWidth: 120,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme.primaryLight,
                        padding: 10,
                        borderRadius: 8,
                        opacity: processingPDF === reservation.id ? 0.5 : 1,
                      }}
                    >
                      <Download size={16} color={theme.primary} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: theme.primary,
                          marginLeft: 6,
                        }}
                      >
                        {processingPDF === reservation.id
                          ? "Sauvegarde..."
                          : "Télécharger"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {reservation.statut === "en_attente" && (
                  <TouchableOpacity
                    onPress={() =>
                      annulerReservation(
                        reservation.id,
                        reservation.type === "location"
                      )
                    }
                    style={{
                      flex: 1,
                      minWidth: 120,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.errorLight,
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    <XCircle size={16} color={theme.error} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: theme.error,
                        marginLeft: 6,
                      }}
                    >
                      Annuler
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de validation de livraison */}
      {selectedReservation && (
        <ValidationLivraisonModal
          visible={validationModalVisible}
          onClose={() => {
            setValidationModalVisible(false);
            setSelectedReservation(null);
          }}
          reservation={selectedReservation}
          onSuccess={() => {
            loadAllReservations();
          }}
        />
      )}
    </View>
  );
}
