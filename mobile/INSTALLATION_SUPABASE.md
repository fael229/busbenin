# Installation complète Supabase pour BusBenin

Guide d'installation pas à pas pour configurer toutes les tables et politiques nécessaires.

## 📋 Ordre d'exécution des scripts

**IMPORTANT** : Exécutez les scripts dans cet ordre exact !

### 1️⃣ Ajouter la colonne `compagnie_id` à `profiles`

**Fichier** : `supabase_migrations/add_compagnie_to_profiles.sql`

Ce script ajoute la colonne qui permettra d'associer un utilisateur à une compagnie.

```sql
-- Ajouter la colonne compagnie_id à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS compagnie_id UUID REFERENCES public.compagnies(id) ON DELETE SET NULL;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_profiles_compagnie_id ON public.profiles(compagnie_id);

-- Commentaire pour documentation
COMMENT ON COLUMN public.profiles.compagnie_id IS 'ID de la compagnie associée à l''utilisateur (NULL pour admins et utilisateurs normaux)';
```

**Vérification** :
```sql
-- Vérifier que la colonne existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'compagnie_id';
```

### 2️⃣ Créer les politiques RLS pour les réservations

**Fichier** : `supabase_migrations/admin_reservations_policies.sql`

Ce script permet aux admins et compagnies d'accéder aux réservations.

**⚠️ Important** : Si des politiques avec ces noms existent déjà, supprimez-les d'abord :

```sql
-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Companies can view their reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can update all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Companies can update their reservations" ON public.reservations;
```

Ensuite, exécutez le script complet.

**Vérification** :
```sql
-- Vérifier que les politiques sont créées
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'reservations';
```

Vous devriez voir 7 politiques au total :
- ✅ Users can view their own reservations
- ✅ Users can create reservations
- ✅ Users can update their own reservations
- ✅ **Admins can view all reservations** ← Nouvelle
- ✅ **Companies can view their reservations** ← Nouvelle
- ✅ **Admins can update all reservations** ← Nouvelle
- ✅ **Companies can update their reservations** ← Nouvelle

## 👤 Configuration des utilisateurs

### Créer un utilisateur admin

```sql
-- 1. Créer l'utilisateur dans auth (remplacez l'email et password)
-- Faites cela via l'interface Supabase Authentication ou le code

-- 2. Mettre à jour le profil pour le rendre admin
UPDATE public.profiles
SET admin = true
WHERE email = 'admin@busbenin.com';
```

### Créer un utilisateur compagnie

```sql
-- 1. Créer l'utilisateur dans auth

-- 2. Associer à une compagnie
UPDATE public.profiles
SET compagnie_id = (SELECT id FROM compagnies WHERE nom = 'Nom de la compagnie')
WHERE email = 'compagnie@example.com';
```

## 🧪 Tests

### Test 1 : Vérifier qu'un admin voit toutes les réservations

```sql
-- Se connecter en tant qu'admin dans l'app
-- Aller dans Admin → Gérer les réservations
-- Devrait afficher TOUTES les réservations de toutes les compagnies
```

### Test 2 : Vérifier qu'une compagnie voit ses réservations

```sql
-- Se connecter en tant que compagnie dans l'app
-- Aller dans Admin → Gérer les réservations
-- Devrait afficher UNIQUEMENT les réservations des trajets de cette compagnie
```

### Test 3 : Vérifier qu'un utilisateur normal voit ses réservations

```sql
-- Se connecter en tant qu'utilisateur normal
-- Aller dans Mes Réservations
-- Devrait afficher UNIQUEMENT ses propres réservations
```

## 🔧 Requêtes de vérification utiles

### Vérifier la structure de `profiles`

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

### Vérifier les politiques RLS

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'reservations';
```

### Vérifier les utilisateurs et leurs rôles

```sql
SELECT 
  id,
  email,
  admin,
  compagnie_id,
  (SELECT nom FROM compagnies WHERE id = profiles.compagnie_id) as compagnie_nom
FROM public.profiles
ORDER BY admin DESC, email;
```

### Compter les réservations par compagnie

```sql
SELECT 
  c.nom as compagnie,
  COUNT(r.id) as nb_reservations
FROM compagnies c
LEFT JOIN trajets t ON t.compagnie_id = c.id
LEFT JOIN reservations r ON r.trajet_id = t.id
GROUP BY c.id, c.nom
ORDER BY nb_reservations DESC;
```

## ⚠️ Dépannage

### Erreur : "relation public.users does not exist"
**Cause** : Le script utilise `public.users` au lieu de `public.profiles`  
**Solution** : Utilisez les scripts mis à jour qui utilisent `public.profiles`

### Erreur : "column p.compagnie_id does not exist"
**Cause** : La colonne `compagnie_id` n'a pas été ajoutée à `profiles`  
**Solution** : Exécutez d'abord le script `add_compagnie_to_profiles.sql`

### Erreur : "policy already exists"
**Cause** : Vous essayez de créer une politique qui existe déjà  
**Solution** : Supprimez d'abord les anciennes politiques :
```sql
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservations;
-- Répétez pour toutes les politiques
```

### Les réservations ne s'affichent pas
**Vérifications** :
1. RLS est activé : `SELECT * FROM pg_tables WHERE tablename = 'reservations';`
2. L'utilisateur a le bon rôle dans `profiles`
3. Pour les compagnies : `compagnie_id` est bien défini dans `profiles`
4. Les politiques sont créées : `SELECT * FROM pg_policies WHERE tablename = 'reservations';`

### Une compagnie voit les réservations d'autres compagnies
**Cause** : Problème avec le filtrage par `compagnie_id`  
**Vérification** :
```sql
-- Vérifier l'association compagnie-utilisateur
SELECT p.email, p.compagnie_id, c.nom
FROM profiles p
LEFT JOIN compagnies c ON c.id = p.compagnie_id
WHERE p.email = 'email@compagnie.com';

-- Vérifier les trajets de la compagnie
SELECT t.id, t.depart, t.arrivee, c.nom
FROM trajets t
JOIN compagnies c ON c.id = t.compagnie_id
WHERE t.compagnie_id = (SELECT compagnie_id FROM profiles WHERE email = 'email@compagnie.com');
```

## 📊 Structure finale attendue

### Table `profiles`
```
profiles:
  - id: UUID (PK)
  - email: TEXT
  - admin: BOOLEAN (true = admin, false = autre)
  - compagnie_id: UUID (FK → compagnies, NULL pour non-compagnies)
  - created_at: TIMESTAMP
  - updated_at: TIMESTAMP
```

### Rôles utilisateurs
- **Admin** : `admin = true`, `compagnie_id = NULL`
- **Compagnie** : `admin = false`, `compagnie_id = <UUID d'une compagnie>`
- **Utilisateur normal** : `admin = false`, `compagnie_id = NULL`

## ✅ Checklist finale

Avant de considérer l'installation terminée :

- [ ] Script `add_compagnie_to_profiles.sql` exécuté
- [ ] Colonne `compagnie_id` existe dans `profiles`
- [ ] Script `admin_reservations_policies.sql` exécuté
- [ ] 7 politiques existent sur la table `reservations`
- [ ] Au moins un utilisateur admin créé et testé
- [ ] Au moins une compagnie associée à un utilisateur et testée
- [ ] Tests effectués dans l'application mobile
- [ ] Admins voient toutes les réservations ✓
- [ ] Compagnies voient leurs réservations uniquement ✓
- [ ] Utilisateurs voient leurs réservations uniquement ✓

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2025  
**Support** : En cas de problème, vérifiez d'abord les logs Supabase et les requêtes RLS
