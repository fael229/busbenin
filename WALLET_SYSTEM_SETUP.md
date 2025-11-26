# Configuration du Système de Portefeuille

Pour que le système de portefeuille fonctionne correctement, vous devez exécuter les scripts SQL suivants dans l'éditeur SQL de votre projet Supabase.

## Étape 1 : Corriger et mettre à jour la table profiles

⚠️ **IMPORTANT** : Exécutez ce script en premier pour corriger les problèmes d'inscription des utilisateurs.

```sql
-- Ajouter la colonne phone si elle n'existe pas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Créer un index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Corriger la colonne username pour accepter les UUID convertis en texte
ALTER TABLE public.profiles ALTER COLUMN username SET DEFAULT gen_random_uuid()::text;

-- Ou si vous préférez un format plus lisible pour le username, utilisez ceci à la place :
-- ALTER TABLE public.profiles ALTER COLUMN username SET DEFAULT 'user_' || substr(gen_random_uuid()::text, 1, 8);
```

## Étape 2 : Créer le trigger de création automatique de profil

⚠️ **IMPORTANT** : Ce trigger crée automatiquement un profil dans `profiles` quand un utilisateur s'inscrit.

```sql
-- Supprimer l'ancien trigger et la fonction s'ils existent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Créer la fonction de trigger avec gestion des doublons
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Ignorer si le profil existe déjà (évite les erreurs de duplication)
    RETURN new;
END;
$$;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Étape 3 : Créer la table des demandes de retrait

```sql
-- Création de la table des demandes de retrait
CREATE TABLE IF NOT EXISTS public.demandes_retrait (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  montant numeric not null,
  statut text check (statut in ('en_attente', 'validee', 'refusee')) default 'en_attente',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activer RLS (Row Level Security)
ALTER TABLE public.demandes_retrait ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres demandes" ON public.demandes_retrait;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer une demande" ON public.demandes_retrait;
DROP POLICY IF EXISTS "Les admins peuvent tout voir" ON public.demandes_retrait;

-- Politique pour permettre aux utilisateurs de voir leurs propres demandes
CREATE POLICY "Les utilisateurs peuvent voir leurs propres demandes"
  ON public.demandes_retrait FOR SELECT
  USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de créer une demande
CREATE POLICY "Les utilisateurs peuvent créer une demande"
  ON public.demandes_retrait FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre aux admins de tout voir
CREATE POLICY "Les admins peuvent tout voir"
  ON public.demandes_retrait FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.admin = true
    )
  );
```

## Étape 4 : Vérification

Après avoir exécuté ces scripts, testez l'inscription d'un nouvel utilisateur :

1. Essayez de créer un nouveau compte
2. Vérifiez dans la table `profiles` que le profil a été créé automatiquement
3. Vérifiez que la colonne `phone` est bien présente et accepte les valeurs NULL

Si vous rencontrez toujours des erreurs, vérifiez les logs de Supabase pour voir le message d'erreur exact.
