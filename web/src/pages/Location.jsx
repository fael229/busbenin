import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { Car, Calendar, MapPin, Search, Plus } from "lucide-react";

export default function Location() {
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchVehicules();
  }, []);

  const fetchVehicules = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicules_location")
        .select("*")
        .eq("disponible", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVehicules(data);
    } catch (error) {
      console.error("Erreur lors du chargement des véhicules:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicules = vehicules.filter(
    (v) =>
      v.marque.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modele.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Location de Véhicules
          </h1>
          <p className="text-gray-600">
            Louez un véhicule ou proposez le vôtre
          </p>
        </div>
        <Link
          to="/location/ajouter"
          className="mt-4 md:mt-0 bg-primary text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Proposer un véhicule
        </Link>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-8">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          placeholder="Rechercher une marque, un modèle..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicules.map((vehicule) => (
            <div
              key={vehicule.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100"
            >
              <div className="h-48 bg-gray-200 relative">
                {vehicule.photo_url ? (
                  <img
                    src={vehicule.photo_url}
                    alt={`${vehicule.marque} ${vehicule.modele}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                    <Car size={48} />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-primary">
                  {vehicule.prix_par_jour.toLocaleString()} FCFA / jour
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {vehicule.marque} {vehicule.modele}
                </h3>
                <p className="text-gray-500 text-sm mb-4">{vehicule.annee}</p>

                <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                  {vehicule.description || "Aucune description disponible."}
                </p>

                <Link
                  to={`/location/${vehicule.id}`}
                  className="block w-full text-center bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Voir détails & Réserver
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredVehicules.length === 0 && (
        <div className="text-center py-12">
          <Car size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            Aucun véhicule trouvé
          </h3>
          <p className="text-gray-500">
            Soyez le premier à proposer un véhicule !
          </p>
        </div>
      )}
    </div>
  );
}
