import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { useSession } from "../contexts/SessionProvider";
import {
  Car,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Download,
  Filter,
  Eye,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminLocation() {
  const { session } = useSession();
  const navigate = useNavigate();

  const [vehicules, setVehicules] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [proprietaires, setProprietaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'vehicules', 'reservations', 'proprietaires'
  const [filterStatut, setFilterStatut] = useState("tous");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, [session]);

  const checkAdminAccess = async () => {
    if (!session?.user) {
      console.log("Debug: Pas d'utilisateur en session");
      navigate("/login");
      return;
    }

    console.log("Debug: Vérification droits admin pour ID:", session.user.id);

    // Vérifier si l'utilisateur est admin
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    console.log("Debug: Profil récupéré:", profile);
    if (error) console.error("Debug: Erreur récupération profil:", error);

    if (profile?.role !== "admin") {
      console.warn("Debug: Accès refusé. Rôle actuel:", profile?.role);
      alert(
        `Accès refusé - Administrateur uniquement.\n\nRôle actuel: ${
          profile?.role || "aucun"
        }\nVotre Email: ${
          session.user.email
        }\n\nVeuillez utiliser cet email dans le script SQL 13.`
      );
      navigate("/");
      return;
    }

    console.log("Debug: Accès admin accordé");
    loadAllData();
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadVehicules(),
      loadReservations(),
      loadProprietaires(),
    ]);
    setLoading(false);
  };

  const loadVehicules = async () => {
    try {
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicules_location")
        .select("*")
        .order("created_at", { ascending: false });

      if (vehiclesError) throw vehiclesError;

      if (!vehiclesData || vehiclesData.length === 0) {
        setVehicules([]);
        return;
      }

      const userIds = [
        ...new Set(vehiclesData.map((v) => v.user_id).filter(Boolean)),
      ];

      let profilesMap = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profilesData) {
          profilesData.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      const mergedData = vehiclesData.map((v) => ({
        ...v,
        profiles: profilesMap[v.user_id] || {
          full_name: "Inconnu",
          email: "N/A",
        },
      }));

      setVehicules(mergedData);
    } catch (error) {
      console.error("Erreur chargement véhicules:", error);
    }
  };

  const loadReservations = async () => {
    try {
      let query = supabase
        .from("reservations_location")
        .select(
          `
          *,
          vehicules_location (marque, modele, annee, prix_par_jour, user_id)
        `
        )
        .order("created_at", { ascending: false });

      if (filterStatut !== "tous") {
        query = query.eq("statut_paiement", filterStatut);
      }
      if (dateDebut) {
        query = query.gte("date_debut", dateDebut);
      }
      if (dateFin) {
        query = query.lte("date_fin", dateFin);
      }

      const { data: reservationsData, error: reservationsError } = await query;

      if (reservationsError) throw reservationsError;

      if (!reservationsData || reservationsData.length === 0) {
        setReservations([]);
        return;
      }

      const ownerIds = [
        ...new Set(
          reservationsData
            .map((r) => r.vehicules_location?.user_id)
            .filter(Boolean)
        ),
      ];

      let profilesMap = {};
      if (ownerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);

        if (profilesData) {
          profilesData.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      const mergedData = reservationsData.map((r) => {
        const ownerId = r.vehicules_location?.user_id;
        const ownerProfile = ownerId
          ? profilesMap[ownerId] || { full_name: "Inconnu" }
          : { full_name: "Inconnu" };

        return {
          ...r,
          vehicules_location: {
            ...r.vehicules_location,
            profiles: ownerProfile,
          },
        };
      });

      setReservations(mergedData);
    } catch (error) {
      console.error("Erreur chargement réservations:", error);
    }
  };
  const loadProprietaires = async () => {
    try {
      // Récupérer les propriétaires uniques depuis les véhicules
      const { data: vehiculesData } = await supabase
        .from("vehicules_location")
        .select("user_id");

      if (!vehiculesData) return;

      const userIds = [
        ...new Set(vehiculesData.map((v) => v.user_id).filter(Boolean)),
      ];

      if (userIds.length === 0) {
        setProprietaires([]);
        return;
      }

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      setProprietaires(profilesData || []);
    } catch (error) {
      console.error("Erreur chargement propriétaires:", error);
    }
  };

  const handleDeleteVehicule = async (id) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ?")) return;

    try {
      const { error } = await supabase
        .from("vehicules_location")
        .delete()
        .eq("id", id);

      if (error) throw error;

      alert("✅ Véhicule supprimé");
      loadVehicules();
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("❌ Erreur lors de la suppression");
    }
  };

  const exporterDonnees = () => {
    let csv = "";
    let filename = "";

    if (activeTab === "reservations") {
      csv = [
        [
          "Date",
          "Véhicule",
          "Propriétaire",
          "Client",
          "Téléphone",
          "Période",
          "Montant",
          "Statut",
        ],
        ...reservations.map((r) => [
          new Date(r.created_at).toLocaleDateString("fr-FR"),
          `${r.vehicules_location?.marque} ${r.vehicules_location?.modele}`,
          r.vehicules_location?.profiles?.full_name || "N/A",
          r.nom_locataire,
          r.telephone_locataire,
          `${new Date(r.date_debut).toLocaleDateString("fr-FR")} - ${new Date(
            r.date_fin
          ).toLocaleDateString("fr-FR")}`,
          `${r.montant_total} FCFA`,
          r.statut_paiement === "approved" ? "Payé" : "En attente",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");
      filename = "reservations";
    } else if (activeTab === "vehicules") {
      csv = [
        [
          "Marque",
          "Modèle",
          "Année",
          "Prix/Jour",
          "Propriétaire",
          "Email",
          "Téléphone",
        ],
        ...vehicules.map((v) => [
          v.marque,
          v.modele,
          v.annee,
          `${v.prix_par_jour} FCFA`,
          v.profiles?.full_name || "N/A",
          v.profiles?.email || "N/A",
          "N/A",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");
      filename = "vehicules";
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const stats = {
    totalVehicules: vehicules.length,
    totalReservations: reservations.length,
    revenuTotal: reservations
      .filter((r) => r.statut_paiement === "approved")
      .reduce((sum, r) => sum + (r.montant_total || 0), 0),
    reservationsAujourdhui: reservations.filter(
      (r) => new Date(r.created_at).toDateString() === new Date().toDateString()
    ).length,
    totalProprietaires: proprietaires.length,
    tauxOccupation:
      vehicules.length > 0
        ? (
            (reservations.filter((r) => r.statut_paiement === "approved")
              .length /
              vehicules.length) *
            100
          ).toFixed(1)
        : 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Administration - Location de Véhicules
          </h1>
          <p className="text-gray-600">
            Vue d'ensemble et gestion complète du système
          </p>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Car className="h-8 w-8 text-blue-500" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalVehicules}
                </p>
              </div>
              <p className="text-gray-600 text-sm">Véhicules</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="h-8 w-8 text-green-500" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalReservations}
                </p>
              </div>
              <p className="text-gray-600 text-sm">Réservations</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-8 w-8 text-yellow-500" />
                <p className="text-xl font-bold text-gray-900">
                  {(stats.revenuTotal / 1000000).toFixed(2)}M
                </p>
              </div>
              <p className="text-gray-600 text-sm">Revenu (FCFA)</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-8 w-8 text-purple-500" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalProprietaires}
                </p>
              </div>
              <p className="text-gray-600 text-sm">Propriétaires</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-orange-500" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.tauxOccupation}%
                </p>
              </div>
              <p className="text-gray-600 text-sm">Taux location</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="h-8 w-8 text-red-500" />
                <p className="text-2xl font-bold text-gray-900">
                  {stats.reservationsAujourdhui}
                </p>
              </div>
              <p className="text-gray-600 text-sm">Aujourd'hui</p>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {["overview", "vehicules", "reservations", "proprietaires"].map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab === "overview" && "Vue d'ensemble"}
                    {tab === "vehicules" && `Véhicules (${vehicules.length})`}
                    {tab === "reservations" &&
                      `Réservations (${reservations.length})`}
                    {tab === "proprietaires" &&
                      `Propriétaires (${proprietaires.length})`}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Aperçu Général
                </h2>

                {/* Graphiques ou stats additionnelles ici */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Réservations par Statut
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Payées</span>
                        <span className="font-bold text-green-600">
                          {
                            reservations.filter(
                              (r) => r.statut_paiement === "approved"
                            ).length
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">En attente</span>
                        <span className="font-bold text-yellow-600">
                          {
                            reservations.filter(
                              (r) => r.statut_paiement === "pending"
                            ).length
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Refusées</span>
                        <span className="font-bold text-red-600">
                          {
                            reservations.filter(
                              (r) => r.statut_paiement === "declined"
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Top 5 Véhicules
                    </h3>
                    <div className="space-y-2">
                      {vehicules.slice(0, 5).map((v) => (
                        <div
                          key={v.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-gray-900">
                            {v.marque} {v.modele}
                          </span>
                          <span className="text-gray-600">
                            {v.prix_par_jour} FCFA/j
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "vehicules" && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Tous les Véhicules
                  </h2>
                  <button
                    onClick={exporterDonnees}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <Download size={20} />
                    Exporter
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Véhicule
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Année
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Prix/Jour
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Propriétaire
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Téléphone
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {vehicules.map((vehicule) => (
                        <tr key={vehicule.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {vehicule.marque} {vehicule.modele}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {vehicule.annee}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {vehicule.prix_par_jour.toLocaleString()} FCFA
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {vehicule.profiles?.full_name || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            N/A
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  navigate(`/location/${vehicule.id}`)
                                }
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteVehicule(vehicule.id)
                                }
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === "reservations" && (
              <>
                <div className="flex flex-wrap gap-4 mb-6">
                  <select
                    value={filterStatut}
                    onChange={(e) => {
                      setFilterStatut(e.target.value);
                      setTimeout(loadReservations, 100);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tous">Tous les statuts</option>
                    <option value="approved">Payé</option>
                    <option value="pending">En attente</option>
                    <option value="declined">Refusé</option>
                  </select>

                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => {
                      setDateDebut(e.target.value);
                      setTimeout(loadReservations, 100);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />

                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => {
                      setDateFin(e.target.value);
                      setTimeout(loadReservations, 100);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />

                  <button
                    onClick={exporterDonnees}
                    className="ml-auto flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <Download size={20} />
                    Exporter
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Véhicule
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Propriétaire
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Client
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Période
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Montant
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reservations.map((reservation) => (
                        <tr key={reservation.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(
                              reservation.created_at
                            ).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {reservation.vehicules_location?.marque}{" "}
                            {reservation.vehicules_location?.modele}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {reservation.vehicules_location?.profiles
                              ?.full_name || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {reservation.nom_locataire}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(
                              reservation.date_debut
                            ).toLocaleDateString("fr-FR")}{" "}
                            -{" "}
                            {new Date(reservation.date_fin).toLocaleDateString(
                              "fr-FR"
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {reservation.montant_total?.toLocaleString()} FCFA
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                reservation.statut_paiement === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : reservation.statut_paiement === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {reservation.statut_paiement === "approved"
                                ? "Payé"
                                : reservation.statut_paiement === "pending"
                                ? "En attente"
                                : "Refusé"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === "proprietaires" && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Liste des Propriétaires
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {proprietaires.map((proprietaire) => {
                    const nbVehicules = vehicules.filter(
                      (v) => v.user_id === proprietaire.id
                    ).length;
                    const vehiculeIds = vehicules
                      .filter((v) => v.user_id === proprietaire.id)
                      .map((v) => v.id);
                    const nbReservations = reservations.filter((r) =>
                      vehiculeIds.includes(r.vehicule_id)
                    ).length;
                    const revenu = reservations
                      .filter(
                        (r) =>
                          vehiculeIds.includes(r.vehicule_id) &&
                          r.statut_paiement === "approved"
                      )
                      .reduce((sum, r) => sum + (r.montant_total || 0), 0);

                    return (
                      <div
                        key={proprietaire.id}
                        className="bg-white border border-gray-200 rounded-xl p-6"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="text-blue-600" size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">
                              {proprietaire.full_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {proprietaire.email}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Téléphone:</span>
                            <span className="font-medium">N/A</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Véhicules:</span>
                            <span className="font-bold text-blue-600">
                              {nbVehicules}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Réservations:</span>
                            <span className="font-bold text-green-600">
                              {nbReservations}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Revenu:</span>
                            <span className="font-bold text-yellow-600">
                              {revenu.toLocaleString()} FCFA
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
