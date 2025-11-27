import { useState } from "react";
import { Star, X, CheckCircle } from "lucide-react";
import { supabase } from "../utils/supabase";

export default function ValidationLivraisonModal({
  isOpen,
  onClose,
  reservation,
  onSuccess,
}) {
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (note === 0) {
      alert("Veuillez attribuer une note au véhicule");
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

      alert(
        "Merci ! Votre avis a été enregistré avec succès. Le montant est maintenant disponible dans le portefeuille du propriétaire."
      );
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Erreur validation livraison:", error);
      alert(
        "Une erreur est survenue lors de la validation. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNote(0);
    setCommentaire("");
    onClose();
  };

  const getNoteLabel = (n) => {
    const labels = {
      1: "Très insatisfait",
      2: "Insatisfait",
      3: "Moyen",
      4: "Satisfait",
      5: "Très satisfait",
    };
    return labels[n] || "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Validation de livraison
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Info véhicule */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="font-semibold text-gray-900 text-lg mb-1">
              {reservation.vehicules_location?.marque}{" "}
              {reservation.vehicules_location?.modele}
            </p>
            <p className="text-gray-600">
              Du {new Date(reservation.date_debut).toLocaleDateString("fr-FR")}{" "}
              au {new Date(reservation.date_fin).toLocaleDateString("fr-FR")}
            </p>
          </div>

          {/* Confirmation de livraison */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Validation de la livraison <span className="text-red-500">*</span>
            </h3>
            <p className="text-gray-600 leading-relaxed">
              En validant, vous confirmez avoir reçu le véhicule et que tout
              s'est bien passé. Cette action permettra au propriétaire de
              retirer ses fonds.
            </p>
          </div>

          {/* Notation par étoiles */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Note <span className="text-red-500">*</span>
            </label>
            <div className="flex justify-center items-center gap-3 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNote(star)}
                  disabled={loading}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-12 h-12 ${
                      star <= note
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {note > 0 && (
              <p className="text-center text-gray-600 font-medium mt-2">
                {getNoteLabel(note)}
              </p>
            )}
          </div>

          {/* Commentaire */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-900 mb-2">
              Commentaire (optionnel)
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              disabled={loading}
              maxLength={500}
              rows={4}
              placeholder="Partagez votre expérience avec ce véhicule..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-500 text-right mt-1">
              {commentaire.length}/500
            </p>
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || note === 0}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition ${
                note === 0 || loading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Valider la livraison</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
