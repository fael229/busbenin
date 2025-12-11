/**
 * Utilitaire pour uploader des images vers ImgBB
 * Documentation API: https://api.imgbb.com/
 */

// Clé API ImgBB (à configurer dans .env)
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

/**
 * Upload une image vers ImgBB
 * @param {File} file - Le fichier image à uploader
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImageToImgBB = async (file) => {
  try {
    if (!IMGBB_API_KEY) {
      throw new Error(
        "Clé API ImgBB non configurée. Ajoutez VITE_IMGBB_API_KEY dans votre fichier .env"
      );
    }

    // Vérifier le type de fichier
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error(
        "Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP."
      );
    }

    // Vérifier la taille (max 32MB pour ImgBB)
    const maxSize = 32 * 1024 * 1024; // 32MB
    if (file.size > maxSize) {
      throw new Error("Le fichier est trop volumineux. Taille maximum: 32MB");
    }

    // Convertir le fichier en base64
    const base64 = await fileToBase64(file);

    // Créer le formulaire pour l'API
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64.split(",")[1]); // Retirer le préfixe data:image/...;base64,
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
 * Convertit un fichier en chaîne base64
 * @param {File} file
 * @returns {Promise<string>}
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
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
