# 🐛 Debug : Aucun avis n'apparaît

## ✅ Améliorations apportées

### 1. **Logs de debug ajoutés**
Toutes les opérations affichent maintenant des logs dans la console :

```
🔍 Chargement trajet: uuid
✅ Trajet chargé: {...}
🔍 Chargement avis pour trajet: uuid
✅ 0 avis chargés: []
```

### 2. **Gestion d'erreurs améliorée**
- Affichage des erreurs avec `Alert.alert`
- Messages clairs en cas de problème
- Distinction entre "chargement" et "vide"

### 3. **Interface améliorée**
- ✅ **Indicateur de chargement** : Spinner pendant le chargement
- ✅ **État vide amélioré** : Message clair + bouton "Laisser le premier avis"
- ✅ **Info debug** : Zone jaune pour rappeler de consulter la console

---

## 🔍 Diagnostic rapide

### Étape 1 : Vérifier la migration SQL

```sql
-- Dans Supabase SQL Editor

-- 1. Vérifier que les colonnes existent dans trajets
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'trajets' AND column_name IN ('note', 'nb_avis');

-- Doit retourner: note, nb_avis
-- Si vide ❌ → Exécuter add_reponses_avis.sql
```

### Étape 2 : Vérifier la table avis

```sql
-- 2. Vérifier que la table avis existe
SELECT COUNT(*) as total FROM avis;

-- 3. Vérifier les colonnes de la table avis
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'avis';

-- Doit inclure: reponse, reponse_par, reponse_at
```

### Étape 3 : Consulter les logs dans l'app

1. **Ouvrir l'app React Native**
2. **Ouvrir la console de debug** :
   - Sur terminal : Logs en temps réel
   - Ou : `npx react-native log-android` / `log-ios`
3. **Naviguer vers un trajet**
4. **Cliquer sur "X avis"**

**Logs attendus :**
```
🔍 Chargement trajet: abc-123
✅ Trajet chargé: {depart: "Cotonou", ...}
🔍 Chargement avis pour trajet: abc-123
✅ 0 avis chargés: []
```

**Si vous voyez une erreur ❌** :
```
❌ Erreur chargement avis: {message: "..."}
```
→ Lire le message d'erreur !

---

## 🛠️ Solutions aux problèmes courants

### Problème 1 : "column 'note' does not exist"

**Cause** : Les colonnes `note` et `nb_avis` n'existent pas dans `trajets`.

**Solution** :
```sql
ALTER TABLE public.trajets
ADD COLUMN IF NOT EXISTS note numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS nb_avis integer DEFAULT 0;
```

### Problème 2 : "relation 'avis' does not exist"

**Cause** : La table `avis` n'existe pas dans votre base de données.

**Solution** : Vérifier votre schéma de base. La table `avis` doit exister avec :
```sql
CREATE TABLE avis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  trajet_id uuid REFERENCES trajets(id),
  note integer CHECK (note >= 1 AND note <= 5),
  commentaire text NOT NULL,
  reponse text,
  reponse_par uuid REFERENCES auth.users(id),
  reponse_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
```

### Problème 3 : "permission denied for table avis"

**Cause** : Les policies RLS bloquent l'accès.

**Solution** :
```sql
-- Vérifier que RLS est activé
SELECT * FROM pg_tables WHERE tablename = 'avis';

-- Ajouter policy de lecture
DROP POLICY IF EXISTS "Avis visibles par tous" ON public.avis;
CREATE POLICY "Avis visibles par tous"
ON public.avis FOR SELECT
TO authenticated
USING (true);
```

### Problème 4 : "Aucun avis" mais pas d'erreur

**Cause** : La table est simplement vide.

**Solution** : Créer un avis de test :

#### Option A : Via SQL
```sql
INSERT INTO avis (user_id, trajet_id, note, commentaire)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM trajets LIMIT 1),
  5,
  'Test avis - Excellent service !'
);

-- Vérifier que l'avis est créé
SELECT * FROM avis;

-- Vérifier que le trigger a mis à jour le trajet
SELECT id, depart, arrivee, note, nb_avis 
FROM trajets 
WHERE nb_avis > 0;
```

#### Option B : Via l'app
1. Aller sur "Liste des avis"
2. Cliquer sur "Laisser le premier avis"
3. Sélectionner 5★
4. Écrire un commentaire
5. Publier

**Vérifier les logs** :
```
📤 [LaisserAvis] Soumission avis: {user_id: "...", ...}
✅ [LaisserAvis] Avis créé avec succès: [...]
```

---

## 📋 Checklist de vérification

### Base de données
- [ ] Table `avis` existe
- [ ] Table `trajets` a colonnes `note` et `nb_avis`
- [ ] RLS activé sur `avis`
- [ ] Policy SELECT sur `avis` existe et permet la lecture
- [ ] Trigger `trigger_update_trajet_note` actif
- [ ] Au moins 1 avis dans la table (pour tester)

### Application
- [ ] Page "Liste avis" charge sans erreur
- [ ] Console affiche les logs 🔍✅
- [ ] Indicateur de chargement s'affiche
- [ ] Si vide : Message + bouton "Laisser le premier avis"
- [ ] Bouton fonctionne et ouvre le formulaire
- [ ] Formulaire permet de soumettre un avis

### Test end-to-end
- [ ] Créer un avis via l'app
- [ ] Vérifier dans Supabase que l'avis existe
- [ ] Vérifier que `trajets.note` et `trajets.nb_avis` sont mis à jour
- [ ] Retourner sur "Liste avis"
- [ ] L'avis apparaît ✅

