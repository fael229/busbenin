import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { useSession } from "../contexts/SessionProvider";
import {
  Car,
  Calendar,
  ArrowLeft,
  Info,
  User,
  Phone,
  Mail,
  CreditCard,
  CheckCircle,
  Shield,
  Loader,
  AlertTriangle,
} from "lucide-react";
import {
  createTransaction,
  openPaymentUrl,
  formatAmount,
  checkTransactionStatus,
  processDirectPayment,
  pollTransactionStatus,
} from "../utils/fedapay";
import {
  checkVehiculeDisponibilite,
  getDatesReservees,
} from "../utils/vehicleAvailability";

export default function LocationReservation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();

  const [vehicule, setVehicule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [datesReservees, setDatesReservees] = useState([]);
  const [paymentProgress, setPaymentProgress] = useState("");

  const [dates, setDates] = useState({ date_debut: "", date_fin: "" });
  const [totalPrice, setTotalPrice] = useState(0);
  const [formData, setFormData] = useState({
    nom_locataire: "",
    telephone_locataire: "",
    email_locataire: session?.user?.email || "",
  });

  useEffect(() => {
    fetchVehicule();
    loadDatesReservees();
  }, [id]);

  useEffect(() => {
    if (session?.user) {
      supabase
        .from("profiles")
        .select("nom, telephone, email")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data)
            setFormData({
              nom_locataire: data.nom || "",
              telephone_locataire: data.telephone || "",
              email_locataire: data.email || session.user.email || "",
            });
        });
    }
  }, [session]);

  useEffect(() => {
    if (dates.date_debut && dates.date_fin && vehicule) {
      const start = new Date(dates.date_debut);
      const end = new Date(dates.date_fin);
      if (end >= start) {
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        setTotalPrice(diffDays * vehicule.prix_par_jour);
      } else {
        setTotalPrice(0);
      }
    }
  }, [dates, vehicule]);

  // Vérifier la disponibilité quand les dates changent
  useEffect(() => {
    if (dates.date_debut && dates.date_fin && id) {
      verifierDisponibilite();
    } else {
      setAvailabilityResult(null);
    }
  }, [dates.date_debut, dates.date_fin, id]);

  const fetchVehicule = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicules_location")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setVehicule(data);
    } catch (error) {
      console.error("Erreur:", error);
      navigate("/location");
    } finally {
      setLoading(false);
    }
  };

  const loadDatesReservees = async () => {
    const dates = await getDatesReservees(id);
    setDatesReservees(dates);
  };

  const verifierDisponibilite = async () => {
    setCheckingAvailability(true);
    try {
      const result = await checkVehiculeDisponibilite(
        id,
        dates.date_debut,
        dates.date_fin
      );
      setAvailabilityResult(result);
    } catch (error) {
      console.error("Erreur vérification:", error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!session) {
      navigate("/login");
      return;
    }

    // Validations
    if (!paymentMethod) {
      alert("⚠️ Veuillez sélectionner votre opérateur Mobile Money");
      return;
    }

    if (!formData.telephone_locataire.match(/^\+229\d{8,10}$/)) {
      alert("⚠️ Le numéro de téléphone doit être au format +229XXXXXXXX");
      return;
    }

    if (!formData.nom_locataire.trim()) {
      alert("⚠️ Veuillez entrer votre nom");
      return;
    }

    // Vérification finale de disponibilité
    setCheckingAvailability(true);
    const { available, conflictingReservations } =
      await checkVehiculeDisponibilite(id, dates.date_debut, dates.date_fin);
    setCheckingAvailability(false);

    if (!available) {
      alert(
        `❌ Véhicule indisponible\n\n` +
          `Ce véhicule est déjà réservé pour ${conflictingReservations.length} période(s) ` +
          `qui chevauche(nt) vos dates.\n\n` +
          `Veuillez choisir d'autres dates.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const { data: reservation, error } = await supabase
        .from("reservations_location")
        .insert([
          {
            vehicule_id: id,
            user_id: session.user.id,
            date_debut: dates.date_debut,
            date_fin: dates.date_fin,
            montant_total: totalPrice,
            statut: "en_attente",
            statut_paiement: "pending",
            nom_locataire: formData.nom_locataire,
            telephone_locataire: formData.telephone_locataire,
            email_locataire: formData.email_locataire,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      await handlePayment(reservation, totalPrice);
    } catch (error) {
      console.error("Erreur réservation:", error);
      alert("Une erreur est survenue lors de la création de la réservation");
      setSubmitting(false);
    }
  };

  const handlePayment = async (reservation, amount) => {
    setProcessing(true);
    setPaymentProgress('Création de la transaction...');

    try {
      console.log("🚀 Starting direct payment process...");

      const result = await createTransaction({
        amount: formatAmount(amount),
        description: `Location ${vehicule.marque} ${vehicule.modele}`,
        customerId: session.user.id,
        customerEmail: formData.email_locataire || session.user.email,
        customerName: formData.nom_locataire,
        customerPhone: formData.telephone_locataire,
        mobileMoneyOperator: paymentMethod,
      });

      if (!result.success) {
        throw new Error(
          result.error || "Erreur lors de la création de la transaction"
        );
      }

      console.log("✅ Transaction created:", result.transactionId);

      console.log("💾 Sauvegarde du transaction_id...");
      const { error: updateError } = await supabase
        .from("reservations_location")
        .update({ transaction_id: result.transactionId })
        .eq("id", reservation.id);

      if (updateError) {
        console.error("❌ Erreur update transaction_id:", updateError);
      } else {
        console.log("✅ transaction_id sauvegardé");
      }

      // Initier le paiement direct (sans popup)
      setPaymentProgress('Envoi de la demande de paiement sur votre téléphone...');
      
      const paymentResult = await processDirectPayment({
        transactionToken: result.token,
        phoneNumber: formData.telephone_locataire,
        operator: paymentMethod,
        onProgress: (message) => {
          setPaymentProgress(message);
        },
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Échec de l\'initiation du paiement');
      }

      setPaymentProgress('Paiement en cours... Veuillez valider sur votre téléphone.');

      // Vérifier le statut du paiement en boucle
      const finalResult = await pollTransactionStatus(
        result.transactionId,
        (status, transaction) => {
          console.log('📊 Statut mis à jour :', status);
          if (status === 'approved') {
            setPaymentProgress('✅ Paiement confirmé !');
          } else if (status === 'pending') {
            setPaymentProgress('⏳ En attente de votre validation...');
          }
        }
      );

      if (finalResult.success && finalResult.status === 'approved') {
        // Paiement confirmé
        await supabase
          .from("reservations_location")
          .update({
            statut_paiement: "approved",
            statut: "confirmee",
            transaction_id: result.transactionId,
          })
          .eq("id", reservation.id);
        alert("✅ Paiement confirmé !\n\nVotre location est validée.");
        navigate("/reservations");
      } else if (finalResult.status === 'timeout') {
        // Timeout
        alert(
          '⏳ Le paiement prend plus de temps que prévu.\n\n' +
          'Nous continuons de vérifier votre paiement en arrière-plan.\n\n' +
          'Vérifiez le statut dans "Mes réservations".'
        );
        navigate("/reservations");
      } else {
        // Décliné ou annulé
        alert(
          `❌ Paiement non confirmé.\n\n${finalResult.error || 'Paiement refusé'}\n\n` +
          'Vous pouvez réessayer depuis "Mes réservations".'
        );
        navigate("/reservations");
      }

    } catch (error) {
      console.error("❌ Payment error:", error);
      setPaymentProgress('');
      alert(`❌ Erreur : ${error.message}\n\nLa réservation est sauvegardée.`);
      navigate("/reservations");
    } finally {
      setProcessing(false);
      setSubmitting(false);
      setPaymentProgress('');
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (!vehicule) return null;

  const isAvailable = availabilityResult?.available !== false;
  const canSubmit =
    !submitting &&
    !processing &&
    totalPrice > 0 &&
    paymentMethod &&
    isAvailable &&
    !checkingAvailability;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Retour
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Détails Véhicule */}
        <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit md:sticky md:top-24">
          <div className="h-64 bg-gray-200 relative">
            {vehicule.photo_url ? (
              <img
                src={vehicule.photo_url}
                alt={`${vehicule.marque} ${vehicule.modele}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <Car size={64} />
              </div>
            )}
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {vehicule.marque} {vehicule.modele}
            </h2>
            <p className="text-gray-500 mb-4">{vehicule.annee}</p>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Prix par jour</span>
              <span className="text-xl font-bold text-primary">
                {vehicule.prix_par_jour.toLocaleString()} FCFA
              </span>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-600 text-sm">{vehicule.description}</p>
            </div>

            {totalPrice > 0 && (
              <div className="mt-6 bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-semibold">
                    Total estimé
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {totalPrice.toLocaleString()} FCFA
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center">
                  <Info size={14} className="mr-1" />
                  Le paiement sera effectué via FedaPay.
                </p>
              </div>
            )}

            {/* Périodes déjà réservées */}
            {datesReservees.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2 text-sm">
                  Périodes déjà réservées
                </h3>
                <div className="space-y-2">
                  {datesReservees.slice(0, 3).map((periode) => (
                    <div
                      key={periode.id}
                      className="text-xs p-2 bg-red-50 rounded border border-red-200"
                    >
                      Du{" "}
                      {new Date(periode.date_debut).toLocaleDateString("fr-FR")}{" "}
                      au{" "}
                      {new Date(periode.date_fin).toLocaleDateString("fr-FR")}
                    </div>
                  ))}
                  {datesReservees.length > 3 && (
                    <div className="text-xs text-gray-500">
                      + {datesReservees.length - 3} autre(s)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Formulaire Réservation */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Réserver ce véhicule
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar size={16} className="inline mr-1" />
                  Date de début
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={dates.date_debut}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    setDates((prev) => ({
                      ...prev,
                      date_debut: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar size={16} className="inline mr-1" />
                  Date de fin
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={dates.date_fin}
                  min={
                    dates.date_debut || new Date().toISOString().split("T")[0]
                  }
                  onChange={(e) =>
                    setDates((prev) => ({ ...prev, date_fin: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Indicateur de disponibilité */}
            {checkingAvailability && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800">
                  Vérification de la disponibilité...
                </span>
              </div>
            )}

            {availabilityResult && !checkingAvailability && (
              <div
                className={`border rounded-lg p-3 ${
                  availabilityResult.available
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {availabilityResult.available ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">
                        Véhicule disponible pour ces dates
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-red-800 block">
                          Véhicule indisponible pour ces dates
                        </span>
                        <span className="text-xs text-red-700">
                          {availabilityResult.conflictingReservations?.length}{" "}
                          réservation(s) existante(s)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Informations du locataire */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Informations du locataire
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.nom_locataire}
                    required
                    placeholder="Nom complet"
                    className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nom_locataire: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.telephone_locataire}
                      required
                      placeholder="+22997123456"
                      className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telephone_locataire: e.target.value,
                        })
                      }
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Format: +229XXXXXXXX (Mobile Money)
                  </p>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email_locataire}
                    placeholder="email@example.com"
                    className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email_locataire: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Opérateur Mobile Money */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-gray-900">
                  Opérateur Mobile Money
                </h3>
                <span className="text-red-500">*</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["mtn", "moov", "celtiis"].map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setPaymentMethod(op)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === op
                        ? op === "mtn"
                          ? "border-[#FFCC00] bg-[#FFF9E6]"
                          : op === "moov"
                          ? "border-[#009CDE] bg-[#E6F7FF]"
                          : "border-[#FF6B00] bg-[#FFF3E6]"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                          op === "mtn"
                            ? "bg-[#FFCC00]"
                            : op === "moov"
                            ? "bg-[#009CDE]"
                            : "bg-[#FF6B00]"
                        } ${
                          paymentMethod === op ? "ring-4 ring-opacity-30" : ""
                        }`}
                        style={{
                          ringColor:
                            op === "mtn"
                              ? "#FFCC00"
                              : op === "moov"
                              ? "#009CDE"
                              : "#FF6B00",
                        }}
                      >
                        <span
                          className={`font-bold ${
                            op === "mtn"
                              ? "text-black text-lg"
                              : "text-white text-base"
                          }`}
                        >
                          {op === "mtn"
                            ? "MTN"
                            : op === "moov"
                            ? "moov"
                            : "Celtiis"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-center">
                        {op === "mtn"
                          ? "MTN Mobile Money"
                          : op === "moov"
                          ? "Moov Money"
                          : "Celtiis Cash"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sécurité */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Paiement 100% sécurisé</p>
                  <p className="text-xs">
                    Vos données sont cryptées par FedaPay.
                  </p>
                </div>
              </div>
            </div>

            {/* Indicateur de progression du paiement */}
            {paymentProgress && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <Loader className="h-5 w-5 text-yellow-600 animate-spin flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">{paymentProgress}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {submitting || processing ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>
                    {paymentProgress || (processing
                      ? "Paiement en cours..."
                      : "Réservation en cours...")}
                  </span>
                </>
              ) : checkingAvailability ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  <span>Payer {totalPrice.toLocaleString()} FCFA</span>
                </>
              )}
            </button>
            <p className="text-xs text-gray-600 text-center">
              Paiement sécurisé par FedaPay (Mobile Money)
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
