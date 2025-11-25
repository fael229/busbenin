-- ==============================================================================
-- SCRIPT D'URGENCE POUR RÉTABLIR L'AFFICHAGE DES DONNÉES
-- ==============================================================================

-- Ce script rétablit des permissions de lecture larges pour s'assurer que les données s'affichent.

-- 1. PROFILES : Autoriser tout le monde à lire les profils (nécessaire pour afficher les noms)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles; -- On remplace celle-ci qui est trop restrictive
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Permettre aux utilisateurs de modifier LEUR propre profil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. VEHICULES : Autoriser tout le monde à voir les véhicules
ALTER TABLE public.vehicules_location ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vehicles are viewable by everyone" ON public.vehicules_location;
CREATE POLICY "Vehicles are viewable by everyone" 
ON public.vehicules_location FOR SELECT 
USING (true);

-- 3. RESERVATIONS : Autoriser les utilisateurs authentifiés à voir les réservations
-- (On pourra restreindre plus tard, mais pour l'instant on veut que ça marche)
ALTER TABLE public.reservations_location ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view reservations" ON public.reservations_location;
CREATE POLICY "Authenticated users can view reservations" 
ON public.reservations_location FOR SELECT 
USING (auth.role() = 'authenticated');

-- 4. Vérification : Si vous êtes admin, assurez-vous que votre rôle est bien défini
-- (Remplacez l'email si nécessaire, sinon ça ne fera rien)
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (SELECT id FROM auth.users WHERE email = 'votre_email@example.com');
