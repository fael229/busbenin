-- ==============================================================================
-- Script pour définir un utilisateur comme administrateur et vérifier les accès
-- ==============================================================================

-- 1. Ajouter la colonne 'role' à la table profiles si elle n'existe pas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN 
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user'; 
    END IF; 
END $$;

-- 2. Mettre à jour le rôle d'un utilisateur spécifique (REMPLACEZ L'EMAIL CI-DESSOUS)
-- Remplacez 'votre_email@example.com' par l'email avec lequel vous vous connectez.

UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'votre_email@example.com' -- <--- METTEZ VOTRE EMAIL ICI
);

-- 2. Vérifier que la mise à jour a fonctionné
SELECT id, full_name, email, role 
FROM public.profiles 
WHERE id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'votre_email@example.com' -- <--- METTEZ VOTRE EMAIL ICI
);

-- 3. S'assurer que les politiques RLS permettent la lecture du profil
-- (Ceci est une correction de sécurité générique pour s'assurer que les utilisateurs peuvent lire leur propre rôle)

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Politique pour permettre aux admins de tout voir (optionnel mais recommandé)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);
