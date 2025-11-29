import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import {
  Car,
  Calendar,
  MapPin,
  Star,
  User,
  ArrowLeft,
  CheckCircle,
  Shield,
  Info,
} from "lucide-react";

export default function LocationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicule, setVehicule] = useState(null);
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moyenne, setMoyenne] = useState(0);

  useEffect(() => {
    fetchVehiculeDetails();
    fetchAvis();
  }, [id]);

  const fetchVehiculeDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicules_location")
        .select("*, profiles(full_name, avatar_url, updated_at)")
        .eq("id", id)
        .single();

      if (error) throw error;
      setVehicule(data);
    } catch (error) {
      console.error("Erreur chargement véhicule:", error);
      navigate("/location");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvis = async () => {
    try {
      const { data, error } = await supabase
        .from("avis_location")
        .select("*")
        .eq("vehicule_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Si des avis existent, charger les profils des utilisateurs
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((a) => a.user_id))];

        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        // Fusionner les données
        const avisWithProfiles = data.map((avis) => ({
          ...avis,
          profiles: profilesData?.find((p) => p.id === avis.user_id) || null,
        }));

        setAvis(avisWithProfiles);

        const total = data.reduce((acc, curr) => acc + curr.note, 0);
        setMoyenne(total / data.length);
      }
    } catch (error) {
      console.error("Erreur chargement avis:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!vehicule) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Retour aux véhicules
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne Principale : Photos et Détails */}
          <div className="lg:col-span-2 space-y-6">
            {/* Carte Principale */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className="h-64 md:h-96 bg-gray-200 relative">
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
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-lg font-bold text-primary shadow-sm">
                  {vehicule.prix_par_jour.toLocaleString()} FCFA
                  <span className="text-sm font-normal text-gray-600 ml-1">
                    / jour
                  </span>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {vehicule.marque} {vehicule.modele}
                    </h1>
                    <div className="flex items-center gap-4 text-gray-600">
                      <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm">
                        <Calendar size={16} />
                        {vehicule.annee}
                      </span>
                      {moyenne > 0 && (
                        <span className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                          <Star
                            size={16}
                            className="fill-yellow-400 text-yellow-400"
                          />
                          {moyenne.toFixed(1)} ({avis.length} avis)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="prose max-w-none text-gray-600 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Description
                  </h3>
                  <p>
                    {vehicule.description ||
                      "Aucune description fournie pour ce véhicule."}
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Caractéristiques
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Shield className="text-blue-500" size={20} />
                      <span className="text-sm font-medium text-gray-700">
                        Assurance incluse
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="text-green-500" size={20} />
                      <span className="text-sm font-medium text-gray-700">
                        État vérifié
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Info className="text-purple-500" size={20} />
                      <span className="text-sm font-medium text-gray-700">
                        Support 24/7
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Avis */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                Avis des locataires
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {avis.length}
                </span>
              </h2>

              {avis.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucun avis pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {avis.map((review) => (
                    <div
                      key={review.id}
                      className="border-b border-gray-100 last:border-0 pb-6 last:pb-0"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                            {review.profiles?.avatar_url ? (
                              <img
                                src={review.profiles.avatar_url}
                                alt={review.profiles.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={20} className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {review.profiles?.full_name || "Utilisateur"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(review.created_at).toLocaleDateString(
                                "fr-FR",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={`${
                                i < review.note
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-gray-200 text-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mt-2">
                        {review.commentaire}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colonne Latérale : Action et Info Propriétaire */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-1">
                  Prix total par jour
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {vehicule.prix_par_jour.toLocaleString()}
                  </span>
                  <span className="text-lg font-medium text-gray-600">
                    FCFA
                  </span>
                </div>
              </div>

              <Link
                to={`/location/reserver/${vehicule.id}`}
                className="block w-full bg-primary text-white text-center py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-blue-500/30 mb-4"
              >
                Réserver maintenant
              </Link>

              <p className="text-xs text-center text-gray-500 mb-6">
                Aucun débit immédiat. Annulation gratuite jusqu'à 48h avant.
              </p>

              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">
                  Propriétaire
                </h4>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                    {vehicule.profiles?.avatar_url ? (
                      <img
                        src={vehicule.profiles.avatar_url}
                        alt={vehicule.profiles.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {vehicule.profiles?.full_name || "Partenaire BusPro"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Membre depuis{" "}
                      {new Date(
                        vehicule.profiles?.updated_at || new Date()
                      ).getFullYear()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
