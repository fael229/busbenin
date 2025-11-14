-- Mise à jour de la fonction RPC create_reservation pour inclure la date_voyage
-- Cette fonction crée une réservation avec tous les champs nécessaires

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS create_reservation(uuid, integer, text, text, text, text);

-- Créer la nouvelle fonction avec le paramètre date_voyage
CREATE OR REPLACE FUNCTION create_reservation(
  p_trajet_id uuid,
  p_nb_places integer,
  p_horaire text,
  p_date_voyage date,
  p_nom_passager text,
  p_telephone_passager text,
  p_email_passager text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation_id uuid;
  v_montant_total numeric;
  v_prix_trajet numeric;
BEGIN
  -- Vérifier que l'utilisateur est connecté
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non connecté';
  END IF;

  -- Vérifier que le trajet existe et récupérer le prix
  SELECT prix INTO v_prix_trajet 
  FROM trajets 
  WHERE id = p_trajet_id;
  
  IF v_prix_trajet IS NULL THEN
    RAISE EXCEPTION 'Trajet introuvable';
  END IF;

  -- Calculer le montant total
  v_montant_total := v_prix_trajet * p_nb_places;

  -- Calculer la date d'expiration (24h après création)
  -- Créer la réservation
  INSERT INTO reservations (
    user_id,
    trajet_id,
    nb_places,
    horaire,
    date_voyage,
    montant_total,
    nom_passager,
    telephone_passager,
    email_passager,
    statut,
    statut_paiement,
    date_expiration
  ) VALUES (
    auth.uid(),
    p_trajet_id,
    p_nb_places,
    p_horaire,
    p_date_voyage,
    v_montant_total,
    p_nom_passager,
    p_telephone_passager,
    p_email_passager,
    'en_attente',
    'pending',
    NOW() + INTERVAL '24 hours'
  ) RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

-- Donner les permissions appropriées
GRANT EXECUTE ON FUNCTION create_reservation(uuid, integer, text, date, text, text, text) TO authenticated;

-- Commentaire sur la fonction
COMMENT ON FUNCTION create_reservation IS 'Crée une nouvelle réservation avec date de voyage spécifique';
