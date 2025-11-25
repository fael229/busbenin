-- ============================================
-- Fonction pour vérifier la disponibilité d'un véhicule
-- ============================================

-- Fonction qui vérifie si un véhicule est disponible pour une période donnée
-- Bloque les réservations:
--   - approved: toujours bloquées (paiement confirmé)
--   - pending: bloquées seulement si créées il y a moins de 30 minutes
CREATE OR REPLACE FUNCTION check_vehicule_disponibilite(
  p_vehicule_id UUID,
  p_date_debut DATE,
  p_date_fin DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Compter les réservations qui chevauchent la période demandée
  SELECT COUNT(*)
  INTO v_count
  FROM reservations_location
  WHERE vehicule_id = p_vehicule_id
    AND (
      -- Seules les réservations approuvées bloquent les dates
      statut_paiement = 'approved'
    )
    AND (
      -- Vérifier les chevauchements de dates
      (date_debut <= p_date_fin AND date_fin >= p_date_debut)
    );

  -- Retourner TRUE si aucune réservation ne chevauche, FALSE sinon
  RETURN v_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Vue pour obtenir la disponibilité des véhicules
-- ============================================

CREATE OR REPLACE VIEW vehicules_avec_disponibilite AS
SELECT 
  v.*,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM reservations_location r
      WHERE r.vehicule_id = v.id
        AND (
          -- Seules les réservations approuvées bloquent les dates
          r.statut_paiement = 'approved'
        )
        AND r.date_fin >= CURRENT_DATE
    ) THEN FALSE
    ELSE TRUE
  END as disponible_maintenant
FROM vehicules_location v;

-- ============================================
-- Fonction pour obtenir les dates réservées d'un véhicule
-- ============================================

CREATE OR REPLACE FUNCTION get_dates_reservees(p_vehicule_id UUID)
RETURNS TABLE (
  reservation_id UUID,
  date_debut DATE,
  date_fin DATE,
  statut TEXT,
  statut_paiement TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as reservation_id,
    reservations_location.date_debut,
    reservations_location.date_fin,
    reservations_location.statut,
    reservations_location.statut_paiement
  FROM reservations_location
  WHERE vehicule_id = p_vehicule_id
    AND (
      -- Seules les réservations approuvées sont affichées comme indisponibles
      statut_paiement = 'approved'
    )
    AND date_fin >= CURRENT_DATE
  ORDER BY date_debut;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Test des fonctions
-- ============================================

-- Tester la disponibilité (remplacez 'VOTRE_VEHICULE_ID' par un vrai ID)
-- SELECT check_vehicule_disponibilite(
--   'VOTRE_VEHICULE_ID'::UUID, 
--   '2025-11-25'::DATE, 
--   '2025-12-03'::DATE
-- );

-- Voir les dates réservées d'un véhicule
-- SELECT * FROM get_dates_reservees('VOTRE_VEHICULE_ID'::UUID);

-- Voir tous les véhicules avec leur statut de disponibilité
-- SELECT id, marque, modele, disponible_maintenant 
-- FROM vehicules_avec_disponibilite;
