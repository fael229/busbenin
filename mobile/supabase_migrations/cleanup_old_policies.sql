-- Script pour supprimer les anciennes politiques RLS qui pourraient causer des conflits
-- Exécutez ce script AVANT d'exécuter admin_reservations_policies.sql

-- Supprimer les politiques admin/compagnie si elles existent déjà
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Companies can view their reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can update all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Companies can update their reservations" ON public.reservations;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Anciennes politiques supprimées avec succès. Vous pouvez maintenant exécuter admin_reservations_policies.sql';
END $$;
