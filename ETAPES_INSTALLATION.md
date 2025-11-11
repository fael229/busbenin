# 📋 Étapes d'installation - Gestion des réservations

Guide rapide pour terminer l'installation de la fonctionnalité de gestion des réservations.

## ✅ Ce qui a été fait (Côté code)

### 1. **Corrections du code**
- ✅ Corrigé les imports Supabase (`config/supabase` → `utils/supabase`)
- ✅ Corrigé la table de référence (`users` → `profiles`)
- ✅ Corrigé les noms de colonnes (`nombre_places` → `nb_places`, `horaire_depart` → `horaire`)
- ✅ Corrigé les vérifications de rôle (`role === 'admin'` → `admin === true`)

### 2. **Fichiers créés**
- ✅ `/admin/manage-reservations.jsx` - Interface de gestion
- ✅ `/paiement/[transactionId].jsx` - Page de paiement intégrée
- ✅ Politiques SQL pour RLS
- ✅ Documentation complète

### 3. **Fonctionnalités implémentées**
- ✅ Recherche intelligente des réservations
- ✅ Filtres par statut (Toutes, En attente, Payées, Échouées)
- ✅ Vérification des paiements FedaPay
- ✅ Annulation de réservations
- ✅ Paiement intégré dans l'app (WebView)

## 🔴 Ce qu'il reste à faire (Côté Supabase)

### Étape 1 : Ajouter la colonne `compagnie_id` à `profiles`

**Ouvrir** : Supabase Dashboard → SQL Editor

**Copier et exécuter** :
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS compagnie_id UUID REFERENCES public.compagnies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_compagnie_id ON public.profiles(compagnie_id);

COMMENT ON COLUMN public.profiles.compagnie_id IS 'ID de la compagnie associée à l''utilisateur';
```

**Vérifier** :
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'compagnie_id';
```
✅ Devrait retourner : `compagnie_id`

---

### Étape 2 : Nettoyer les anciennes politiques (si nécessaire)

**Si vous avez déjà essayé d'exécuter les politiques**, nettoyez d'abord :

```sql
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Companies can view their reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can update all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Companies can update their reservations" ON public.reservations;
```

---

### Étape 3 : Créer les politiques RLS

**Copier le contenu complet du fichier** : `supabase_migrations/admin_reservations_policies.sql`

Ou copier directement :

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

**Vérifier** :
```sql
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'reservations';
```
✅ Devrait retourner : `7` (3 anciennes + 4 nouvelles)

---

### Étape 4 : Créer un utilisateur admin (si pas déjà fait)

**Option A - Via l'interface Supabase** :
1. Authentication → Users → Invite User
2. Créer un utilisateur avec un email admin

**Option B - Via SQL** :
```sql
-- Mettre à jour un utilisateur existant pour le rendre admin
UPDATE public.profiles
SET admin = true
WHERE email = 'votre-email@example.com';
```

**Vérifier** :
```sql
SELECT email, admin, compagnie_id FROM profiles WHERE admin = true;
```

---

### Étape 5 : Créer un compte Compagnie (IMPORTANT)

Pour permettre à une compagnie de gérer ses trajets et réservations :

**1. Créer le compte utilisateur** (via l'app ou Supabase Authentication)

**2. Associer à une compagnie** :
```sql
-- Associer un utilisateur à une compagnie
UPDATE public.profiles
SET compagnie_id = (
  SELECT id FROM compagnies 
  WHERE nom = 'Nom de votre compagnie' 
  LIMIT 1
)
WHERE email = 'compagnie@example.com';
```

**3. Vérifier** :
```sql
SELECT 
  p.email, 
  p.admin, 
  c.nom as compagnie,
  c.id as compagnie_id
FROM profiles p
LEFT JOIN compagnies c ON c.id = p.compagnie_id
WHERE p.email = 'compagnie@example.com';
```

✅ Résultat attendu :
- `admin` = `false`
- `compagnie` = Nom de la compagnie
- `compagnie_id` = UUID (not null)

**4. Ce que peut faire une compagnie** :
- ✅ Onglet "Gestion" (au lieu de "Admin")
- ✅ Voir **uniquement** ses trajets
- ✅ Ajouter/supprimer ses trajets
- ✅ Voir **uniquement** les réservations de ses trajets
- ✅ Vérifier les paiements
- ✅ Annuler des réservations

📖 **Guide complet** : Consultez `GUIDE_COMPAGNIES.md` pour les instructions détaillées

---

## 🧪 Tests finaux

### Test 1 : Admin
1. Se connecter avec un compte admin
2. Aller dans **Admin** → **Gérer les réservations**
3. ✅ Devrait voir **toutes** les réservations de toutes les compagnies

### Test 2 : Compagnie
1. Se connecter avec un compte compagnie
2. Aller dans **Admin** → **Gérer les réservations**
3. ✅ Devrait voir **uniquement** les réservations de cette compagnie

### Test 3 : Utilisateur normal
1. Se connecter avec un compte utilisateur
2. Aller dans **Mes Réservations**
3. ✅ Devrait voir **uniquement** ses propres réservations

### Test 4 : Paiement intégré
1. Faire une réservation
2. ✅ La page de paiement s'ouvre **dans l'app** (WebView)
3. ✅ Pas de redirection vers un navigateur externe
4. ✅ Confirmation affichée dans l'app après paiement

---

## ⚠️ Si ça ne marche pas

### Erreur dans l'app : "Erreur chargement réservations"
**Vérifier** :
```sql
-- Les politiques sont créées ?
SELECT policyname FROM pg_policies WHERE tablename = 'reservations';

-- La colonne existe ?
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'compagnie_id';

-- L'utilisateur a un rôle ?
SELECT email, admin, compagnie_id FROM profiles WHERE email = 'votre-email';
```

### Aucune réservation ne s'affiche
**Vérifier** :
```sql
-- Il y a des réservations dans la base ?
SELECT COUNT(*) FROM reservations;

-- RLS est activé ?
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'reservations';
```

### Les compagnies voient tout
**Vérifier** :
```sql
-- Le compagnie_id est bien défini ?
SELECT email, compagnie_id, admin FROM profiles WHERE email = 'compagnie@example.com';

-- Les trajets ont un compagnie_id ?
SELECT id, depart, arrivee, compagnie_id FROM trajets LIMIT 5;
```

---

## 📚 Documentation de référence

- `INSTALLATION_SUPABASE.md` - Guide complet Supabase
- `SUPABASE_RLS_SETUP.md` - Configuration RLS détaillée
- `GESTION_RESERVATIONS.md` - Utilisation de l'interface
- `supabase_migrations/README.md` - Scripts SQL disponibles

---

## ✅ Checklist finale

Avant de valider l'installation :

- [ ] Étape 1 : Colonne `compagnie_id` ajoutée à `profiles` ✓
- [ ] Étape 2 : Anciennes politiques nettoyées (si nécessaire) ✓
- [ ] Étape 3 : 4 nouvelles politiques RLS créées ✓
- [ ] Étape 4 : Au moins un utilisateur admin créé ✓
- [ ] Étape 5 : (Optionnel) Utilisateur compagnie associé ✓
- [ ] Test 1 : Admin voit toutes les réservations ✓
- [ ] Test 2 : Compagnie voit ses réservations ✓
- [ ] Test 3 : Utilisateur voit ses réservations ✓
- [ ] Test 4 : Paiement intégré fonctionne ✓

---

**🎉 Une fois tous les tests validés, l'installation est terminée !**

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2025
