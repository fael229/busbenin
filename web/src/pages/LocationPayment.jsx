import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CreditCard,
  Smartphone,
  CheckCircle,
  XCircle,
  Loader,
  Shield,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { useSession } from "../contexts/SessionProvider";
import {
  createTransaction,
  openPaymentUrl,
  formatAmount,
  checkTransactionStatus,
} from "../utils/fedapay";

export default function LocationPayment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");

  useEffect(() => {
    loadReservation();
  }, [id]);

  const loadReservation = async () => {
    try {
      const { data, error } = await supabase
        .from("reservations_location")
        .select("*, vehicules_location(*)")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data.statut === "confirmee") {
        setPaymentStatus("success");
      }

      setReservation(data);
    } catch (error) {
      console.error("Error loading reservation:", error);
      navigate("/location");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    setPaymentStatus(null);

    try {
      const amount = formatAmount(reservation.montant_total);

      // Créer la transaction FedaPay
      const result = await createTransaction({
        amount: amount,
        description: `Location ${reservation.vehicules_location.marque} ${reservation.vehicules_location.modele}`,
        customerId: session.user.id,
        customerEmail: session.user.email,
        customerName: session.user.user_metadata?.full_name || "Client",
        mobileMoneyOperator:
          paymentMethod === "mobile_money" ? "mtn" : undefined,
      });

      if (!result.success) {
        throw new Error(
          result.error || "Erreur lors de la création de la transaction"
        );
      }

      // Sauvegarder l'ID de transaction
      await supabase
        .from("reservations_location")
        .update({
          transaction_id: result.transactionId,
        })
        .eq("id", id);

      // Ouvrir le lien de paiement
      openPaymentUrl(result.paymentUrl, true);

      alert(
        "💳 Une fenêtre de paiement s'est ouverte.\n\nAprès avoir payé, revenez sur cette page."
      );

      // Vérifier le statut
      setTimeout(async () => {
        const statusCheck = await checkTransactionStatus(result.transactionId);

        if (statusCheck.success && statusCheck.status === "approved") {
          await updateReservationStatus("confirmee", result.transactionId);
          setPaymentStatus("success");

          setTimeout(() => {
            navigate("/location");
          }, 3000);
        } else {
          setPaymentStatus("error");
          alert(
            "⏳ Paiement en attente ou échoué. Vérifiez votre transaction."
          );
        }

        setProcessing(false);
      }, 3000);
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentStatus("error");
      alert(`❌ Erreur : ${error.message}`);
      setProcessing(false);
    }
  };

  const updateReservationStatus = async (status, transactionId) => {
    try {
      await supabase
        .from("reservations_location")
        .update({
          statut: status,
          transaction_id: transactionId,
        })
        .eq("id", id);
    } catch (error) {
      console.error("Error updating reservation:", error);
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (!reservation) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Paiement de la location
        </h1>
        <p className="text-gray-600">
          Finalisez votre réservation pour{" "}
          {reservation.vehicules_location.marque}{" "}
          {reservation.vehicules_location.modele}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {paymentStatus === "success" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-4">
              <CheckCircle className="text-green-600 h-8 w-8" />
              <div>
                <h3 className="font-bold text-green-800">Paiement réussi !</h3>
                <p className="text-green-700 text-sm">
                  Votre location est confirmée.
                </p>
              </div>
            </div>
          )}

          {paymentStatus === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-4">
              <XCircle className="text-red-600 h-8 w-8" />
              <div>
                <h3 className="font-bold text-red-800">Échec du paiement</h3>
                <p className="text-red-700 text-sm">Veuillez réessayer.</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold mb-4">Méthode de paiement</h2>
            <div className="space-y-3">
              <button
                onClick={() => setPaymentMethod("mobile_money")}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  paymentMethod === "mobile_money"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-primary"
                }`}
              >
                <Smartphone className="text-primary" />
                <div className="text-left flex-1">
                  <p className="font-semibold">Mobile Money</p>
                  <p className="text-sm text-gray-500">MTN, Moov</p>
                </div>
                {paymentMethod === "mobile_money" && (
                  <CheckCircle className="text-primary h-5 w-5" />
                )}
              </button>

              <button
                onClick={() => setPaymentMethod("card")}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  paymentMethod === "card"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-primary"
                }`}
              >
                <CreditCard className="text-primary" />
                <div className="text-left flex-1">
                  <p className="font-semibold">Carte Bancaire</p>
                  <p className="text-sm text-gray-500">Visa, Mastercard</p>
                </div>
                {paymentMethod === "card" && (
                  <CheckCircle className="text-primary h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={processing || paymentStatus === "success"}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {processing ? (
              <>
                <Loader className="animate-spin" /> Traitement...
              </>
            ) : (
              `Payer ${reservation.montant_total.toLocaleString()} FCFA`
            )}
          </button>
        </div>

        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h3 className="font-bold text-lg mb-4">Récapitulatif</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Véhicule</span>
                <span className="font-medium">
                  {reservation.vehicules_location.marque}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Du</span>
                <span className="font-medium">
                  {new Date(reservation.date_debut).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Au</span>
                <span className="font-medium">
                  {new Date(reservation.date_fin).toLocaleDateString()}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-bold">Total</span>
                <span className="font-bold text-xl text-primary">
                  {reservation.montant_total.toLocaleString()} FCFA
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
