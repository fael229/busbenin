import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Star, X, CheckCircle } from "lucide-react-native";
import { supabase } from "../utils/supabase";
import { useTheme } from "../contexts/ThemeProvider";

export default function ValidationLivraisonModal({
  visible,
  onClose,
  reservation,
  onSuccess,
}) {
  const { theme } = useTheme();
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (note === 0) {
      Alert.alert("Erreur", "Veuillez attribuer une note au véhicule");
      return;
    }

    setLoading(true);
    try {
      // 1. Créer l'avis
      const { error: avisError } = await supabase.from("avis_location").insert({
        reservation_id: reservation.id,
        user_id: reservation.user_id,
        vehicule_id: reservation.vehicule_id,
        note: note,
        commentaire: commentaire.trim() || null,
      });

      if (avisError) throw avisError;

      // 2. Mettre à jour la réservation pour marquer la livraison comme validée
      const { error: updateError } = await supabase
        .from("reservations_location")
        .update({
          livraison_validee: true,
          livraison_validee_at: new Date().toISOString(),
        })
        .eq("id", reservation.id);

      if (updateError) throw updateError;

      Alert.alert(
        "Merci !",
        "Votre avis a été enregistré avec succès. Le montant est maintenant disponible dans le portefeuille du propriétaire.",
        [
          {
            text: "OK",
            onPress: () => {
              onSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Erreur validation livraison:", error);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de la validation. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNote(0);
    setCommentaire("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 20,
            paddingBottom: 40,
            paddingHorizontal: 20,
            maxHeight: "80%",
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CheckCircle size={24} color={theme.success} />
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: theme.text,
                  marginLeft: 10,
                }}
              >
                Validation de livraison
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <X size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Info véhicule */}
            <View
              style={{
                backgroundColor: theme.background,
                padding: 16,
                borderRadius: 12,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.text,
                  marginBottom: 4,
                }}
              >
                {reservation.vehicules_location?.marque}{" "}
                {reservation.vehicules_location?.modele}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                }}
              >
                Du{" "}
                {new Date(reservation.date_debut).toLocaleDateString("fr-FR")}{" "}
                au {new Date(reservation.date_fin).toLocaleDateString("fr-FR")}
              </Text>
            </View>

            {/* Confirmation de livraison */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.text,
                  marginBottom: 12,
                }}
              >
                Validation de la livraison{" "}
                <Text style={{ color: theme.error }}>*</Text>
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  marginBottom: 16,
                  lineHeight: 20,
                }}
              >
                En validant, vous confirmez avoir reçu le véhicule et que tout
                s'est bien passé. Cette action permettra au propriétaire de
                retirer ses fonds.
              </Text>
            </View>

            {/* Notation par étoiles */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.text,
                  marginBottom: 12,
                }}
              >
                Note <Text style={{ color: theme.error }}>*</Text>
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 12,
                }}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setNote(star)}
                    disabled={loading}
                    style={{ marginHorizontal: 8 }}
                  >
                    <Star
                      size={40}
                      color={star <= note ? "#FFC107" : theme.borderLight}
                      fill={star <= note ? "#FFC107" : "transparent"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {note > 0 && (
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 14,
                    color: theme.textSecondary,
                    marginTop: 8,
                  }}
                >
                  {note === 1 && "Très insatisfait"}
                  {note === 2 && "Insatisfait"}
                  {note === 3 && "Moyen"}
                  {note === 4 && "Satisfait"}
                  {note === 5 && "Très satisfait"}
                </Text>
              )}
            </View>

            {/* Commentaire */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                Commentaire (optionnel)
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.background,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 15,
                  color: theme.text,
                  minHeight: 100,
                  textAlignVertical: "top",
                  borderWidth: 1,
                  borderColor: theme.borderLight,
                }}
                placeholder="Partagez votre expérience avec ce véhicule..."
                placeholderTextColor={theme.textTertiary}
                value={commentaire}
                onChangeText={setCommentaire}
                multiline
                numberOfLines={4}
                maxLength={500}
                editable={!loading}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: theme.textTertiary,
                  textAlign: "right",
                  marginTop: 4,
                }}
              >
                {commentaire.length}/500
              </Text>
            </View>

            {/* Boutons */}
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || note === 0}
                style={{
                  backgroundColor:
                    note === 0 ? theme.borderLight : theme.success,
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#FFFFFF" />
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#FFFFFF",
                        marginLeft: 8,
                      }}
                    >
                      Valider la livraison
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                disabled={loading}
                style={{
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.borderLight,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: theme.textSecondary,
                  }}
                >
                  Annuler
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
