import { supabase } from "./supabase";

/**
 * Vérifie si un véhicule est disponible pour une période donnée
 * @param {string} vehiculeId - ID du véhicule
 * @param {string} dateDebut - Date de début (format YYYY-MM-DD)
 * @param {string} dateFin - Date de fin (format YYYY-MM-DD)
 * @returns {Promise<{available: boolean, conflictingReservations: Array}>}
 */
export async function checkVehiculeDisponibilite(
  vehiculeId,
  dateDebut,
  dateFin
) {
  try {
    // Vérifier les réservations qui chevauchent la période demandée
    const { data: reservations, error } = await supabase
      .from("reservations_location")
      .select(
        "id, date_debut, date_fin, statut, statut_paiement, nom_locataire"
      )
      .eq("vehicule_id", vehiculeId)
      .in("statut", ["confirmee", "en_attente"])
      .in("statut_paiement", ["approved"])
      .gte("date_fin", dateDebut) // Réservations qui finissent après la date de début demandée
      .lte("date_debut", dateFin); // Réservations qui commencent avant la date de fin demandée

    if (error) {
      console.error("Erreur vérification disponibilité:", error);
      return {
        available: false,
        conflictingReservations: [],
        error: error.message,
      };
    }

    // Si des réservations existent, le véhicule n'est pas disponible
    const available = !reservations || reservations.length === 0;

    return {
      available,
      conflictingReservations: reservations || [],
      message: available
        ? "Véhicule disponible pour cette période"
        : `Véhicule déjà réservé pour ${reservations.length} période(s)`,
    };
  } catch (error) {
    console.error("Exception vérification disponibilité:", error);
    return {
      available: false,
      conflictingReservations: [],
      error: error.message,
    };
  }
}

/**
 * Récupère toutes les dates réservées d'un véhicule
 * @param {string} vehiculeId - ID du véhicule
 * @returns {Promise<Array>} Liste des périodes réservées
 */
export async function getDatesReservees(vehiculeId) {
  try {
    const { data, error } = await supabase
      .from("reservations_location")
      .select("id, date_debut, date_fin, statut, statut_paiement")
      .eq("vehicule_id", vehiculeId)
      .in("statut", ["confirmee", "en_attente"])
      .in("statut_paiement", ["approved"])
      .gte("date_fin", new Date().toISOString().split("T")[0])
      .order("date_debut", { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Erreur récupération dates réservées:", error);
    return [];
  }
}

/**
 * Filtre les véhicules disponibles pour une période donnée
 * @param {Array} vehicules - Liste des véhicules
 * @param {string} dateDebut - Date de début
 * @param {string} dateFin - Date de fin
 * @returns {Promise<Array>} Véhicules disponibles
 */
export async function filterVehiculesDisponibles(
  vehicules,
  dateDebut,
  dateFin
) {
  if (!dateDebut || !dateFin || !vehicules || vehicules.length === 0) {
    return vehicules;
  }

  const disponibilites = await Promise.all(
    vehicules.map(async (vehicule) => {
      const result = await checkVehiculeDisponibilite(
        vehicule.id,
        dateDebut,
        dateFin
      );
      return {
        ...vehicule,
        disponible: result.available,
        conflictingReservations: result.conflictingReservations,
      };
    })
  );

  return disponibilites;
}

/**
 * Vérifie si deux périodes se chevauchent
 * @param {string} debut1 - Date de début période 1
 * @param {string} fin1 - Date de fin période 1
 * @param {string} debut2 - Date de début période 2
 * @param {string} fin2 - Date de fin période 2
 * @returns {boolean} True si les périodes se chevauchent
 */
export function periodesSeRecoupent(debut1, fin1, debut2, fin2) {
  return debut1 <= fin2 && fin1 >= debut2;
}

/**
 * Obtient les dates bloquées pour un calendrier (pour désactiver les dates indisponibles)
 * @param {string} vehiculeId - ID du véhicule
 * @returns {Promise<Array<string>>} Liste des dates au format YYYY-MM-DD
 */
export async function getDatesBloquees(vehiculeId) {
  const reservations = await getDatesReservees(vehiculeId);
  const datesBloquees = [];

  reservations.forEach((reservation) => {
    const debut = new Date(reservation.date_debut);
    const fin = new Date(reservation.date_fin);

    // Générer toutes les dates entre début et fin
    for (let d = new Date(debut); d <= fin; d.setDate(d.getDate() + 1)) {
      datesBloquees.push(d.toISOString().split("T")[0]);
    }
  });

  return [...new Set(datesBloquees)]; // Retirer les doublons
}
