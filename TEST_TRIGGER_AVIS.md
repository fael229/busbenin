# 🧪 Test du Trigger de Mise à Jour des Notes

## ⚠️ Problème : Notes non mises à jour

**Symptômes** :
- Vous créez un avis ✅
- L'avis apparaît dans la table `avis` ✅
- MAIS : `trajets.note` reste à 0 ❌
- MAIS : `trajets.nb_avis` reste à 0 ❌

**Cause** : Le trigger n'est pas actif dans Supabase.

---

## 🛠️ Solution en 2 étapes

### Étape 1 : Exécuter le script de correction

```sql
-- Dans Supabase SQL Editor
-- Copier-coller tout le contenu de :
fix_avis_trigger.sql

-- Puis cliquer sur "Run"
```

**Ce script va** :
1. ✅ Créer les colonnes `note` et `nb_avis` si elles n'existent pas
2. ✅ Supprimer l'ancien trigger (s'il existe)
3. ✅ Créer la fonction `update_trajet_note()`
4. ✅ Créer le trigger `trigger_update_trajet_note`
5. ✅ Recalculer toutes les notes existantes
6. ✅ Afficher un résumé de la mise à jour

**Résultat attendu** :
```
NOTICE: ==========================================
NOTICE: RÉSUMÉ DE LA MISE À JOUR
NOTICE: ==========================================
NOTICE: Total trajets: 25
NOTICE: Trajets avec avis: 3
NOTICE: Total avis: 5
NOTICE: ==========================================
NOTICE: ✅ Trigger installé et notes recalculées avec succès!
```

### Étape 2 : Vérifier que ça fonctionne

```sql
-- 1. Vérifier l'état actuel
SELECT id, depart, arrivee, note, nb_avis 
FROM trajets 
WHERE nb_avis > 0
ORDER BY nb_avis DESC;

-- Doit afficher les trajets avec leurs notes ✅
```

---

## 🧪 Tests complets

### Test 1 : Vérifier le trigger existe

```sql
-- Vérifier que le trigger est actif
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  CASE tgenabled
    WHEN 'O' THEN '✅ Actif'
    WHEN 'D' THEN '❌ Désactivé'
    ELSE '⚠️ État inconnu'
  END as status
FROM pg_trigger 
WHERE tgname = 'trigger_update_trajet_note';

-- Doit retourner 1 ligne avec enabled = 'O' (Origin = Actif)
```

### Test 2 : Vérifier la fonction existe

```sql
-- Vérifier que la fonction existe
SELECT 
  proname as function_name,
  pronargs as nb_arguments,
  prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'update_trajet_note';

-- Doit retourner 1 ligne
```

### Test 3 : Créer un avis de test

```sql
-- Sauvegarder l'état actuel
SELECT id, note, nb_avis 
FROM trajets 
WHERE id = (SELECT id FROM trajets LIMIT 1);

-- Créer un avis
BEGIN;

INSERT INTO avis (user_id, trajet_id, note, commentaire)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM trajets LIMIT 1),
  5,
  'Test trigger automatique'
);

-- Vérifier immédiatement que le trajet a été mis à jour
SELECT 
  t.id, 
  t.depart, 
  t.arrivee, 
  t.note as note_trajet,
  t.nb_avis,
  a.note as note_avis,
  a.commentaire
FROM trajets t
JOIN avis a ON t.id = a.trajet_id
WHERE a.commentaire = 'Test trigger automatique';

-- ✅ Si note_trajet est mise à jour → Trigger fonctionne !
-- ❌ Si note_trajet = 0 → Trigger ne fonctionne pas

-- Supprimer le test
DELETE FROM avis WHERE commentaire = 'Test trigger automatique';

COMMIT; -- ou ROLLBACK pour annuler
```

### Test 4 : Créer plusieurs avis et vérifier la moyenne

