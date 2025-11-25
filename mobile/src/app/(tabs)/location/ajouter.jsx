import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../utils/supabase";
import { useSession } from "../../../contexts/SessionProvider";
import { useTheme } from "../../../contexts/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Car, ArrowLeft } from "lucide-react-native";
import BackButton from "../../../components/BackButton";

export default function LocationAddScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    marque: "",
    modele: "",
    annee: new Date().getFullYear().toString(),
    immatriculation: "",
    prix_par_jour: "",
    description: "",
    photo_url: "",
  });

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!session) return;

    if (!formData.marque || !formData.modele || !formData.prix_par_jour) {
      Alert.alert(
        "Erreur",
        "Veuillez remplir les champs obligatoires (Marque, Modèle, Prix)."
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("vehicules_location").insert([
        {
          user_id: session.user.id,
          ...formData,
          prix_par_jour: parseFloat(formData.prix_par_jour),
          annee: parseInt(formData.annee),
        },
      ]);

      if (error) throw error;

      Alert.alert("Succès", "Véhicule ajouté avec succès !", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Erreur lors de l'ajout du véhicule:", error);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de l'ajout du véhicule."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Proposer un véhicule
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.primary + "20" },
          ]}
        >
          <Car size={32} color={theme.primary} />
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Marque *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={formData.marque}
                onChangeText={(text) => handleChange("marque", text)}
                placeholder="ex: Toyota"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Modèle *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={formData.modele}
                onChangeText={(text) => handleChange("modele", text)}
                placeholder="ex: Corolla"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Année
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={formData.annee}
                onChangeText={(text) => handleChange("annee", text)}
                keyboardType="numeric"
                placeholder="2023"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Immatriculation
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={formData.immatriculation}
                onChangeText={(text) => handleChange("immatriculation", text)}
                placeholder="Optionnel"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Prix par jour (FCFA) *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={formData.prix_par_jour}
              onChangeText={(text) => handleChange("prix_par_jour", text)}
              keyboardType="numeric"
              placeholder="ex: 25000"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={formData.description}
              onChangeText={(text) => handleChange("description", text)}
              multiline
              numberOfLines={4}
              placeholder="État du véhicule, conditions particulières..."
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              URL de la photo
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={formData.photo_url}
              onChangeText={(text) => handleChange("photo_url", text)}
              placeholder="https://..."
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              Pour l'instant, veuillez héberger l'image ailleurs et coller le
              lien ici.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Ajouter le véhicule</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    padding: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 15,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
