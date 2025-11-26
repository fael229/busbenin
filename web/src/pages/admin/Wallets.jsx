import { useState, useEffect } from "react";
import {
  Check,
  X,
  Search,
  Filter,
  Download,
  Wallet,
  User,
  Phone,
  Calendar,
} from "lucide-react";
import { supabase } from "../../utils/supabase";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminWallets() {
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all', 'en_attente', 'validee', 'refusee'
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);

      // 1. Récupérer les demandes de retrait
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from("demandes_retrait")
        .select("*")
        .order("created_at", { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      if (!withdrawalsData || withdrawalsData.length === 0) {
        setWithdrawals([]);
        return;
      }

      // 2. Récupérer les IDs des utilisateurs concernés
      const userIds = [...new Set(withdrawalsData.map((w) => w.user_id))];

      // 3. Récupérer les profils de ces utilisateurs
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Créer une map pour accès rapide
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      // 4. Fusionner les données
      const enrichedData = withdrawalsData.map((w) => {
        const profile = profilesMap[w.user_id];
        return {
          ...w,
          profiles: profile || {
            full_name: "Utilisateur inconnu",
            email: "",
            phone: "",
          },
          phone: profile?.phone || "Non renseigné",
        };
      });

      setWithdrawals(enrichedData);
    } catch (error) {
      console.error("Erreur chargement retraits:", error);
      alert("Impossible de charger les demandes de retrait");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (
      !confirm(
        newStatus === "validee"
          ? "Valider ce retrait ?"
          : "Refuser ce retrait ?"
      )
    )
      return;

    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("demandes_retrait")
        .update({
          statut: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Mettre à jour la liste locale
      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === id
            ? { ...w, statut: newStatus, updated_at: new Date().toISOString() }
            : w
        )
      );

      alert(
        newStatus === "validee"
          ? "Retrait validé avec succès"
          : "Retrait refusé"
      );
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      alert("Erreur lors de la mise à jour");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchesFilter = filter === "all" || w.statut === filter;
    const matchesSearch =
      w.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.phone?.includes(searchTerm);

    let matchesDate = true;
    if (startDate) {
      matchesDate =
        matchesDate && new Date(w.created_at) >= new Date(startDate);
    }
    if (endDate) {
      // On ajoute un jour à la date de fin pour inclure toute la journée sélectionnée
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(w.created_at) <= end;
    }

    return matchesFilter && matchesSearch && matchesDate;
  });

  // Calculer les totaux
  const totalPending = withdrawals
    .filter((w) => w.statut === "en_attente")
    .reduce((sum, w) => sum + (w.montant || 0), 0);

  const totalValidated = withdrawals
    .filter((w) => w.statut === "validee")
    .reduce((sum, w) => sum + (w.montant || 0), 0);

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Fonction pour formater les nombres sans problème d'encodage
    const formatNumber = (num) => {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    };

    // En-tête
    doc.setFontSize(20);
    doc.setTextColor(30, 136, 229); // Bleu Bus Bénin
    doc.text("Bus Benin - Rapport des Retraits", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    let periodText = `Genere le ${format(new Date(), "dd MMMM yyyy 'a' HH:mm", {
      locale: fr,
    })}`;
    if (startDate || endDate) {
      periodText += `\nPeriode : ${
        startDate ? format(new Date(startDate), "dd/MM/yyyy") : "Debut"
      } au ${endDate ? format(new Date(endDate), "dd/MM/yyyy") : "Fin"}`;
    }
    doc.text(periodText, 14, 30);

    // Résumé
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Resume", 14, 50);

    doc.setFontSize(10);
    doc.text(`Total Valide: ${formatNumber(totalValidated)} FCFA`, 14, 57);
    doc.text(`En Attente: ${formatNumber(totalPending)} FCFA`, 14, 63);
    doc.text(`Nombre de transactions: ${filteredWithdrawals.length}`, 14, 69);

    // Tableau
    const tableColumn = [
      "Date",
      "Utilisateur",
      "Email",
      "Telephone",
      "Montant",
      "Statut",
    ];
    const tableRows = [];

    filteredWithdrawals.forEach((w) => {
      const withdrawalData = [
        format(new Date(w.created_at), "dd/MM/yyyy HH:mm"),
        w.profiles?.full_name || "Inconnu",
        w.profiles?.email || "N/A",
        w.phone || "N/A",
        `${formatNumber(w.montant)} FCFA`,
        w.statut === "validee"
          ? "Valide"
          : w.statut === "en_attente"
          ? "En attente"
          : "Refuse",
      ];
      tableRows.push(withdrawalData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 80,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 136, 229] },
    });

    doc.save(`rapport_retraits_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="h-8 w-8 text-primary" />
          Gestion des Retraits
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter PDF
          </button>
        </div>
      </div>

      {/* Cartes Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            En attente de validation
          </p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {totalPending.toLocaleString("fr-FR")} FCFA
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {withdrawals.filter((w) => w.statut === "en_attente").length}{" "}
            demandes
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Total Validé
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {totalValidated.toLocaleString("fr-FR")} FCFA
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {withdrawals.filter((w) => w.statut === "validee").length} retraits
          </p>
        </div>
      </div>

      {/* Filtres et Recherche */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4">
        {/* Ligne 1 : Filtres Statut et Recherche */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === "all"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Tout voir
            </button>
            <button
              onClick={() => setFilter("en_attente")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === "en_attente"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setFilter("validee")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === "validee"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Validés
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Ligne 2 : Filtres Date */}
        <div className="flex flex-col md:flex-row gap-4 items-center border-t border-gray-100 dark:border-gray-700 pt-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Période :
          </span>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <span className="text-gray-500">à</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-sm text-red-500 hover:text-red-600 hover:underline"
            >
              Effacer les dates
            </button>
          )}
        </div>
      </div>

      {/* Liste des retraits */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredWithdrawals.length > 0 ? (
                filteredWithdrawals.map((withdrawal) => (
                  <tr
                    key={withdrawal.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(
                          new Date(withdrawal.created_at),
                          "dd MMM yyyy HH:mm",
                          { locale: fr }
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {withdrawal.profiles?.full_name || "Inconnu"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                          {withdrawal.profiles?.email}
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 ml-6 flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {withdrawal.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {withdrawal.montant.toLocaleString("fr-FR")} FCFA
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          withdrawal.statut === "validee"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : withdrawal.statut === "en_attente"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {withdrawal.statut === "validee"
                          ? "Validé"
                          : withdrawal.statut === "en_attente"
                          ? "En attente"
                          : "Refusé"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {withdrawal.statut === "en_attente" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              handleUpdateStatus(withdrawal.id, "validee")
                            }
                            disabled={processingId === withdrawal.id}
                            className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                            title="Valider"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(withdrawal.id, "refusee")
                            }
                            disabled={processingId === withdrawal.id}
                            className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                            title="Refuser"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    Aucun retrait trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
