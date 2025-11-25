-- Ce script modifie les clés étrangères pour pointer vers la table public.profiles
-- au lieu de auth.users, ce qui permet à PostgREST (Supabase API) de détecter
-- automatiquement les relations pour les jointures (ex: récupérer le nom du propriétaire).

BEGIN;

-- 1. Correction pour vehicules_location
ALTER TABLE public.vehicules_location
DROP CONSTRAINT IF EXISTS vehicules_location_user_id_fkey;

ALTER TABLE public.vehicules_location
ADD CONSTRAINT vehicules_location_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 2. Correction pour reservations_location
ALTER TABLE public.reservations_location
DROP CONSTRAINT IF EXISTS reservations_location_user_id_fkey;

ALTER TABLE public.reservations_location
ADD CONSTRAINT reservations_location_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

COMMIT;
