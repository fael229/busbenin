import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../../../utils/supabase";
import { useSession } from "../../../contexts/SessionProvider";
import { useTheme } from "../../../contexts/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Car, Upload, Image as ImageIcon, X } from "lucide-react-native";
import BackButton from "../../../components/BackButton";
import PhoneNumberModal from "../../../components/PhoneNumberModal";

export default function LocationAddScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(true);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [formData, setFormData] = useState({
    marque: "",
    modele: "",
    annee: new Date().getFullYear().toString(),
    immatriculation: "",
    prix_par_jour: "",
    description: "",
    photo_url: "",
  });

  useEffect(() => {
    checkPhoneNumber();
  }, []);

  const checkPhoneNumber = async () => {
    if (!session?.user?.id) {
      setCheckingPhone(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      if (!data?.phone || data.phone.trim() === "") {
        setHasPhone(false);
        setShowPhoneModal(true);
      } else {
        setHasPhone(true);
      }
    } catch (error) {
      console.error("Erreur vérification téléphone:", error);
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission requise",
          "Nous avons besoin de la permission d'accéder à vos photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Erreur sélection image:", error);
      Alert.alert("Erreur", "Impossible de sélectionner l'image");
    }
  };

  const uploadImage = async (image) => {
    if (!session?.user?.id) return;

    setUploadingImage(true);
    try {
      const fileExt = image.uri.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `vehicules/${fileName}`;
      
      // URL de l'API Storage de Supabase
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://aztjjcxaoqtchvvzgbpd.supabase.co";
      const uploadUrl = `${supabaseUrl}/storage/v1/object/images/${filePath}`;

      // Upload natif via FileSystem (plus robuste que fetch/blob en RN)
      const response = await FileSystem.uploadAsync(uploadUrl, image.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': image.mimeType || 'image/jpeg',
        },
      });

      if (response.status !== 200) {
        throw new Error(`Upload failed: ${response.body}`);
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, photo_url: publicUrl }));
      Alert.alert('Succès', 'Image uploadée avec succès !');
    } catch (error) {
      console.error('Erreur upload image:', error);
      Alert.alert('Erreur', 'Impossible d\'uploader l\'image. ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setFormData((prev) => ({ ...prev, photo_url: "" }));
  };

  const handleSubmit = async () => {
    if (!session) return;

    // Vérifier à nouveau le téléphone avant soumission
    if (!hasPhone) {
      Alert.alert(
        "Numéro requis",
        "Vous devez enregistrer votre numéro de téléphone avant de publier une annonce."
      );
      setShowPhoneModal(true);
      return;
    }

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

  if (checkingPhone) {
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Vérification...
          </Text>
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
              Photo du véhicule
            </Text>

            {selectedImage || formData.photo_url ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: selectedImage?.uri || formData.photo_url }}
                  style={styles.imagePreview}
                />
                <TouchableOpacity
                  style={[
                    styles.removeImageButton,
                    { backgroundColor: theme.error },
                  ]}
                  onPress={removeImage}
                >
                  <X size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.imagePickerButton,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onPress={pickImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <>
                    <Upload size={32} color={theme.textSecondary} />
                    <Text
                      style={[styles.imagePickerText, { color: theme.text }]}
                    >
                      Appuyez pour sélectionner une photo
                    </Text>
                    <Text
                      style={[
                        styles.helperText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Format: JPG, PNG (max 5MB)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
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

      <PhoneNumberModal
        visible={showPhoneModal}
        onClose={() => {
          setShowPhoneModal(false);
          router.back();
        }}
        onSuccess={() => {
          setHasPhone(true);
        }}
        userId={session?.user?.id}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  imagePickerButton: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  imagePickerText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
