# Guide de Débogage - Inscription Utilisateur

## Problème : "Database error saving new user"

### ✅ Solutions appliquées

1. **Correction du nom de colonne** dans `register.tsx`

   - Changé `nom` → `full_name` (ligne 111)
   - Changé métadonnées `nom` → `full_name` (ligne 94)

2. **Suppression de l'insertion manuelle** dans `register.tsx`

   - Le trigger Supabase crée automatiquement le profil
   - Évite les conflits de clés primaires

3. **Trigger avec gestion d'erreurs**
   - Ajout d'un bloc `EXCEPTION` pour ignorer les doublons
   - Empêche les erreurs si le profil existe déjà

### 📋 À faire maintenant

**1. Exécuter le script SQL dans Supabase** (Étape 2 de WALLET_SYSTEM_SETUP.md) :

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
    RETURN new;
END;
$$;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**2. Tester l'inscription** :

- Créez un nouveau compte test
- L'inscription devrait fonctionner sans erreur
- Le profil sera créé automatiquement par le trigger

### 🔍 Vérification

Après l'inscription, allez dans Supabase :

1. **Table `auth.users`** → Vérifier que l'utilisateur existe
2. **Table `public.profiles`** → Vérifier que le profil a été créé automatiquement
3. **Colonnes à vérifier** :
   - `id` (même que auth.users)
   - `email`
   - `full_name` (depuis les métadonnées ou email par défaut)
   - `phone` (NULL au début)

### ⚠️ Si l'erreur persiste

Vérifiez les logs Supabase pour le message d'erreur exact :

1. Dashboard Supabase → Database → Logs
2. Cherchez les erreurs autour du moment de l'inscription
3. Partagez le message d'erreur exact pour diagnostic

### 📝 Notes importantes

- Le trigger s'exécute **automatiquement** après chaque inscription
- Le code mobile n'a plus besoin de créer le profil manuellement
- La colonne `phone` sera ajoutée plus tard (modal avant première annonce)
- Le `username` est généré automatiquement par la base de données
