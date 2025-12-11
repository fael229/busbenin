/**
 * Utilitaire pour uploader des images vers ImgBB (Version Mobile)
 * Documentation API: https://api.imgbb.com/
 */

// Clé API ImgBB (à configurer dans .env)
const IMGBB_API_KEY = process.env.EXPO_PUBLIC_IMGBB_API_KEY;

/**
 * Upload une image vers ImgBB depuis un URI local (Expo/React Native)
 * @param {Object} imageAsset - Asset image d'Expo ImagePicker
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImageToImgBB = async (imageAsset) => {
  try {
    if (!IMGBB_API_KEY) {
      throw new Error(
        "Clé API ImgBB non configurée. Ajoutez EXPO_PUBLIC_IMGBB_API_KEY dans votre fichier .env"
      );
    }

    const { uri, mimeType } = imageAsset;

    if (!uri) {
      throw new Error("URI de l'image manquant");
    }

    // Convertir l'image en base64
    const base64 = await uriToBase64(uri);

    // Créer le formulaire pour l'API
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64);
    formData.append("name", `vehicle_${Date.now()}`);

    // Envoyer à l'API ImgBB
    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error?.message || "Erreur lors de l'upload de l'image"
      );
    }

    return {
      success: true,
      url: data.data.url,
      displayUrl: data.data.display_url,
      deleteUrl: data.data.delete_url,
      thumbnail: data.data.thumb?.url,
    };
  } catch (error) {
    console.error("Erreur upload ImgBB:", error);
    return {
      success: false,
      error: error.message || "Erreur inconnue lors de l'upload",
    };
  }
};

/**
 * Convertit une URI d'image locale en chaîne base64
 * Compatible avec Expo/React Native
 * @param {string} uri - URI locale de l'image
 * @returns {Promise<string>}
 */
const uriToBase64 = async (uri) => {
  try {
    // Utiliser fetch pour lire le fichier en blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Convertir le blob en base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Retirer le préfixe data:image/...;base64,
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Erreur conversion base64:", error);
    throw new Error("Impossible de convertir l'image");
  }
};

/**
 * Valide une URL d'image
 * @param {string} url
 * @returns {boolean}
 */
export const isValidImageUrl = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return (
      /\.(jpg|jpeg|png|gif|webp)$/i.test(url) ||
      url.includes("imgbb.com") ||
      url.includes("ibb.co")
    );
  } catch {
    return false;
  }
};
