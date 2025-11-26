import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { useSession } from "../contexts/SessionProvider";
import { Car, Upload, ArrowLeft, AlertCircle, Phone } from "lucide-react";

export default function LocationAdd() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(true);
  const [hasPhone, setHasPhone] = useState(false);
  const [formData, setFormData] = useState({
    marque: "",
    modele: "",
    annee: new Date().getFullYear(),
    immatriculation: "",
    prix_par_jour: "",
    description: "",
    photo_url: "",
  });

  useEffect(() => {
    checkUserPhone();
  }, [session]);

  const checkUserPhone = async () => {
    if (!session?.user?.id) return;

    try {
      setCheckingPhone(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      setHasPhone(!!data?.phone && data.phone.trim() !== "");
    } catch (error) {
      console.error("Erreur vérification téléphone:", error);
      setHasPhone(false);
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) return;

    if (!hasPhone) {
      alert(
        "Veuillez d'abord ajouter votre numéro de téléphone dans votre profil."
      );
      navigate("/profile");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("vehicules_location").insert([
        {
          user_id: session.user.id,
          ...formData,
          prix_par_jour: parseFloat(formData.prix_par_jour),
          annee: parseInt(formData.annee),
        },
      ]);

      if (error) throw error;

      navigate("/location");
    } catch (error) {
      console.error("Erreur lors de l'ajout du véhicule:", error);
      alert("Une erreur est survenue lors de l'ajout du véhicule.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingPhone) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Retour
      </button>

      {!hasPhone && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-orange-800">
                Numéro de téléphone requis
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Avant de publier une annonce, vous devez ajouter votre numéro de
                téléphone pour que les clients puissent vous contacter et pour
                recevoir vos paiements.
              </p>
              <button
                onClick={() => navigate("/profile")}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Phone className="h-4 w-4" />
                Ajouter mon numéro
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-3 rounded-full text-primary">
            <Car size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Proposer un véhicule
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marque
              </label>
              <input
                type="text"
                name="marque"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.marque}
                onChange={handleChange}
                placeholder="ex: Toyota"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modèle
              </label>
              <input
                type="text"
                name="modele"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.modele}
                onChange={handleChange}
                placeholder="ex: Corolla"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Année
              </label>
              <input
                type="number"
                name="annee"
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.annee}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Immatriculation
              </label>
              <input
                type="text"
                name="immatriculation"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.immatriculation}
                onChange={handleChange}
                placeholder="Optionnel"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prix par jour (FCFA)
            </label>
            <input
              type="number"
              name="prix_par_jour"
              required
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.prix_par_jour}
              onChange={handleChange}
              placeholder="ex: 25000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.description}
              onChange={handleChange}
              placeholder="État du véhicule, conditions particulières..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL de la photo
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                name="photo_url"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.photo_url}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Pour l'instant, veuillez héberger l'image ailleurs et coller le
              lien ici.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Ajout en cours..." : "Ajouter le véhicule"}
          </button>
        </form>
      </div>
    </div>
  );
}
