/**
 * Utilitaire pour uploader des images vers ImgBB (Version Mobile)
 * Documentation API: https://api.imgbb.com/
 */

// Clé API ImgBB (à configurer dans .env)
const IMGBB_API_KEY = process.env.EXPO_PUBLIC_IMGBB_API_KEY;

/**
 * Upload une image vers ImgBB depuis un asset ImagePicker
 * L'asset doit avoir été récupéré avec l'option base64: true
 * @param {Object} imageAsset - Asset image d'Expo ImagePicker avec base64
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImageToImgBB = async (imageAsset) => {
  try {
    if (!IMGBB_API_KEY) {
      throw new Error("Clé API ImgBB non configurée. Ajoutez EXPO_PUBLIC_IMGBB_API_KEY dans votre fichier .env");
    }

    const { base64 } = imageAsset;
    
    if (!base64) {
      throw new Error("Base64 de l'image manquant. Assurez-vous d'utiliser base64: true dans ImagePicker");
    }

    console.log("📤 Upload vers ImgBB...");

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
      console.error("❌ Réponse ImgBB:", data);
      throw new Error(data.error?.message || "Erreur lors de l'upload de l'image");
    }

    console.log("✅ Image uploadée:", data.data.url);

    return {
      success: true,
      url: data.data.url,
      displayUrl: data.data.display_url,
      deleteUrl: data.data.delete_url,
      thumbnail: data.data.thumb?.url,
    };
  } catch (error) {
    console.error("❌ Erreur upload ImgBB:", error);
    return {
      success: false,
      error: error.message || "Erreur inconnue lors de l'upload",
    };
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