---

## 🔬 Tests SQL détaillés

### Test 1 : Compter les avis
```sql
SELECT 
  t.id,
  t.depart,
  t.arrivee,
  t.note,
  t.nb_avis,
  (SELECT COUNT(*) FROM avis WHERE trajet_id = t.id) as count_reel
FROM trajets t
ORDER BY t.nb_avis DESC
LIMIT 10;
```

**Attendu** : `nb_avis` doit être égal à `count_reel`

### Test 2 : Vérifier le trigger
```sql
-- Créer un avis
INSERT INTO avis (user_id, trajet_id, note, commentaire)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM trajets LIMIT 1),
  4,
  'Test trigger'
);

-- Vérifier immédiatement
SELECT note, nb_avis FROM trajets WHERE nb_avis > 0 LIMIT 1;

-- Attendu : note mise à jour, nb_avis incrémenté
```

### Test 3 : Vérifier les permissions
```sql
-- Se connecter en tant qu'utilisateur (pas superuser)
SET ROLE authenticated;

-- Tenter de lire les avis
SELECT * FROM avis LIMIT 1;

-- Doit fonctionner ✅
-- Si erreur ❌ → Problème de RLS
```

---

## 📱 Test dans l'application

### Scénario complet

1. **Ouvrir l'app**
2. **Chercher un trajet** : "Cotonou"
3. **Cliquer sur un trajet**
4. **Voir la section avis** :
   - ⭐ 0.0 (0 avis) 💬
   - [✏️ Laisser un avis]
5. **Cliquer sur "0 avis"** → Page liste
6. **Observer** :
   - Spinner pendant 1-2 secondes
   - Puis message "Aucun avis"
   - Bouton "Laisser le premier avis"
7. **Cliquer sur le bouton** → Formulaire
8. **Remplir** :
   - Sélectionner 5★
   - Écrire "Test complet"
9. **Publier** → Message "Merci !"
10. **Retour automatique** → Page liste
11. **Observer** : L'avis doit apparaître ✅

### Console attendue

```
🔍 Chargement trajet: abc-123
✅ Trajet chargé: {...}
🔍 Chargement avis pour trajet: abc-123
✅ 0 avis chargés: []

[Clic sur "Laisser un avis"]

🔍 [LaisserAvis] Chargement trajet: abc-123
✅ [LaisserAvis] Trajet chargé: {...}
🔍 [LaisserAvis] Vérification avis existant pour user: user-123
✅ [LaisserAvis] Pas d'avis existant

[Soumission]

📤 [LaisserAvis] Soumission avis: {user_id: "...", trajet_id: "...", note: 5, ...}
✅ [LaisserAvis] Avis créé avec succès: [{...}]

[Retour sur liste]

🔍 Chargement trajet: abc-123
✅ Trajet chargé: {...}
🔍 Chargement avis pour trajet: abc-123
✅ 1 avis chargés: [{note: 5, commentaire: "Test complet", ...}]
```

---

## 🆘 Si rien ne fonctionne

### Vérification complète de A à Z

```sql
-- 1. Vérifier l'existence des tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('trajets', 'avis', 'profiles');

-- 2. Vérifier les colonnes critiques
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('trajets', 'avis') 
AND column_name IN ('note', 'nb_avis', 'reponse', 'reponse_par', 'reponse_at')
ORDER BY table_name, column_name;

-- 3. Vérifier RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('trajets', 'avis');

-- 4. Vérifier policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'avis';

-- 5. Vérifier triggers
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'avis'::regclass;

-- 6. Créer un avis de test
BEGIN;
INSERT INTO avis (user_id, trajet_id, note, commentaire)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM trajets LIMIT 1),
  5,
  'Test diagnostic complet'
);
-- Vérifier le résultat avant de valider
SELECT * FROM avis WHERE commentaire = 'Test diagnostic complet';
SELECT note, nb_avis FROM trajets WHERE nb_avis > 0;
COMMIT; -- ou ROLLBACK pour annuler
```

---

## 📞 Aide supplémentaire

Si après toutes ces vérifications vous avez toujours le problème :

1. **Copier les logs de console** complets
2. **Faire une capture** de la page "Liste avis"
3. **Exécuter** les requêtes SQL ci-dessus
4. **Noter** les erreurs exactes

**Informations utiles à fournir** :
- Version de Supabase
- Version de React Native / Expo
- Résultat de `SELECT * FROM avis LIMIT 1;`
- Résultat de `SELECT * FROM trajets LIMIT 1;`
- Logs complets de la console

---

## ✅ Résumé

**Problème** : Aucun avis n'apparaît sur la page "Avis des voyageurs"

**Causes possibles** :
1. ❌ Table `avis` vide (normal au début)
2. ❌ Colonnes `note`/`nb_avis` manquantes
3. ❌ RLS bloque la lecture
4. ❌ Erreur de chargement silencieuse

**Solutions appliquées** :
1. ✅ Logs de debug ajoutés
2. ✅ Gestion d'erreurs améliorée
3. ✅ Interface améliorée avec état vide
4. ✅ Bouton "Laisser le premier avis"

**Prochaine étape** :
1. Exécuter `add_reponses_avis.sql` dans Supabase
2. Ouvrir l'app et aller sur "Avis des voyageurs"
3. **Consulter la console** pour voir les logs
4. Suivre ce guide de debug selon les erreurs

**Tout devrait fonctionner après la migration SQL ! 🎉**
