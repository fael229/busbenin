import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { useSession } from "../contexts/SessionProvider";
import {
  Car,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  Plus,
  Filter,
  Download,
} from "lucide-react";

export default function MesVehiculesLocation() {
  const { session } = useSession();
  const navigate = useNavigate();

  const [vehicules, setVehicules] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vehicules"); // 'vehicules' ou 'reservations'
  const [filterStatut, setFilterStatut] = useState("tous");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadVehicules(), loadReservations()]);
    setLoading(false);
  };

  const loadVehicules = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicules_location")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVehicules(data || []);
    } catch (error) {
      console.error("Erreur chargement véhicules:", error);
    }
  };

  const loadReservations = async () => {
    try {
      // Récupérer toutes les réservations des véhicules du propriétaire
      const { data: mesVehicules } = await supabase
        .from("vehicules_location")
        .select("id")
        .eq("user_id", session.user.id);

      if (!mesVehicules || mesVehicules.length === 0) {
        setReservations([]);
        return;
      }

      const vehiculeIds = mesVehicules.map((v) => v.id);

      let query = supabase
        .from("reservations_location")
        .select(
          `
          *,
          vehicules_location (
            marque,
            modele,
            annee,
            prix_par_jour
          )
        `
        )
        .in("vehicule_id", vehiculeIds)
        .order("created_at", { ascending: false });

      // Filtres
      if (filterStatut !== "tous") {
        query = query.eq("statut_paiement", filterStatut);
      }
      if (dateDebut) {
        query = query.gte("date_debut", dateDebut);
      }
      if (dateFin) {
        query = query.lte("date_fin", dateFin);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error("Erreur chargement réservations:", error);
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

      alert("✅ Véhicule supprimé avec succès");
      loadVehicules();
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("❌ Erreur lors de la suppression");
    }
  };

  const exporterReservations = () => {
    const csv = [
      [
        "Date",
        "Véhicule",
        "Client",
        "Téléphone",
        "Période",
        "Montant",
        "Statut",
      ],
      ...reservations.map((r) => [
        new Date(r.created_at).toLocaleDateString("fr-FR"),
        `${r.vehicules_location?.marque} ${r.vehicules_location?.modele}`,
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

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const stats = {
    totalVehicules: vehicules.length,
    totalReservations: reservations.length,
    revenuTotal: reservations
      .filter((r) => r.statut_paiement === "approved")
      .reduce((sum, r) => sum + (r.montant_total || 0), 0),
    reservationsEnAttente: reservations.filter(
      (r) => r.statut_paiement === "pending"
    ).length,
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
            Mes Véhicules en Location
          </h1>
          <p className="text-gray-600">
            Gérez vos véhicules et consultez vos réservations
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Véhicules</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalVehicules}
                </p>
              </div>
              <Car className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Réservations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalReservations}
                </p>
              </div>
              <Calendar className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Revenu Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.revenuTotal.toLocaleString()}{" "}
                  <span className="text-sm">FCFA</span>
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">En Attente</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.reservationsEnAttente}
                </p>
              </div>
              <Calendar className="h-10 w-10 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab("vehicules")}
                className={`px-6 py-4 font-semibold transition-colors ${
                  activeTab === "vehicules"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Mes Véhicules ({vehicules.length})
              </button>
              <button
                onClick={() => setActiveTab("reservations")}
                className={`px-6 py-4 font-semibold transition-colors ${
                  activeTab === "reservations"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Réservations ({reservations.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === "vehicules" ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Liste des Véhicules
                  </h2>
                  <button
                    onClick={() => navigate("/location/ajouter")}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus size={20} />
                    Ajouter un véhicule
                  </button>
                </div>

                {vehicules.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Car size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Aucun véhicule en location</p>
                    <button
                      onClick={() => navigate("/location/ajouter")}
                      className="mt-4 text-blue-600 hover:underline"
                    >
                      Ajouter votre premier véhicule
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vehicules.map((vehicule) => (
                      <div
                        key={vehicule.id}
                        className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition"
                      >
                        {vehicule.photo_url ? (
                          <img
                            src={vehicule.photo_url}
                            alt={`${vehicule.marque} ${vehicule.modele}`}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                            <Car size={64} className="text-gray-400" />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-bold text-lg text-gray-900">
                            {vehicule.marque} {vehicule.modele}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">
                            {vehicule.annee}
                          </p>
                          <p className="text-blue-600 font-bold text-xl mb-4">
                            {vehicule.prix_par_jour.toLocaleString()} FCFA/jour
                          </p>

                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                navigate(`/location/${vehicule.id}`)
                              }
                              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition"
                            >
                              <Eye size={16} />
                              Voir
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/location/modifier/${vehicule.id}`)
                              }
                              className="flex-1 flex items-center justify-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition"
                            >
                              <Edit size={16} />
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDeleteVehicule(vehicule.id)}
                              className="flex items-center justify-center bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Filter size={20} className="text-gray-600" />
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
                  </div>

                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => {
                      setDateDebut(e.target.value);
                      setTimeout(loadReservations, 100);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Date début"
                  />

                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => {
                      setDateFin(e.target.value);
                      setTimeout(loadReservations, 100);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Date fin"
                  />

                  <button
                    onClick={exporterReservations}
                    disabled={reservations.length === 0}
                    className="ml-auto flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={20} />
                    Exporter CSV
                  </button>
                </div>

                {reservations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Aucune réservation</p>
                  </div>
                ) : (
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
                            Client
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Téléphone
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
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {reservation.nom_locataire}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {reservation.telephone_locataire}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(
                                reservation.date_debut
                              ).toLocaleDateString("fr-FR")}{" "}
                              -{" "}
                              {new Date(
                                reservation.date_fin
                              ).toLocaleDateString("fr-FR")}
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
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
