import { useState, useEffect } from "react";
import {
  Car,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  CalendarRange,
  User,
  Phone,
  Eye,
  Star,
} from "lucide-react";
import { supabase } from "../../utils/supabase";

export default function AdminLocations() {
  const [reservations, setReservations] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [livraisonFilter, setLivraisonFilter] = useState("all"); // all, validee, non_validee
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    setLoading(true);

    try {
      console.log("🔍 Loading location reservations...");

      const { data, error } = await supabase
        .from("reservations_location")
        .select(
          `
          *,
          vehicules_location(
            marque,
            modele,
            annee,
            immatriculation
          ),
          profiles:user_id(
            full_name,
            phone
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error loading reservations:", error);
        throw error;
      }

      console.log("✅ Location reservations loaded:", data?.length || 0);
      
      // DIAGNOSTIC
      if (data && data.length > 0) {
        console.log("📊 Première réservation:", data[0]);
        console.log("🔍 livraison_validee:", data[0].livraison_validee);
      }
      
      setReservations(data || []);
    } catch (error) {
      console.error("❌ Exception in loadReservations:", error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statut) => {
    const config = {
      en_attente: {
        color: "bg-warning-light text-warning",
        icon: Clock,
        label: "En attente",
      },
      confirmee: {
        color: "bg-success-light text-success",
        icon: CheckCircle,
        label: "Confirmée",
      },
      annulee: {
        color: "bg-error-light text-error",
        icon: XCircle,
        label: "Annulée",
      },
      expiree: {
        color: "bg-gray-200 text-gray-700",
        icon: XCircle,
        label: "Expirée",
      },
    };
    const { color, icon: Icon, label } = config[statut] || config.en_attente;
    return (
      <span
        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${color}`}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </span>
    );
  };

  const getPaymentBadge = (statut) => {
    const config = {
      pending: { color: "bg-warning-light text-warning", label: "En attente" },
      approved: { color: "bg-success-light text-success", label: "Payé" },
      declined: { color: "bg-error-light text-error", label: "Refusé" },
      canceled: { color: "bg-gray-200 text-gray-700", label: "Annulé" },
    };
    const { color, label } = config[statut] || config.pending;
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
        {label}
      </span>
    );
  };

  const getLivraisonBadge = (validee, valideeAt) => {
    if (validee) {
      return (
        <div className="flex flex-col">
          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            <span>Validée</span>
          </span>
          {valideeAt && (
            <span className="text-xs text-gray-500 mt-1">
              {new Date(valideeAt).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800">
        <Clock className="h-3 w-3" />
        <span>Non validée</span>
      </span>
    );
  };

  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      r.nom_locataire?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.telephone_locataire?.includes(searchTerm) ||
      r.vehicules_location?.marque
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      r.vehicules_location?.modele
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || r.statut_paiement === statusFilter;

    const matchesLivraison =
      livraisonFilter === "all" ||
      (livraisonFilter === "validee" && r.livraison_validee === true) ||
      (livraisonFilter === "non_validee" && r.livraison_validee !== true);

    // Filtre de date
    let matchesDate = true;
    if (dateStart || dateEnd) {
      const reservationDate = new Date(r.created_at);
      if (dateStart) {
        const startDate = new Date(dateStart);
        startDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && reservationDate >= startDate;
      }
      if (dateEnd) {
        const endDate = new Date(dateEnd);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && reservationDate <= endDate;
      }
    }

    return matchesSearch && matchesStatus && matchesLivraison && matchesDate;
  });

  // Stats
  const stats = {
    total: reservations.length,
    payees: reservations.filter((r) => r.statut_paiement === "approved").length,
    validees: reservations.filter((r) => r.livraison_validee === true).length,
    nonValidees: reservations.filter(
      (r) => r.statut_paiement === "approved" && r.livraison_validee !== true
    ).length,
    revenuTotal: reservations
      .filter(
        (r) => r.statut_paiement === "approved" && r.livraison_validee === true
      )
      .reduce((sum, r) => sum + (r.montant_total || 0), 0),
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Gestion des Locations de Véhicules
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {reservations.length} réservation{reservations.length > 1 ? "s" : ""}{" "}
          au total
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Payées</p>
          <p className="text-2xl font-bold text-green-600">{stats.payees}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Validées</p>
          <p className="text-2xl font-bold text-blue-600">{stats.validees}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Non validées
          </p>
          <p className="text-2xl font-bold text-orange-600">
            {stats.nonValidees}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Revenu validé
          </p>
          <p className="text-lg font-bold text-primary">
            {stats.revenuTotal.toLocaleString()} FCFA
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card mb-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="input-field pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              <option value="all">Tous les paiements</option>
              <option value="approved">Payé</option>
              <option value="pending">En attente</option>
              <option value="declined">Refusé</option>
            </select>
          </div>

          <div className="relative">
            <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={livraisonFilter}
              onChange={(e) => setLivraisonFilter(e.target.value)}
              className="input-field pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              <option value="all">Toutes les livraisons</option>
              <option value="validee">Validées</option>
              <option value="non_validee">Non validées</option>
            </select>
          </div>

          <div className="relative">
            <CalendarRange className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              placeholder="Date début"
              className="input-field pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>

          <div className="relative">
            <CalendarRange className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              placeholder="Date fin"
              className="input-field pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
        </div>

        {(dateStart ||
          dateEnd ||
          searchTerm ||
          statusFilter !== "all" ||
          livraisonFilter !== "all") && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredReservations.length} résultat
              {filteredReservations.length > 1 ? "s" : ""} trouvé
              {filteredReservations.length > 1 ? "s" : ""}
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setLivraisonFilter("all");
                setDateStart("");
                setDateEnd("");
              }}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            Chargement des réservations...
          </p>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="card text-center py-12">
          <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Aucune réservation trouvée
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || statusFilter !== "all" || livraisonFilter !== "all"
              ? "Essayez de modifier vos filtres de recherche"
              : "Les réservations de location apparaîtront ici"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <div key={reservation.id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {reservation.vehicules_location?.marque}{" "}
                          {reservation.vehicules_location?.modele}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {reservation.vehicules_location?.annee}
                        {reservation.vehicules_location?.immatriculation &&
                          ` • ${reservation.vehicules_location.immatriculation}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {getPaymentBadge(reservation.statut_paiement)}
                      {reservation.statut_paiement === "approved" &&
                        getLivraisonBadge(
                          reservation.livraison_validee,
                          reservation.livraison_validee_at
                        )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Client</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {reservation.nom_locataire}
                      </p>
                      <p className="text-xs text-gray-500">
                        {reservation.telephone_locataire}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Période
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Date(reservation.date_debut).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "short",
                          }
                        )}
                        {" - "}
                        {new Date(reservation.date_fin).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "short",
                          }
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.ceil(
                          (new Date(reservation.date_fin) -
                            new Date(reservation.date_debut)) /
                            (1000 * 60 * 60 * 24)
                        ) + 1}{" "}
                        jour(s)
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Propriétaire
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {reservation.profiles?.full_name || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {reservation.profiles?.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Réservé le
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Date(reservation.created_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "short",
                          }
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(reservation.created_at).toLocaleTimeString(
                          "fr-FR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Montant
                      </p>
                      <p className="font-semibold text-primary text-lg">
                        {reservation.montant_total.toLocaleString()} FCFA
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Livraison
                      </p>
                      <div className="mt-1">
                        {getLivraisonBadge(
                          reservation.livraison_validee,
                          reservation.livraison_validee_at
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
