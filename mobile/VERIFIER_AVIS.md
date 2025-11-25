# 🔍 Vérification du système d'avis

## Problème : "Aucun avis n'apparaît sur la page de trajet"

### ✅ Solution

Le problème était que les colonnes `note` et `nb_avis` n'existaient pas dans la table `trajets`.

---

## 🛠️ Étapes de vérification

### 1. Vérifier les colonnes dans Supabase

```sql
-- Vérifier les colonnes de la table trajets
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'trajets'
ORDER BY ordinal_position;
```

**Vous devriez voir :**
- `note` (numeric)
- `nb_avis` (integer)

Si ces colonnes **n'existent pas**, exécutez la migration :

### 2. Exécuter la migration SQL

```bash
# Dans Supabase SQL Editor
# Copiez-collez tout le contenu de :
supabase_migrations/add_reponses_avis.sql

# Puis cliquez sur "Run"
```

### 3. Vérifier que les colonnes sont créées

```sql
-- Après la migration, vérifiez :
SELECT id, depart, arrivee, note, nb_avis 
FROM trajets 
LIMIT 5;
```

**Résultat attendu :**
```
id    | depart   | arrivee      | note | nb_avis
------|----------|--------------|------|--------
uuid1 | Cotonou  | Porto-Novo   | 0.00 | 0
uuid2 | Parakou  | Cotonou      | 0.00 | 0
...
```

### 4. Créer un avis de test

```sql
-- Créer un avis de test pour vérifier le trigger
INSERT INTO avis (user_id, trajet_id, note, commentaire)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM trajets LIMIT 1),
  5,
  'Test avis - Excellent service !'
);
```

### 5. Vérifier que le trigger fonctionne

```sql
-- Vérifier que la note a été mise à jour automatiquement
SELECT id, depart, arrivee, note, nb_avis 
FROM trajets 
WHERE nb_avis > 0;
```

**Résultat attendu :**
```
id    | depart   | arrivee      | note | nb_avis
------|----------|--------------|------|--------
uuid1 | Cotonou  | Porto-Novo   | 5.00 | 1
```

✅ Si `note = 5.00` et `nb_avis = 1`, le trigger fonctionne !

### 6. Vérifier dans l'application

1. **Ouvrir l'app**
2. **Chercher un trajet**
3. **Cliquer sur le trajet**
4. **Vérifier l'affichage :**
   - ⭐ `5.0 (1 avis)` doit apparaître
   - Bouton "Laisser un avis" visible
   - Cliquer sur "1 avis" → Liste des avis

---

## 🐛 Problèmes courants

### Problème 1 : "Column 'note' does not exist"

**Cause :** La migration n'a pas été exécutée.

**Solution :**
```sql
-- Ajouter manuellement les colonnes
ALTER TABLE public.trajets
ADD COLUMN IF NOT EXISTS note numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS nb_avis integer DEFAULT 0;
```

### Problème 2 : "La note reste à 0.00"

**Cause :** Le trigger n'est pas actif.

**Solution :**
```sql
-- Vérifier le trigger
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_trajet_note';

-- Recréer le trigger si nécessaire
DROP TRIGGER IF EXISTS trigger_update_trajet_note ON public.avis;
CREATE TRIGGER trigger_update_trajet_note
AFTER INSERT OR UPDATE OR DELETE ON public.avis
FOR EACH ROW
EXECUTE FUNCTION update_trajet_note();

-- Recalculer toutes les notes
UPDATE trajets t
SET 
  note = COALESCE((SELECT AVG(note) FROM avis WHERE trajet_id = t.id), 0),
  nb_avis = (SELECT COUNT(*) FROM avis WHERE trajet_id = t.id);
```

### Problème 3 : "Les avis n'apparaissent pas dans la liste"

**Cause :** Problème de RLS (Row Level Security).

**Solution :**
```sql
-- Vérifier que la policy SELECT existe
SELECT * FROM pg_policies WHERE tablename = 'avis';

-- Recréer la policy si nécessaire
DROP POLICY IF EXISTS "Avis visibles par tous" ON public.avis;
CREATE POLICY "Avis visibles par tous"
ON public.avis FOR SELECT
TO authenticated
USING (true);
```

### Problème 4 : "Cannot insert duplicate key"

**Cause :** Tentative de créer un 2ème avis pour le même trajet.

**Solution :** C'est normal ! La contrainte unique fonctionne.
```sql
-- Vérifier la contrainte
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'avis'::regclass;

-- Doit afficher : unique_user_trajet (u)
```

---

## 📊 Requêtes de diagnostic

### Statistiques globales

