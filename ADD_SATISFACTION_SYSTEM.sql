-- Script SQL pour ajouter le système de satisfaction client aux locations

-- 1. Ajouter les colonnes de validation de livraison à reservations_location
ALTER TABLE public.reservations_location
ADD COLUMN IF NOT EXISTS livraison_validee BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS livraison_validee_at TIMESTAMP WITH TIME ZONE;

-- 2. Créer la table des avis pour les locations de véhicules
CREATE TABLE IF NOT EXISTS public.avis_location (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  vehicule_id UUID NOT NULL,
  note INTEGER NOT NULL CHECK (note >= 1 AND note <= 5),
  commentaire TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT avis_location_pkey PRIMARY KEY (id),
  CONSTRAINT avis_location_reservation_id_fkey FOREIGN KEY (reservation_id) 
    REFERENCES public.reservations_location(id) ON DELETE CASCADE,
  CONSTRAINT avis_location_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT avis_location_vehicule_id_fkey FOREIGN KEY (vehicule_id) 
    REFERENCES public.vehicules_location(id) ON DELETE CASCADE,
  CONSTRAINT avis_location_reservation_unique UNIQUE (reservation_id)
);

-- 3. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_avis_location_vehicule_id ON public.avis_location(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_avis_location_user_id ON public.avis_location(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_location_livraison_validee 
  ON public.reservations_location(livraison_validee) WHERE livraison_validee = TRUE;

-- 4. Activer RLS (Row Level Security) sur la table avis_location
ALTER TABLE public.avis_location ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir tous les avis
CREATE POLICY "Tout le monde peut voir les avis de location"
  ON public.avis_location FOR SELECT
  USING (true);

-- Politique pour permettre aux utilisateurs de créer un avis pour leur propre réservation
CREATE POLICY "Les utilisateurs peuvent créer un avis pour leur réservation"
  ON public.avis_location FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de mettre à jour leur propre avis
CREATE POLICY "Les utilisateurs peuvent modifier leur propre avis"
  ON public.avis_location FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Commenter les tables et colonnes pour la documentation
COMMENT ON TABLE public.avis_location IS 'Avis et notes des clients sur les locations de véhicules';
COMMENT ON COLUMN public.avis_location.note IS 'Note de 1 à 5 étoiles';
COMMENT ON COLUMN public.avis_location.commentaire IS 'Commentaire optionnel du client';
COMMENT ON COLUMN public.reservations_location.livraison_validee IS 'Indique si le client a validé la livraison effective du véhicule';
COMMENT ON COLUMN public.reservations_location.livraison_validee_at IS 'Date et heure de validation de la livraison par le client';
