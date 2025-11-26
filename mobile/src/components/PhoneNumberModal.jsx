import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Phone, X } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeProvider";
import { supabase } from "../utils/supabase";

export default function PhoneNumberModal({
  visible,
  onClose,
  onSuccess,
  userId,
}) {
  const { theme } = useTheme();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    // Validation basique
    if (!phone || phone.trim().length < 8) {
      Alert.alert(
        "Erreur",
        "Veuillez entrer un numéro de téléphone valide (min. 8 chiffres)"
      );
      return;
    }

    // Nettoyer le numéro (enlever les espaces)
    const cleanedPhone = phone.trim().replace(/\s/g, "");

    // Vérifier que c'est bien des chiffres
    if (!/^\+?[0-9]+$/.test(cleanedPhone)) {
      Alert.alert(
        "Erreur",
        "Le numéro de téléphone ne doit contenir que des chiffres"
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone: cleanedPhone })
        .eq("id", userId);

      if (error) throw error;

      Alert.alert("Succès", "Votre numéro de téléphone a été enregistré");
      setPhone("");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erreur enregistrement téléphone:", error);
      Alert.alert("Erreur", "Impossible d'enregistrer votre numéro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Numéro de téléphone obligatoire
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.primaryLight + "20" },
            ]}
          >
            <Phone size={48} color={theme.primary} />
          </View>

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Pour publier une annonce de location et recevoir vos paiements, vous
            devez enregistrer votre numéro de téléphone.
          </Text>

          <View style={[styles.inputContainer, { borderColor: theme.border }]}>
            <Phone size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Ex: +229 XX XX XX XX"
              placeholderTextColor={theme.textTertiary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!loading}
            />
          </View>

          <Text style={[styles.helperText, { color: theme.textTertiary }]}>
            Ce numéro sera utilisé pour les notifications et les retraits
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.primary },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 24,
    textAlign: "center",
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