```sql
-- Nombre total d'avis
SELECT COUNT(*) as total_avis FROM avis;

-- Nombre de trajets avec avis
SELECT COUNT(*) as trajets_avec_avis 
FROM trajets 
WHERE nb_avis > 0;

-- Top 5 trajets par note
SELECT 
  depart,
  arrivee,
  note,
  nb_avis
FROM trajets
WHERE nb_avis > 0
ORDER BY note DESC, nb_avis DESC
LIMIT 5;
```

### Avis par trajet

```sql
-- Voir tous les avis d'un trajet spécifique
SELECT 
  a.note,
  a.commentaire,
  a.created_at,
  a.reponse,
  p.username as auteur
FROM avis a
LEFT JOIN profiles p ON a.user_id = p.id
WHERE a.trajet_id = 'VOTRE_TRAJET_ID'
ORDER BY a.created_at DESC;
```

### Vérifier les réponses

```sql
-- Avis avec réponses
SELECT 
  a.commentaire as avis,
  a.reponse,
  p1.username as auteur_avis,
  p2.username as auteur_reponse,
  a.reponse_at
FROM avis a
LEFT JOIN profiles p1 ON a.user_id = p1.id
LEFT JOIN profiles p2 ON a.reponse_par = p2.id
WHERE a.reponse IS NOT NULL;
```

---

## ✅ Checklist de vérification complète

### Base de données
- [ ] Colonne `trajets.note` existe
- [ ] Colonne `trajets.nb_avis` existe
- [ ] Colonne `avis.reponse` existe
- [ ] Colonne `avis.reponse_par` existe
- [ ] Colonne `avis.reponse_at` existe
- [ ] Contrainte `unique_user_trajet` existe
- [ ] Trigger `trigger_update_trajet_note` actif
- [ ] Fonction `update_trajet_note()` existe
- [ ] Fonction `repondre_avis()` existe
- [ ] RLS activé sur table `avis`
- [ ] Policy SELECT sur `avis` existe
- [ ] Policy INSERT sur `avis` existe
- [ ] Policy UPDATE sur `avis` existe

### Application
- [ ] Page trajet charge `note` et `nb_avis`
- [ ] Section avis visible sur page trajet
- [ ] Note et nombre d'avis affichés
- [ ] Bouton "Laisser un avis" fonctionne
- [ ] Clic sur "X avis" ouvre la liste
- [ ] Page liste avis fonctionne
- [ ] Formulaire avis fonctionne
- [ ] Modal réponse fonctionne (admin/compagnie)

### Tests fonctionnels
- [ ] Créer un avis → Note mise à jour
- [ ] Créer 2ème avis même trajet → Erreur contrainte
- [ ] Supprimer un avis → Note recalculée
- [ ] Admin peut répondre à tous les avis
- [ ] Compagnie peut répondre à ses trajets
- [ ] Compagnie ne peut pas répondre aux autres

---

## 🎯 Test rapide en 5 minutes

```sql
-- 1. Créer un avis de test
INSERT INTO avis (user_id, trajet_id, note, commentaire)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM trajets LIMIT 1),
  5,
  'Test rapide'
);

-- 2. Vérifier la note
SELECT note, nb_avis FROM trajets WHERE nb_avis = 1;
-- Attendu : note = 5.00, nb_avis = 1 ✅

-- 3. Créer un 2ème avis (autre user)
INSERT INTO avis (user_id, trajet_id, note, commentaire)
VALUES (
  (SELECT id FROM auth.users OFFSET 1 LIMIT 1),
  (SELECT id FROM trajets LIMIT 1),
  3,
  'Test 2'
);

-- 4. Vérifier la moyenne
SELECT note, nb_avis FROM trajets WHERE nb_avis = 2;
-- Attendu : note = 4.00, nb_avis = 2 ✅
-- Calcul : (5+3)/2 = 4.00

-- 5. Nettoyer
DELETE FROM avis WHERE commentaire LIKE 'Test%';
```

---

## 📞 Support

Si après toutes ces vérifications le problème persiste :

1. **Vérifier les logs Supabase** : Dashboard → Logs
2. **Vérifier les erreurs console** : Dans l'app React Native
3. **Vérifier les permissions RLS** : Table Editor → RLS

**Structure complète attendue :**
```
Table: trajets
├── note (numeric 3,2) ⭐ NOUVEAU
├── nb_avis (integer) ⭐ NOUVEAU
└── ...autres colonnes

Table: avis
├── reponse (text) ⭐ NOUVEAU
├── reponse_par (uuid) ⭐ NOUVEAU
├── reponse_at (timestamp) ⭐ NOUVEAU
└── ...autres colonnes

Trigger: trigger_update_trajet_note ⭐
Function: update_trajet_note() ⭐
Function: repondre_avis() ⭐
Constraint: unique_user_trajet ⭐
```

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2025
