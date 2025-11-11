-- Ajouter la colonne compagnie_id à la table profiles
-- Cette colonne permet d'associer un utilisateur à une compagnie

-- Ajouter la colonne si elle n'existe pas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS compagnie_id UUID REFERENCES public.compagnies(id) ON DELETE SET NULL;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_profiles_compagnie_id ON public.profiles(compagnie_id);

-- Commentaire pour documentation
COMMENT ON COLUMN public.profiles.compagnie_id IS 'ID de la compagnie associée à l''utilisateur (NULL pour admins et utilisateurs normaux)';
