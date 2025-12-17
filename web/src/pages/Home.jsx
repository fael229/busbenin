import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  TrendingUp,
  Star,
  Award,
  Tag,
  Building2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Sliders,
  Wallet,
  Car,
  DollarSign,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import TrajetCard from "../components/TrajetCard";
import { useSession } from "../contexts/SessionProvider";

export default function Home() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [trajetsPopulaires, setTrajetsPopulaires] = useState([]);
  const [compagnies, setCompagnies] = useState([]);
  const [offresSpeciales, setOffresSpeciales] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [companiesScrollPosition, setCompaniesScrollPosition] = useState(0);

  // États pour wallet et véhicules
  const [walletBalance, setWalletBalance] = useState(0);
  const [vehiculesLocation, setVehiculesLocation] = useState([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [loadingVehicules, setLoadingVehicules] = useState(false);

  // États des filtres
  const [showFilters, setShowFilters] = useState(false);
  const [prixMin, setPrixMin] = useState(0);
  const [prixMax, setPrixMax] = useState(100000);
  const [noteMin, setNoteMin] = useState(0);
  const [compagnieSelectionnee, setCompagnieSelectionnee] = useState("");

  useEffect(() => {
    loadData();
  }, [session]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDestinations(),
        loadPopularRoutes(),
        loadCompagnies(),
        loadOffresSpeciales(),
        session && loadFavorites(),
        session && loadWalletBalance(),
        loadVehiculesLocation(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadWalletBalance = async () => {
    if (!session?.user?.id) return;

    setLoadingWallet(true);
    try {
      // Récupérer les réservations payées ET validées par le client (revenus)
      const { data: locationReservations } = await supabase
        .from("reservations_location")
        .select("montant_total, vehicules_location!inner(user_id)")
        .eq("vehicules_location.user_id", session.user.id)
        .eq("statut_paiement", "approved")
        .eq("livraison_validee", true); // Seulement les livraisons validées par le client

      const totalEarnings = (locationReservations || []).reduce(
        (sum, res) => sum + (res.montant_total || 0),
        0
      );

      // Récupérer les retraits
      const { data: withdrawals } = await supabase
        .from("demandes_retrait")
        .select("montant, statut")
        .eq("user_id", session.user.id);

      const totalWithdrawals = (withdrawals || [])
        .filter((w) => w.statut !== "refusee")
        .reduce((sum, w) => w.montant + sum, 0);

      setWalletBalance(totalEarnings - totalWithdrawals);
    } catch (error) {
      console.error("Erreur chargement wallet:", error);
    } finally {
      setLoadingWallet(false);
    }
  };

  const loadVehiculesLocation = async () => {
    setLoadingVehicules(true);
    try {
      const { data } = await supabase
        .from("vehicules_location")
        .select("*, profiles:user_id(full_name, phone)")
        .eq("disponible", true)
        .order("created_at", { ascending: false })
        .limit(6);

      setVehiculesLocation(data || []);
    } catch (error) {
      console.error("Erreur chargement véhicules:", error);
    } finally {
      setLoadingVehicules(false);
    }
  };

  const loadDestinations = async () => {
    const { data } = await supabase
      .from("destinations")
      .select("id, nom")
      .order("nom", { ascending: true });
    setDestinations(data || []);
  };

  const loadPopularRoutes = async () => {
    const { data } = await supabase
      .from("trajets")
      .select(
        "id, depart, arrivee, prix, note, nb_avis, horaires, compagnies:compagnie_id(nom)"
      )
      .order("note", { ascending: false })
      .order("nb_avis", { ascending: false })
      .limit(3);

    const mapped = (data || []).map((t) => ({
      ...t,
      compagnie: t?.compagnies?.nom,
    }));
    setTrajetsPopulaires(mapped);
  };

  const loadCompagnies = async () => {
    const { data } = await supabase
      .from("compagnies")
      .select("id, nom, logo_url, trajets(note, nb_avis)")
      .order("nom", { ascending: true })
      .limit(10);

    const compagniesAvecNote = (data || []).map((compagnie) => {
      const trajets = compagnie.trajets || [];
      let totalNote = 0;
      let totalAvis = 0;

      trajets.forEach((trajet) => {
        if (trajet.note && trajet.nb_avis) {
          totalNote += trajet.note * trajet.nb_avis;
          totalAvis += trajet.nb_avis;
        }
      });

      const noteMoyenne =
        totalAvis > 0 ? (totalNote / totalAvis).toFixed(1) : null;

      return {
        id: compagnie.id,
        nom: compagnie.nom,
        logo_url: compagnie.logo_url,
        note: noteMoyenne,
      };
    });

    const sorted = compagniesAvecNote
      .filter((c) => c.note !== null)
      .sort((a, b) => parseFloat(b.note) - parseFloat(a.note))
      .slice(0, 5);

    if (sorted.length < 5) {
      const notRated = compagniesAvecNote
        .filter((c) => c.note === null)
        .slice(0, 5 - sorted.length);
      sorted.push(...notRated);
    }

    setCompagnies(sorted);
  };

  const loadOffresSpeciales = async () => {
    const { data } = await supabase
      .from("trajets")
      .select("id, depart, arrivee, prix, note, compagnies:compagnie_id(nom)")
      .order("prix", { ascending: true })
      .limit(3);

    const mapped = (data || []).map((t) => ({
      ...t,
      compagnie: t?.compagnies?.nom,
    }));
    setOffresSpeciales(mapped);
  };

  const loadFavorites = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("favoris")
      .select("trajet_id")
      .eq("user_id", session.user.id);
    setFavorites(new Set((data || []).map((r) => r.trajet_id)));
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (depart) params.set("depart", depart);
    if (arrivee) params.set("arrivee", arrivee);
    navigate(`/trajets${params.toString() ? "?" + params.toString() : ""}`);
  };

  const scrollDestinations = (direction) => {
    const container = document.getElementById("destinations-container");
    if (!container) return;

    const scrollAmount = 300;
    const newPosition =
      direction === "left"
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(
            container.scrollWidth - container.clientWidth,
            scrollPosition + scrollAmount
          );

    container.scrollTo({
      left: newPosition,
      behavior: "smooth",
    });
    setScrollPosition(newPosition);
  };

  const scrollCompanies = (direction) => {
    const container = document.getElementById("companies-container");
    if (!container) return;

    const scrollAmount = 300;
    const newPosition =
      direction === "left"
        ? Math.max(0, companiesScrollPosition - scrollAmount)
        : Math.min(
            container.scrollWidth - container.clientWidth,
            companiesScrollPosition + scrollAmount
          );

    container.scrollTo({
      left: newPosition,
      behavior: "smooth",
    });
    setCompaniesScrollPosition(newPosition);
  };

  // Fonctions de filtrage
  const filterTrajets = (trajets) => {
    return trajets.filter((trajet) => {
      const respectePrix = trajet.prix >= prixMin && trajet.prix <= prixMax;
      const respecteNote = !trajet.note || trajet.note >= noteMin;
      const respecteCompagnie =
        !compagnieSelectionnee || trajet.compagnie === compagnieSelectionnee;
      return respectePrix && respecteNote && respecteCompagnie;
    });
  };

  const resetFilters = () => {
    setPrixMin(0);
    setPrixMax(100000);
    setNoteMin(0);
    setCompagnieSelectionnee("");
  };

  // Données filtrées
  const trajetsPopulairesFiltered = filterTrajets(trajetsPopulaires);
  const offresSpecialesFiltered = filterTrajets(offresSpeciales);

  // Obtenir la liste unique des compagnies pour le filtre
  const compagniesListe = [
    ...new Set(
      [...trajetsPopulaires, ...offresSpeciales]
        .map((t) => t.compagnie)
        .filter(Boolean)
    ),
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      {/* Hero Section avec image de couverture */}
      <div className="relative mb-12 overflow-hidden">
        {/* Image de fond */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-bg.png"
            alt="Bus travel background"
            className="w-full h-full object-cover"
          />
          {/* Overlay gradient pour améliorer la lisibilité */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-yellow-600/30 to-blue-800/50"></div>
          {/* Motif décoratif subtil */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>
        </div>

        {/* Contenu Hero */}
        <div className="relative z-10 py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              {/* Badge animé */}
              <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6 animate-pulse">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                Réservation en ligne disponible 24h/24
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
                Bus Bénin
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto mb-8 drop-shadow">
                Trouvez et réservez facilement vos trajets en bus à travers le
                Bénin
              </p>

              {/* Stats rapides */}
              <div className="flex flex-wrap justify-center gap-6 mb-10">
                <div className="flex items-center space-x-2 text-white/90">
                  <span className="text-2xl font-bold">50+</span>
                  <span className="text-sm">Destinations</span>
                </div>
                <div className="w-px h-8 bg-white/30 hidden sm:block"></div>
                <div className="flex items-center space-x-2 text-white/90">
                  <span className="text-2xl font-bold">10+</span>
                  <span className="text-sm">Compagnies</span>
                </div>
                <div className="w-px h-8 bg-white/30 hidden sm:block"></div>
                <div className="flex items-center space-x-2 text-white/90">
                  <span className="text-2xl font-bold">1000+</span>
                  <span className="text-sm">Voyageurs</span>
                </div>
              </div>

              {/* Search Card */}
              <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 transform hover:scale-[1.01] transition-transform duration-300">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-lg">
                    <Search className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Rechercher un trajet
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Départ
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary" />
                      <input
                        type="text"
                        value={depart}
                        onChange={(e) => setDepart(e.target.value)}
                        placeholder="Ville de départ"
                        className="text-gray-700 input-field pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Arrivée
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary" />
                      <input
                        id="arrivee"
                        type="text"
                        value={arrivee}
                        onChange={(e) => setArrivee(e.target.value)}
                        placeholder="Ville d'arrivée"
                        className="text-gray-700 input-field pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSearch}
                  className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Search className="h-5 w-5" />
                  <span>Rechercher des trajets</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vague décorative en bas */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
          >
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              className="fill-gray-50 dark:fill-gray-900"
            />
          </svg>
        </div>
      </div>

      {/* Destinations populaires */}
      <section className="page-container">
        <div className="flex items-center space-x-3 mb-6">
          {/* <div className="p-2 bg-secondary-light rounded-lg">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div> */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Destinations populaires
          </h2>
        </div>
        <div className="relative group">
          {/* Flèche gauche - cachée sur mobile */}
          <button
            onClick={() => scrollDestinations("left")}
            className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Défiler à gauche"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Container des destinations */}
          <div
            id="destinations-container"
            className="flex overflow-x-auto gap-3 pb-4 scroll-smooth scrollbar-hide touch-pan-x"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {destinations.map((dest) => (
              <button
                key={dest.id}
                onClick={() => {
                  if (!depart) {
                    setDepart(dest.nom);
                  } else if (!arrivee && dest.nom !== depart) {
                    setArrivee(dest.nom);
                  }
                }}
                className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-full font-semibold whitespace-nowrap transition-all ${
                  depart === dest.nom || arrivee === dest.nom
                    ? "bg-primary text-white"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                } border-2 ${
                  depart === dest.nom || arrivee === dest.nom
                    ? "border-primary"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {dest.nom}
              </button>
            ))}
          </div>

          {/* Flèche droite - cachée sur mobile */}
          <button
            onClick={() => scrollDestinations("right")}
            className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Défiler à droite"
          >
            <ChevronRight className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </section>

      {/* Section Filtres */}
      <section className="page-container">
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 mb-6">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowFilters(!showFilters)}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-light rounded-lg">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Filtres avancés
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              {(prixMin > 0 ||
                prixMax < 100000 ||
                noteMin > 0 ||
                compagnieSelectionnee) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetFilters();
                  }}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium hover:bg-red-200 transition-colors"
                >
                  Réinitialiser
                </button>
              )}
              <ChevronRight
                className={`h-5 w-5 text-gray-500 transition-transform ${
                  showFilters ? "rotate-90" : ""
                }`}
              />
            </div>
          </div>

          {showFilters && (
            <div className="mt-6 grid md:grid-cols-3 gap-6">
              {/* Filtre Prix */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Fourchette de prix (FCFA)
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      value={prixMin}
                      onChange={(e) => setPrixMin(Number(e.target.value))}
                      placeholder="Min"
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <span className="text-gray-500 text-sm">à</span>
                    <input
                      type="number"
                      value={prixMax}
                      onChange={(e) => setPrixMax(Number(e.target.value))}
                      placeholder="Max"
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Sliders className="h-4 w-4" />
                    <span>
                      {prixMin.toLocaleString()} - {prixMax.toLocaleString()}{" "}
                      FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Filtre Note */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Note minimale
                </label>
                <div className="flex items-center space-x-2">
                  {[0, 1, 2, 3, 4, 5].map((note) => (
                    <button
                      key={note}
                      onClick={() => setNoteMin(note)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                        noteMin === note
                          ? "bg-primary text-white"
                          : "bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500"
                      }`}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          noteMin === note ? "fill-current" : ""
                        }`}
                      />
                      <span>{note}+</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtre Compagnie */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Compagnie
                </label>
                <select
                  value={compagnieSelectionnee}
                  onChange={(e) => setCompagnieSelectionnee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">Toutes les compagnies</option>
                  {compagniesListe.map((compagnie) => (
                    <option key={compagnie} value={compagnie}>
                      {compagnie}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Trajets populaires */}
      <section className="page-container">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {/* <div className="p-2 bg-warning-light rounded-lg">
              <Star className="h-6 w-6 text-warning fill-warning" />
            </div> */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Trajets populaires
            </h2>
          </div>
          <span className="px-4 py-1.5 bg-primary-light text-primary rounded-full text-sm font-semibold">
            {trajetsPopulairesFiltered.length} résultat
            {trajetsPopulairesFiltered.length !== 1 ? "s" : ""}
          </span>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : trajetsPopulairesFiltered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trajetsPopulairesFiltered.map((trajet) => (
              <TrajetCard
                key={trajet.id}
                trajet={trajet}
                isFavorite={favorites.has(trajet.id)}
                onFavoriteToggle={loadFavorites}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <Search className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Aucun trajet trouvé
              </h3>
              <p className="text-gray-500 dark:text-gray-500 text-center max-w-md">
                Aucun trajet ne correspond à vos critères de filtrage. Essayez
                de modifier les filtres.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Compagnies recommandées */}
      <section className="page-container">
        <div className="flex items-center space-x-3 mb-6">
          {/* <div className="p-2 bg-secondary-light rounded-lg">
            <Award className="h-6 w-6 text-primary" />
          </div> */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Compagnies recommandées
          </h2>
        </div>
        <div className="relative group">
          {/* Flèche gauche - cachée sur mobile */}
          <button
            onClick={() => scrollCompanies("left")}
            className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Défiler à gauche"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Container des compagnies */}
          <div
            id="companies-container"
            className="flex overflow-x-auto gap-4 pb-4 scroll-smooth scrollbar-hide touch-pan-x"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {compagnies.map((compagnie) => (
              <button
                key={compagnie.id}
                onClick={() => navigate(`/trajets?compagnie=${compagnie.nom}`)}
                className="card hover:shadow-lg transition-shadow text-center flex-shrink-0 w-36 sm:w-40"
              >
                <div className="w-16 h-16 mx-auto mb-3 bg-primary-light rounded-xl flex items-center justify-center overflow-hidden">
                  {compagnie.logo_url ? (
                    <img
                      src={compagnie.logo_url}
                      alt={compagnie.nom}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-primary" />
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-2 truncate">
                  {compagnie.nom}
                </h3>
                {compagnie.note && (
                  <div className="flex items-center justify-center space-x-1">
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {compagnie.note}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Flèche droite - cachée sur mobile */}
          <button
            onClick={() => scrollCompanies("right")}
            className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Défiler à droite"
          >
            <ChevronRight className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </section>

      {/* Section Wallet (uniquement si connecté) */}
      {session && (
        <section className="page-container">
          <div className="flex items-center space-x-3 mb-6">
            {/* <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div> */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Mon Portefeuille
            </h2>
          </div>
          <div
            onClick={() => navigate("/wallet")}
            className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 hover:shadow-xl transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Solde disponible
                </p>
                {loadingWallet ? (
                  <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                ) : (
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {walletBalance.toLocaleString("fr-FR")} FCFA
                  </p>
                )}
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-800 rounded-full">
                <DollarSign className="h-8 w-8 text-green-600 dark:text-green-300" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-700 dark:text-green-400 font-medium">
              <span>Voir les détails</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </section>
      )}

      {/* Section Véhicules en location */}
      <section className="page-container">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {/* <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Car className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div> */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Véhicules en location
            </h2>
          </div>
          <button
            onClick={() => navigate("/location")}
            className="text-primary hover:text-primary/80 font-semibold text-sm flex items-center gap-1"
          >
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {loadingVehicules ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : vehiculesLocation.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehiculesLocation.map((vehicule) => (
              <div
                key={vehicule.id}
                onClick={() => navigate(`/location/reserver/${vehicule.id}`)}
                className="card hover:shadow-xl transition-all cursor-pointer"
              >
                {vehicule.photo_url && (
                  <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 overflow-hidden">
                    <img
                      src={vehicule.photo_url}
                      alt={`${vehicule.marque} ${vehicule.modele}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {vehicule.marque} {vehicule.modele}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Année: {vehicule.annee}
                  </p>
                  {vehicule.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {vehicule.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-primary">
                      {vehicule.prix_par_jour.toLocaleString("fr-FR")}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      FCFA/jour
                    </span>
                  </div>
                  <button className="btn-primary">Réserver</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <Car className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Aucun véhicule disponible
              </h3>
              <p className="text-gray-500 dark:text-gray-500 text-center max-w-md mb-4">
                Aucun véhicule n'est actuellement disponible à la location.
              </p>
              {session && (
                <button
                  onClick={() => navigate("/location/ajouter")}
                  className="btn-primary"
                >
                  Proposer un véhicule
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Offres spéciales */}
      <section className="page-container pb-16">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {/* <div className="p-2 bg-success-light rounded-lg">
              <Tag className="h-6 w-6 text-success" />
            </div> */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Offres spéciales
            </h2>
          </div>
          <span className="px-4 py-1.5 bg-success-light text-success rounded-full text-sm font-semibold">
            Prix bas
          </span>
        </div>
        {offresSpecialesFiltered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offresSpecialesFiltered.map((offre) => (
              <div key={offre.id} className="relative">
                <div className="absolute -top-2 -right-2 z-10 bg-success text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  PROMO
                </div>
                <div className="card border-2 border-success hover:shadow-xl transition-shadow">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {offre.depart} → {offre.arrivee}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {offre.compagnie}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-warning fill-warning" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {offre.note || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xl sm:text-2xl font-bold text-success">
                        {offre.prix}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                        FCFA
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/trajet/${offre.id}`)}
                      className="btn-primary"
                    >
                      Voir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <Tag className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Aucune offre spéciale trouvée
              </h3>
              <p className="text-gray-500 dark:text-gray-500 text-center max-w-md">
                Aucune offre spéciale ne correspond à vos critères. Essayez de
                modifier les filtres.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
