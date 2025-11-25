-- Ajout des colonnes manquantes pour harmoniser avec le processus de réservation de trajets
ALTER TABLE public.reservations_location 
ADD COLUMN IF NOT EXISTS nom_locataire TEXT,
ADD COLUMN IF NOT EXISTS telephone_locataire TEXT,
ADD COLUMN IF NOT EXISTS email_locataire TEXT,
ADD COLUMN IF NOT EXISTS statut_paiement TEXT DEFAULT 'pending';

-- Mise à jour des politiques RLS si nécessaire (déjà existantes mais on s'assure que l'update fonctionne)
-- Les utilisateurs peuvent voir leurs propres réservations (déjà fait)
-- Les propriétaires peuvent voir les réservations de leurs véhicules (déjà fait)
