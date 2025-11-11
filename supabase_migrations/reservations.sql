-- Supprimer la table si elle existe déjà (pour recréer proprement)
DROP TABLE IF EXISTS public.reservations CASCADE;

-- Table des réservations
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trajet_id UUID NOT NULL REFERENCES public.trajets(id) ON DELETE CASCADE,
  
  -- Informations de réservation
  nb_places INTEGER NOT NULL DEFAULT 1,
  horaire TEXT NOT NULL,
  montant_total DECIMAL(10,2) NOT NULL,
  
  -- Informations du passager
  nom_passager TEXT NOT NULL,
  telephone_passager TEXT NOT NULL,
  email_passager TEXT,
  
  -- Statut de la réservation
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirmee', 'annulee', 'expiree')),
  
  -- Informations de paiement FedaPay
  fedapay_transaction_id TEXT,
  fedapay_token TEXT,
  statut_paiement TEXT DEFAULT 'pending' CHECK (statut_paiement IN ('pending', 'approved', 'declined', 'canceled')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_expiration TIMESTAMP WITH TIME ZONE,
  
  -- Contrainte
  CONSTRAINT reservations_nb_places_check CHECK (nb_places > 0 AND nb_places <= 10)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_trajet_id ON public.reservations(trajet_id);
CREATE INDEX IF NOT EXISTS idx_reservations_statut ON public.reservations(statut);
CREATE INDEX IF NOT EXISTS idx_reservations_fedapay_transaction ON public.reservations(fedapay_transaction_id);

-- RLS (Row Level Security)
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leurs propres réservations
CREATE POLICY "Users can view their own reservations"
ON public.reservations FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Politique: Les utilisateurs peuvent créer leurs réservations
CREATE POLICY "Users can create reservations"
ON public.reservations FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Politique: Les utilisateurs peuvent mettre à jour leurs réservations
CREATE POLICY "Users can update their own reservations"
ON public.reservations FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION update_reservations_updated_at();

-- RPC: Créer une réservation
CREATE OR REPLACE FUNCTION create_reservation(
  p_trajet_id UUID,
  p_nb_places INTEGER,
  p_horaire TEXT,
  p_nom_passager TEXT,
  p_telephone_passager TEXT,
  p_email_passager TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_reservation_id UUID;
  v_prix DECIMAL(10,2);
  v_montant_total DECIMAL(10,2);
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  
  -- Récupérer le prix du trajet
  SELECT prix INTO v_prix FROM trajets WHERE id = p_trajet_id;
  
  IF v_prix IS NULL THEN
    RAISE EXCEPTION 'Trajet introuvable';
  END IF;
  
  -- Calculer le montant total
  v_montant_total := v_prix * p_nb_places;
  
  -- Créer la réservation
  INSERT INTO reservations (
    user_id,
    trajet_id,
    nb_places,
    horaire,
    montant_total,
    nom_passager,
    telephone_passager,
    email_passager,
    statut,
    date_expiration
  ) VALUES (
    auth.uid(),
    p_trajet_id,
    p_nb_places,
    p_horaire,
    v_montant_total,
    p_nom_passager,
    p_telephone_passager,
    p_email_passager,
    'en_attente',
    NOW() + INTERVAL '30 minutes' -- Expiration après 30 minutes
  )
  RETURNING id INTO v_reservation_id;
  
  RETURN v_reservation_id;
END;
$$;

-- RPC: Mettre à jour le statut de paiement
CREATE OR REPLACE FUNCTION update_reservation_payment(
  p_reservation_id UUID,
  p_fedapay_transaction_id TEXT,
  p_fedapay_token TEXT,
  p_statut_paiement TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier que l'utilisateur est authentifié et possède cette réservation
  IF NOT EXISTS (
    SELECT 1 FROM reservations 
    WHERE id = p_reservation_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Réservation introuvable ou accès non autorisé';
  END IF;
  
  -- Mettre à jour la réservation
  UPDATE reservations
  SET 
    fedapay_transaction_id = p_fedapay_transaction_id,
    fedapay_token = p_fedapay_token,
    statut_paiement = p_statut_paiement,
    statut = CASE 
      WHEN p_statut_paiement = 'approved' THEN 'confirmee'
      WHEN p_statut_paiement = 'declined' THEN 'annulee'
      ELSE statut
    END
  WHERE id = p_reservation_id;
  
  RETURN TRUE;
END;
$$;

-- RPC: Annuler une réservation
CREATE OR REPLACE FUNCTION cancel_reservation(p_reservation_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier que l'utilisateur possède cette réservation
  IF NOT EXISTS (
    SELECT 1 FROM reservations 
    WHERE id = p_reservation_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Réservation introuvable ou accès non autorisé';
  END IF;
  
  -- Annuler la réservation (seulement si pas encore confirmée)
  UPDATE reservations
  SET statut = 'annulee'
  WHERE id = p_reservation_id 
    AND statut != 'confirmee'
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;
