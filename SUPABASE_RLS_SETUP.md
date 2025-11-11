# Configuration des politiques RLS pour la gestion des réservations

## 🎯 Objectif

Permettre aux **admins** et aux **compagnies** de voir et gérer les réservations via l'application mobile.

## 📋 Étapes d'installation

### 1. Se connecter à Supabase Dashboard

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet **BusBenin**
3. Cliquez sur **SQL Editor** dans le menu de gauche

### 2. Exécuter le script SQL

Copiez et collez le contenu du fichier `supabase_migrations/admin_reservations_policies.sql` dans l'éditeur SQL et exécutez-le.

Ou copiez directement ce code :

```sql
-- Politique RLS pour permettre aux admins de voir toutes les réservations
CREATE POLICY "Admins can view all reservations"
ON public.reservations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.admin = true
  )
);

-- Politique RLS pour permettre aux compagnies de voir leurs réservations
CREATE POLICY "Companies can view their reservations"
ON public.reservations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.trajets t ON t.compagnie_id = p.compagnie_id
    WHERE p.id = auth.uid()
    AND p.admin = false
    AND p.compagnie_id IS NOT NULL
    AND t.id = reservations.trajet_id
  )
);

-- Politique pour permettre aux admins de mettre à jour toutes les réservations
CREATE POLICY "Admins can update all reservations"
ON public.reservations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.admin = true
  )
);

-- Politique pour permettre aux compagnies de mettre à jour leurs réservations
CREATE POLICY "Companies can update their reservations"
ON public.reservations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.trajets t ON t.compagnie_id = p.compagnie_id
    WHERE p.id = auth.uid()
    AND p.admin = false
    AND p.compagnie_id IS NOT NULL
    AND t.id = reservations.trajet_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.trajets t ON t.compagnie_id = p.compagnie_id
    WHERE p.id = auth.uid()
    AND p.admin = false
    AND p.compagnie_id IS NOT NULL
    AND t.id = reservations.trajet_id
  )
);
```

### 3. Vérifier l'installation

Après avoir exécuté le script, vérifiez que les politiques ont été créées :

```sql
SELECT * FROM pg_policies WHERE tablename = 'reservations';
```

Vous devriez voir 6 politiques au total :
- ✅ Users can view their own reservations
- ✅ Users can create reservations
- ✅ Users can update their own reservations
- ✅ **Admins can view all reservations** (nouvelle)
- ✅ **Companies can view their reservations** (nouvelle)
- ✅ **Admins can update all reservations** (nouvelle)
- ✅ **Companies can update their reservations** (nouvelle)

## 🔐 Fonctionnement des politiques

### Pour les utilisateurs normaux
- ✅ Peuvent voir **uniquement** leurs propres réservations
- ✅ Peuvent créer leurs réservations
- ✅ Peuvent mettre à jour leurs réservations

### Pour les admins
- ✅ Peuvent voir **toutes** les réservations
- ✅ Peuvent mettre à jour **toutes** les réservations
- ✅ Accès complet pour la gestion

### Pour les compagnies
- ✅ Peuvent voir les réservations **de leurs trajets uniquement**
- ✅ Peuvent mettre à jour les réservations **de leurs trajets**
- ✅ Pas d'accès aux réservations des autres compagnies

## 🧪 Test des politiques

### Test 1 : Admin voit toutes les réservations

```sql
-- Se connecter en tant qu'admin
SELECT * FROM reservations;
-- Devrait retourner TOUTES les réservations
```

### Test 2 : Compagnie voit ses réservations

```sql
-- Se connecter en tant que compagnie
SELECT r.* 
FROM reservations r
INNER JOIN trajets t ON t.id = r.trajet_id
WHERE t.compagnie_id = (
  SELECT compagnie_id FROM users WHERE id = auth.uid()
);
-- Devrait retourner uniquement les réservations de la compagnie
```

### Test 3 : Utilisateur normal voit ses réservations

```sql
-- Se connecter en tant qu'utilisateur
SELECT * FROM reservations WHERE user_id = auth.uid();
-- Devrait retourner uniquement ses propres réservations
```

## ⚠️ Dépannage

### Erreur : "relation public.users does not exist"
- La table s'appelle `profiles`, pas `users`
- Vérifiez que vous utilisez le script SQL corrigé avec `public.profiles`

### Erreur : "Could not find a relationship"
- Vérifiez que la table `profiles` existe avec les colonnes `admin` (boolean) et `compagnie_id` (UUID)
- Vérifiez que la table `trajets` a une colonne `compagnie_id`

### Erreur : "Permission denied"
- Vérifiez que RLS est activé : `ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;`
- Vérifiez que l'utilisateur a bien un rôle défini dans la table `users`

### Les politiques ne s'appliquent pas
- Supprimez les anciennes politiques en conflit :
```sql
DROP POLICY IF EXISTS "Admins can view all reservations" ON reservations;
DROP POLICY IF EXISTS "Companies can view their reservations" ON reservations;
```
- Recréez-les avec le script ci-dessus

## 📱 Utilisation dans l'app

Une fois les politiques en place, l'application pourra :

1. **Admins** : Accéder à `/admin/manage-reservations` et voir toutes les réservations
2. **Compagnies** : Accéder à `/admin/manage-reservations` et voir leurs réservations
3. **Utilisateurs** : Accéder à `/mes-reservations` et voir leurs propres réservations

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2025
