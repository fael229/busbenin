import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Clock,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Users,
  Download,
  Car,
  Star,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { useSession } from "../contexts/SessionProvider";
import { checkTransactionStatus } from "../utils/fedapay";
import {
  generateAdaptiveReceiptPDF,
  generateLocationReceiptPDF,
} from "../utils/pdfGenerator";
import ValidationLivraisonModal from "../components/ValidationLivraisonModal";

export default function Reservations() {
  const { session } = useSession();
  const [reservations, setReservations] = useState([]);
  const [locationReservations, setLocationReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null); // ID de la réservation en cours de vérification
  const [filter, setFilter] = useState("all"); // 'all', 'trajets', 'locations'

  // État pour le modal de validation
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  useEffect(() => {
    loadAllReservations();
  }, [session]);

  const loadAllReservations = async () => {
    if (!session?.user?.id) return;

    try {
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
          email_passager,
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

      // Charger les réservations de location avec livraison_validee
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
          email_locataire,
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

      setReservations(trajetsData || []);
      setLocationReservations(locationsData || []);
    } catch (error) {
      console.error("Error loading reservations:", error);
    } finally {
      setLoading(false);
    }
  };

  const verifierStatutPaiement = async (reservation, isLocation = false) => {
    const transactionId = isLocation
      ? reservation.transaction_id
      : reservation.fedapay_transaction_id;

    if (!transactionId) {
      alert("ℹ️ Aucune transaction de paiement trouvée");
      return;
    }

    try {
      setVerifying(reservation.id);
      console.log("🔍 Vérification du statut pour:", transactionId);

      const result = await checkTransactionStatus(transactionId);

      if (result.success) {
        console.log("✅ Statut récupéré:", result.status);

        // Mettre à jour le statut dans Supabase
        const tableName = isLocation ? "reservations_location" : "reservations";
        const { error: updateError } = await supabase
          .from(tableName)
          .update({
            statut_paiement: result.status,
            statut: result.status === "approved" ? "confirmee" : "en_attente",
          })
          .eq("id", reservation.id);

        if (updateError) {
          console.error("Erreur mise à jour:", updateError);
          throw updateError;
        }

        // Message en fonction du statut
        const messages = {
          approved: "✅ Paiement confirmé ! Votre réservation est validée.",
          pending: "⏳ Paiement en attente. Veuillez compléter le paiement.",
          declined: "❌ Paiement refusé. Veuillez réessayer.",
          canceled: "⚠️ Paiement annulé.",
        };

        alert(messages[result.status] || `Statut: ${result.status}`);

        // Recharger la liste
        await loadAllReservations();
      } else {
        alert("❌ Impossible de vérifier le statut du paiement");
      }
    } catch (error) {
      console.error("❌ Erreur vérification:", error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setVerifying(null);
    }
  };

  const annulerReservation = async (reservationId, isLocation = false) => {
    try {
      const tableName = isLocation ? "reservations_location" : "reservations";
      const { error } = await supabase
        .from(tableName)
        .update({ statut: "annulee" })
        .eq("id", reservationId)
        .eq("user_id", session.user.id);

      if (error) throw error;

      // Recharger les réservations
      loadAllReservations();

      alert("Réservation annulée avec succès");
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      alert("Erreur lors de l'annulation de la réservation");
    }
  };

  const downloadReceipt = async (reservation) => {
    try {
      let result;

      // Utiliser la fonction appropriée selon le type de réservation
      if (reservation.type === "location") {
        result = await generateLocationReceiptPDF(reservation);
      } else {
        result = await generateAdaptiveReceiptPDF(reservation);
      }

      if (result.success) {
        console.log("✅ PDF téléchargé:", result.fileName);
      } else {
        alert("❌ Erreur lors de la génération du PDF");
      }
    } catch (error) {
      console.error("Erreur téléchargement PDF:", error);
      alert("❌ Erreur lors du téléchargement du reçu");
    }
  };

  const getStatusBadge = (statut) => {
    const statusConfig = {
      en_attente: {
        color:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        icon: AlertCircle,
        label: "En attente",
      },
      confirmee: {
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        icon: CheckCircle,
        label: "Confirmée",
      },
      annulee: {
        color:
          "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
        icon: XCircle,
        label: "Annulée",
      },
      expiree: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        icon: XCircle,
        label: "Expirée",
      },
    };

    const config = statusConfig[statut] || statusConfig.en_attente;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}
      >
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </span>
    );
  };

  const getPaymentStatusBadge = (statut) => {
    const statusConfig = {
      pending: {
        color:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        label: "En attente",
        icon: AlertCircle,
      },
      approved: {
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        label: "Payé",
        icon: CheckCircle,
      },
      declined: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        label: "Refusé",
        icon: XCircle,
      },
      canceled: {
        color:
          "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
        label: "Annulé",
        icon: XCircle,
      },
    };

    const config = statusConfig[statut] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold ${config.color}`}
      >
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </span>
    );
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Mes réservations
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Consultez l'historique de vos réservations de trajets et de locations
        </p>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === "all"
              ? "bg-primary text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Tout ({allReservations.length})
        </button>
        <button
          onClick={() => setFilter("trajets")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
            filter === "trajets"
              ? "bg-primary text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          <MapPin className="h-4 w-4" />
          Trajets ({reservations.length})
        </button>
        <button
          onClick={() => setFilter("locations")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
            filter === "locations"
              ? "bg-primary text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          <Car className="h-4 w-4" />
          Locations ({locationReservations.length})
        </button>
      </div>

      {filteredReservations.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Calendar className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Aucune réservation
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Vous n'avez pas encore effectué de réservation
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/trajets" className="btn-primary">
              Rechercher des trajets
            </Link>
            <Link to="/location" className="btn-secondary">
              Louer un véhicule
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <div key={`${reservation.type}-${reservation.id}`} className="card">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Info principale */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {reservation.type === "trajet" ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {reservation.trajets?.depart} →{" "}
                              {reservation.trajets?.arrivee}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {reservation.trajets?.compagnies?.nom}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <Car className="h-4 w-4 text-gray-500" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {reservation.vehicules_location?.marque}{" "}
                              {reservation.vehicules_location?.modele}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {reservation.vehicules_location?.annee} • Location
                            de véhicule
                          </p>
                        </>
                      )}
                    </div>
                    {getStatusBadge(reservation.statut)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {reservation.type === "trajet" ? (
                      <>
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {reservation.date_voyage
                              ? new Date(
                                  reservation.date_voyage
                                ).toLocaleDateString("fr-FR", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Date non définie"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>{reservation.horaire || "Non défini"}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Users className="h-4 w-4" />
                          <span>
                            {reservation.nb_places} place
                            {reservation.nb_places > 1 ? "s" : ""}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(
                              reservation.date_debut
                            ).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(reservation.date_fin).toLocaleDateString(
                              "fr-FR",
                              { day: "numeric", month: "short" }
                            )}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>
                            {Math.ceil(
                              (new Date(reservation.date_fin) -
                                new Date(reservation.date_debut)) /
                                (1000 * 60 * 60 * 24)
                            ) + 1}{" "}
                            jour(s)
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      {getPaymentStatusBadge(reservation.statut_paiement)}
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {/* Bouton de validation de livraison pour les locations non validées */}
                    {reservation.type === "location" &&
                      reservation.statut_paiement === "approved" &&
                      !reservation.livraison_validee && (
                        <button
                          onClick={() => {
                            setSelectedReservation(reservation);
                            setValidationModalOpen(true);
                          }}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs font-semibold transition-colors border-2 border-orange-500"
                        >
                          <Star className="h-3 w-3" />
                          <span>Valider livraison</span>
                        </button>
                      )}

                    {/* Badge de livraison validée */}
                    {reservation.type === "location" &&
                      reservation.livraison_validee && (
                        <div className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold border border-green-500">
                          <CheckCircle className="h-3 w-3" />
                          <span>Livraison validée</span>
                        </div>
                      )}

                    {/* Bouton vérifier si paiement en attente */}
                    {reservation.statut_paiement === "pending" &&
                      (reservation.fedapay_transaction_id ||
                        reservation.transaction_id) && (
                        <button
                          onClick={() =>
                            verifierStatutPaiement(
                              reservation,
                              reservation.type === "location"
                            )
                          }
                          disabled={verifying === reservation.id}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${
                              verifying === reservation.id ? "animate-spin" : ""
                            }`}
                          />
                          <span>
                            {verifying === reservation.id
                              ? "Vérification..."
                              : "Vérifier"}
                          </span>
                        </button>
                      )}

                    {/* Bouton télécharger reçu si payé */}
                    {reservation.statut_paiement === "approved" && (
                      <button
                        onClick={() => downloadReceipt(reservation)}
                        className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-semibold transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        <span>Télécharger reçu</span>
                      </button>
                    )}

                    {/* Bouton annuler si en attente */}
                    {reservation.statut === "en_attente" && (
                      <button
                        onClick={() =>
                          annulerReservation(
                            reservation.id,
                            reservation.type === "location"
                          )
                        }
                        className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold transition-colors"
                      >
                        <XCircle className="h-3 w-3" />
                        <span>Annuler</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Prix */}
                <div className="flex flex-col items-end justify-center">
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">
                      {reservation.montant_total}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Détails passager/locataire */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <strong>
                      {reservation.type === "trajet" ? "Passager" : "Locataire"}
                      :
                    </strong>{" "}
                    {reservation.nom_passager || reservation.nom_locataire}
                  </div>
                  <div>
                    <strong>Téléphone:</strong>{" "}
                    {reservation.telephone_passager ||
                      reservation.telephone_locataire}
                  </div>
                  {(reservation.email_passager ||
                    reservation.email_locataire) && (
                    <div>
                      <strong>Email:</strong>{" "}
                      {reservation.email_passager ||
                        reservation.email_locataire}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de validation de livraison */}
      <ValidationLivraisonModal
        isOpen={validationModalOpen}
        onClose={() => {
          setValidationModalOpen(false);
          setSelectedReservation(null);
        }}
        reservation={selectedReservation}
        onSuccess={() => {
          loadAllReservations();
        }}
      />
    </div>
  );
}
