import { useState, useEffect } from "react";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  CreditCard,
  AlertCircle,
  Plus,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { useSession } from "../contexts/SessionProvider";
import { useNavigate } from "react-router-dom";

export default function Wallet() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [userPhone, setUserPhone] = useState(null);

  useEffect(() => {
    if (session?.user?.id) {
      loadWalletData();
    }
  }, [session]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const userId = session.user.id;

      // 1. Récupérer le profil pour le téléphone
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", userId)
        .single();

      setUserPhone(profile?.phone);

      // 2. Récupérer les réservations payées ET validées par le client (Entrées)
      // IMPORTANT: Ne compter QUE les réservations validées par le client
      // Pour les locations de véhicules (si l'utilisateur est propriétaire)
      const { data: locationReservations, error: locError } = await supabase
        .from("reservations_location")
        .select(
          `
          id,
          montant_total,
          created_at,
          statut_paiement,
          livraison_validee,
          vehicules_location!inner(user_id)
        `
        )
        .eq("vehicules_location.user_id", userId)
        .eq("statut_paiement", "approved")
        .eq("livraison_validee", true); // ⭐ SEULEMENT les livraisons validées

      if (locError) throw locError;

      // 3. Récupérer les retraits (Sorties)
      const { data: userWithdrawals, error: withError } = await supabase
        .from("demandes_retrait")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (withError) throw withError;

      setWithdrawals(userWithdrawals || []);

      // 4. Calculer le solde
      const totalEarnings = (locationReservations || []).reduce(
        (sum, res) => sum + (res.montant_total || 0),
        0
      );

      const totalWithdrawals = (userWithdrawals || [])
        .filter((w) => w.statut !== "refusee") // On compte tout sauf les refusés
        .reduce((sum, w) => sum + (w.montant || 0), 0);

      setBalance(totalEarnings - totalWithdrawals);

      // 5. Organiser l'historique des transactions
      const earningsHistory = (locationReservations || []).map((res) => ({
        id: res.id,
        type: "credit",
        amount: res.montant_total,
        date: res.created_at,
        status: "completed",
        description: "Location de véhicule",
      }));

      const withdrawalsHistory = (userWithdrawals || []).map((w) => ({
        id: w.id,
        type: "debit",
        amount: w.montant,
        date: w.created_at,
        status:
          w.statut === "validee"
            ? "completed"
            : w.statut === "refusee"
            ? "failed"
            : "pending",
        description: "Retrait vers Mobile Money",
      }));

      // Fusionner et trier par date
      const allTransactions = [...earningsHistory, ...withdrawalsHistory].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error("Erreur chargement portefeuille:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || isNaN(withdrawAmount)) return;

    const amount = parseFloat(withdrawAmount);

    if (amount < 2000) {
      alert("Le montant minimum de retrait est de 2 000 FCFA");
      return;
    }

    if (amount > balance) {
      alert("Solde insuffisant");
      return;
    }

    if (!userPhone) {
      alert(
        "Veuillez ajouter un numéro de téléphone dans votre profil avant de faire un retrait."
      );
      navigate("/profile");
      return;
    }

    setWithdrawLoading(true);
    try {
      const { error } = await supabase.from("demandes_retrait").insert({
        user_id: session.user.id,
        montant: amount,
        statut: "en_attente",
      });

      if (error) throw error;

      alert("Demande de retrait envoyée avec succès !");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      loadWalletData(); // Recharger les données
    } catch (error) {
      console.error("Erreur demande retrait:", error);
      alert("Impossible de traiter la demande: " + error.message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <WalletIcon className="h-8 w-8 text-primary" />
            Mon Portefeuille
          </h1>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <ArrowUpRight className="h-5 w-5" />
            Demander un retrait
          </button>
        </div>

        {/* Carte Solde */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">
                  Solde Disponible
                </p>
                <h2 className="text-4xl font-bold">
                  {balance.toLocaleString("fr-FR")} FCFA
                </h2>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-blue-100 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Compte actif
              </div>
              {userPhone && (
                <div className="flex items-center gap-2 text-blue-100 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Lié au {userPhone}
                </div>
              )}
            </div>
          </div>

          {/* Stats rapides */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <ArrowDownLeft className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Gagné
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {transactions
                      .filter((t) => t.type === "credit")
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString("fr-FR")}{" "}
                    FCFA
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <ArrowUpRight className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Retiré
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {withdrawals
                      .filter((w) => w.statut === "validee")
                      .reduce((sum, w) => sum + w.montant, 0)
                      .toLocaleString("fr-FR")}{" "}
                    FCFA
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Historique des transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              Historique des transactions
            </h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <div
                  key={`${transaction.type}-${transaction.id}`}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-full ${
                          transaction.type === "credit"
                            ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                        }`}
                      >
                        {transaction.type === "credit" ? (
                          <ArrowDownLeft size={20} />
                        ) : (
                          <ArrowUpRight size={20} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(transaction.date).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          transaction.type === "credit"
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {transaction.type === "credit" ? "+" : "-"}
                        {transaction.amount.toLocaleString("fr-FR")} FCFA
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : transaction.status === "pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {transaction.status === "completed"
                          ? "Validé"
                          : transaction.status === "pending"
                          ? "En attente"
                          : "Échoué"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <History className="h-8 w-8 text-gray-400" />
                </div>
                <p>Aucune transaction pour le moment</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Retrait */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Demander un retrait
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <span className="sr-only">Fermer</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleWithdraw}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Montant à retirer (FCFA)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="input-field pl-4 pr-12 text-lg font-semibold"
                    placeholder="0"
                    min="2000"
                    max={balance}
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">FCFA</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Minimum: 2 000 FCFA • Solde: {balance.toLocaleString(
                    "fr-FR"
                  )}{" "}
                  FCFA
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  Information de paiement
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Le montant sera envoyé sur votre numéro Mobile Money :
                  <br />
                  <span className="font-bold text-lg">
                    {userPhone || "Numéro non défini"}
                  </span>
                </p>
                {!userPhone && (
                  <button
                    type="button"
                    onClick={() => navigate("/profile")}
                    className="mt-2 text-sm font-medium text-blue-700 hover:text-blue-800 underline"
                  >
                    Ajouter un numéro
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    withdrawLoading ||
                    !userPhone ||
                    parseFloat(withdrawAmount) > balance
                  }
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawLoading ? "Traitement..." : "Confirmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