```sql
BEGIN;

-- Trajet de test
DO $$
DECLARE
  v_trajet_id uuid;
  v_user1_id uuid;
  v_user2_id uuid;
  v_user3_id uuid;
BEGIN
  -- Récupérer un trajet
  SELECT id INTO v_trajet_id FROM trajets LIMIT 1;
  
  -- Récupérer 3 utilisateurs différents
  SELECT id INTO v_user1_id FROM auth.users OFFSET 0 LIMIT 1;
  SELECT id INTO v_user2_id FROM auth.users OFFSET 1 LIMIT 1;
  SELECT id INTO v_user3_id FROM auth.users OFFSET 2 LIMIT 1;
  
  -- Créer 3 avis avec notes différentes
  INSERT INTO avis (user_id, trajet_id, note, commentaire) VALUES
    (v_user1_id, v_trajet_id, 5, 'Test moyenne - Excellent'),
    (v_user2_id, v_trajet_id, 3, 'Test moyenne - Moyen'),
    (v_user3_id, v_trajet_id, 4, 'Test moyenne - Bon');
  
  -- Vérifier la note moyenne
  -- Moyenne attendue : (5+3+4)/3 = 4.00
  RAISE NOTICE 'Vérification des calculs...';
END $$;

-- Vérifier le résultat
SELECT 
  t.id,
  t.depart,
  t.arrivee,
  t.note,
  t.nb_avis,
  ROUND((5.0+3.0+4.0)/3.0, 2) as moyenne_attendue,
  CASE 
    WHEN t.note = ROUND((5.0+3.0+4.0)/3.0, 2) THEN '✅ Correct'
    ELSE '❌ Incorrect'
  END as verification
FROM trajets t
WHERE t.nb_avis = 3;

-- Nettoyer
DELETE FROM avis WHERE commentaire LIKE 'Test moyenne%';

COMMIT; -- ou ROLLBACK
```

### Test 5 : Tester la suppression d'avis

```sql
BEGIN;

-- Créer un avis
INSERT INTO avis (user_id, trajet_id, note, commentaire)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM trajets LIMIT 1),
  5,
  'Test suppression'
)
RETURNING id, trajet_id;

-- Noter le trajet_id
-- Vérifier que nb_avis a augmenté
SELECT note, nb_avis FROM trajets WHERE id = (SELECT trajet_id FROM avis WHERE commentaire = 'Test suppression');

-- Supprimer l'avis
DELETE FROM avis WHERE commentaire = 'Test suppression';

-- Vérifier que nb_avis a diminué
SELECT note, nb_avis FROM trajets WHERE id = (SELECT id FROM trajets LIMIT 1);

-- ✅ Si nb_avis revient à la valeur initiale → Trigger fonctionne sur DELETE

COMMIT; -- ou ROLLBACK
```

---

## 📊 Vérifications rapides

### Vérification 1 : État global

```sql
-- Vue d'ensemble
SELECT 
  (SELECT COUNT(*) FROM trajets) as total_trajets,
  (SELECT COUNT(*) FROM trajets WHERE nb_avis > 0) as trajets_avec_avis,
  (SELECT COUNT(*) FROM avis) as total_avis,
  (SELECT ROUND(AVG(note), 2) FROM trajets WHERE nb_avis > 0) as note_moyenne_globale;
```

### Vérification 2 : Cohérence des données

```sql
-- Vérifier que le nombre d'avis correspond
SELECT 
  t.id,
  t.depart,
  t.arrivee,
  t.nb_avis as nb_selon_trajet,
  COUNT(a.id) as nb_reel_avis,
  CASE 
    WHEN t.nb_avis = COUNT(a.id) THEN '✅ OK'
    ELSE '❌ Incohérence'
  END as status
FROM trajets t
LEFT JOIN avis a ON t.id = a.trajet_id
GROUP BY t.id, t.depart, t.arrivee, t.nb_avis
HAVING t.nb_avis != COUNT(a.id) OR t.nb_avis > 0;

-- Si résultat vide ✅ → Tout est cohérent
-- Si résultats ❌ → Exécuter fix_avis_trigger.sql
```

### Vérification 3 : Moyennes correctes

