// Script de diagnostic pour vérifier les réservations
// À exécuter temporairement dans mes-reservations.jsx après le chargement des données

// Ajoutez ce code temporaire après la ligne 138 dans loadAllReservations :
console.log("=== DIAGNOSTIC RÉSERVATIONS ===");
console.log("Réservations de trajets:", trajetsData?.length || 0);
console.log("Réservations de location:", locationsData?.length || 0);

if (locationsData && locationsData.length > 0) {
  console.log("\n--- Détail première réservation location ---");
  const firstLocation = locationsData[0];
  console.log("ID:", firstLocation.id);
  console.log("Statut paiement:", firstLocation.statut_paiement);
  console.log("Livraison validée:", firstLocation.livraison_validee);
  console.log("Type:", typeof firstLocation.livraison_validee);
  console.log("Véhicule:", firstLocation.vehicules_location);
  console.log("Toutes les propriétés:", Object.keys(firstLocation));
}

// Vérifier si le champ existe
console.log("\n--- Vérification structure ---");
if (locationsData && locationsData.length > 0) {
  const hasLivraisonValidee = "livraison_validee" in locationsData[0];
  console.log("Le champ livraison_validee existe ?", hasLivraisonValidee);

  if (!hasLivraisonValidee) {
    console.error(
      "❌ PROBLÈME: Le champ livraison_validee n'existe pas dans la base de données!"
    );
    console.log(
      "Solution: Exécutez le script ADD_SATISFACTION_SYSTEM.sql dans Supabase"
    );
  }
}
console.log("=== FIN DIAGNOSTIC ===\n");