```sql
-- Vérifier que les moyennes sont justes
SELECT 
  t.id,
  t.depart,
  t.arrivee,
  t.note as note_stockee,
  ROUND(AVG(a.note), 2) as note_calculee,
  t.nb_avis,
  CASE 
    WHEN ABS(t.note - AVG(a.note)) < 0.01 THEN '✅ OK'
    ELSE '❌ Incohérence'
  END as status
FROM trajets t
LEFT JOIN avis a ON t.id = a.trajet_id
WHERE t.nb_avis > 0
GROUP BY t.id, t.depart, t.arrivee, t.note, t.nb_avis
HAVING ABS(t.note - AVG(a.note)) >= 0.01;

-- Si résultat vide ✅ → Tout est cohérent
-- Si résultats ❌ → Exécuter fix_avis_trigger.sql
```

---

## 🔧 Si le trigger ne fonctionne toujours pas

### Diagnostic avancé

```sql
-- 1. Vérifier les permissions sur la fonction
SELECT 
  proname,
  proowner::regrole as owner,
  proacl as permissions
FROM pg_proc 
WHERE proname = 'update_trajet_note';

-- 2. Vérifier les permissions sur le trigger
SELECT 
  tgname,
  tgrelid::regclass as table_name,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger 
WHERE tgname = 'trigger_update_trajet_note';

-- 3. Tester manuellement la fonction
SELECT update_trajet_note() FROM avis LIMIT 1;
-- Si erreur → Problème dans la fonction
```

### Recréer complètement

Si rien ne fonctionne, recréer from scratch :

```sql
-- Supprimer tout
DROP TRIGGER IF EXISTS trigger_update_trajet_note ON public.avis CASCADE;
DROP FUNCTION IF EXISTS update_trajet_note() CASCADE;

-- Ré-exécuter fix_avis_trigger.sql
```

---

## 📱 Test depuis l'application

### Scénario complet

1. **Ouvrir l'app**
2. **Aller sur un trajet** sans avis
3. **Noter** : `note = 0.0, nb_avis = 0`
4. **Laisser un avis** : 5★ + commentaire
5. **Retourner sur le trajet**
6. **Vérifier** : `note = 5.0, nb_avis = 1` ✅

**Vérification SQL en parallèle** :

```sql
-- Avant de créer l'avis
SELECT note, nb_avis FROM trajets WHERE id = 'votre-trajet-id';
-- note = 0.00, nb_avis = 0

-- Après avoir créé l'avis via l'app
SELECT note, nb_avis FROM trajets WHERE id = 'votre-trajet-id';
-- note = 5.00, nb_avis = 1 ✅

-- Vérifier les logs du trigger (si activés)
SELECT * FROM pg_stat_user_functions 
WHERE funcname = 'update_trajet_note';
```

---

## ✅ Checklist finale

Après avoir exécuté `fix_avis_trigger.sql`, vérifier :

- [ ] Le script s'est exécuté sans erreur
- [ ] Le trigger existe : `SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_trajet_note';`
- [ ] La fonction existe : `SELECT * FROM pg_proc WHERE proname = 'update_trajet_note';`
- [ ] Les colonnes existent : `SELECT note, nb_avis FROM trajets LIMIT 1;`
- [ ] Les notes sont recalculées : `SELECT * FROM trajets WHERE nb_avis > 0;`
- [ ] Test INSERT fonctionne (Test 3)
- [ ] Test moyenne fonctionne (Test 4)
- [ ] Test DELETE fonctionne (Test 5)
- [ ] Cohérence vérifiée (Vérification 2 et 3)
- [ ] Test dans l'app fonctionne

---

## 🎯 Résumé

**Problème** : Notes non mises à jour dans `trajets`

**Solution** : Exécuter `fix_avis_trigger.sql`

**Vérification** : 
```sql
-- Test rapide en 30 secondes
BEGIN;
INSERT INTO avis (user_id, trajet_id, note, commentaire)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM trajets LIMIT 1),
  5, 'Test'
);
SELECT note, nb_avis FROM trajets WHERE id = (SELECT id FROM trajets LIMIT 1);
ROLLBACK;
```

**Attendu** : `note = X.XX`, `nb_avis = N+1` (augmenté)

**Si ça fonctionne** ✅ : Le trigger est opérationnel !

**Si ça ne fonctionne pas** ❌ : Consulter la section "Diagnostic avancé"
