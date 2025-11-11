# 🔍 Debug Rapide : Avis Non Visibles

## ⚡ Test immédiat (2 minutes)

### Étape 1 : Vérifier dans Supabase

**Ouvrez Supabase SQL Editor et exécutez** :

```sql
-- Voir TOUS les avis
SELECT * FROM public.avis ORDER BY created_at DESC;
```

**Résultats possibles** :

#### ❌ Cas 1 : Aucune ligne retournée
```
→ Il n'y a AUCUN avis dans la base
→ Solution : Créer un avis de test
```

#### ✅ Cas 2 : Vous voyez des avis
```
→ Les avis existent
→ Problème : RLS ou code de l'app
```

---

### Étape 2 : Si aucun avis (Cas 1)

**Créez un avis de test** :

```sql
-- 1. Trouver un trajet
SELECT id, depart, arrivee FROM public.trajets LIMIT 1;

-- 2. Créer un avis (remplacez TRAJET_ID et USER_ID)
INSERT INTO public.avis (user_id, trajet_id, note, commentaire)
VALUES (
  auth.uid(), -- Votre ID utilisateur
  'COPIEZ_LE_TRAJET_ID_ICI', -- ID du trajet ci-dessus
  5,
  'Super trajet, très confortable !'
);

-- 3. Vérifier
SELECT * FROM public.avis;
```

---

### Étape 3 : Si les avis existent (Cas 2)

**Test RLS** :

```sql
-- Vérifier RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'avis';

-- Si rowsecurity = true, vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'avis';
```

**Si pas de policy SELECT** :

```sql
CREATE POLICY "Les avis sont visibles par tous"
  ON public.avis FOR SELECT
  USING (true);
```

---

### Étape 4 : Vérifier dans l'app

**Ouvrez la console de votre app** et regardez les logs :

```javascript
🔍 Chargement avis pour trajet: abc-123
✅ X avis chargés: [...]
```

**Logs possibles** :

#### ✅ Bon signe
```
🔍 Chargement avis pour trajet: abc-123
✅ 1 avis chargés: [{note: 5, commentaire: "..."}]
```
→ Les avis se chargent, problème d'UI

#### ❌ Mauvais signe
```
🔍 Chargement avis pour trajet: abc-123
✅ 0 avis chargés: []
```
→ Aucun avis pour ce trajet ou RLS bloque

#### ❌ Erreur
```
❌ Erreur chargement avis: {...}
```
→ Problème de permission ou de requête

---

## 🎯 Actions selon le cas

### 📍 Cas A : "0 avis chargés" dans les logs

**Causes possibles** :
1. Ce trajet n'a vraiment aucun avis
2. RLS bloque la lecture
3. Mauvais `trajet_id`

**Test rapide** :
```sql
-- Vérifier les avis pour CE trajet spécifique
SELECT * FROM public.avis 
WHERE trajet_id = 'COPIEZ_LE_TRAJET_ID_ICI';
```

---

### 📍 Cas B : "X avis chargés" mais rien ne s'affiche

**Cause** : Problème d'UI

**Vérifiez dans le code** :
```javascript
// Ligne 208-246 de liste/[trajetId].jsx
{avis.length === 0 ? (
  <Text>Aucun avis</Text>
) : (
  // Affichage des avis
)}
```

**Test** : Ajoutez ce log temporaire ligne 100 :
```javascript
console.log('✅ Avis chargés:', avis);
console.log('✅ Avis.length:', avis.length);
console.log('✅ Premier avis:', avis[0]);
```

---

### 📍 Cas C : Erreur dans les logs

**Erreur RLS** :
```
"new row violates row-level security policy"
```
→ Créez la policy SELECT

**Erreur colonne** :
```
"column ... does not exist"
```
→ Vérifiez les colonnes avec :
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'avis';
```

---

## 🚀 Solution Express (1 commande)

**Exécutez ce script SQL** pour tout corriger d'un coup :

```sql
-- Active RLS
ALTER TABLE public.avis ENABLE ROW LEVEL SECURITY;

-- Crée policy SELECT (lecture publique)
DROP POLICY IF EXISTS "Les avis sont visibles par tous" ON public.avis;
CREATE POLICY "Les avis sont visibles par tous"
  ON public.avis FOR SELECT
  USING (true);

-- Crée policy INSERT (utilisateurs connectés)
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des avis" ON public.avis;
CREATE POLICY "Les utilisateurs peuvent créer des avis"
  ON public.avis FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Vérifie
SELECT 
  'Config OK' as status,
  COUNT(*) as total_avis 
FROM public.avis;
```

---

## 📊 Script de diagnostic complet

**Fichier créé** : `test_avis_rapide.sql`

Exécutez-le dans Supabase pour un diagnostic automatique complet !

---

## ✅ Checklist finale

- [ ] J'ai vérifié qu'il y a des avis dans la base
- [ ] RLS est configuré avec une policy SELECT
- [ ] Les logs de l'app montrent "X avis chargés"
- [ ] Le trigger `update_trajet_note` existe
- [ ] Les colonnes `note` et `nb_avis` existent dans `trajets`
- [ ] J'ai testé avec un avis de test

---

## 💡 Test ultra-rapide (30 secondes)

**Dans Supabase SQL** :

```sql
-- 1. Voir les avis
SELECT COUNT(*) FROM public.avis;

-- 2. Si COUNT = 0, créer un avis test
INSERT INTO public.avis (user_id, trajet_id, note, commentaire)
SELECT 
  auth.uid(),
  (SELECT id FROM public.trajets LIMIT 1),
  5,
  'Avis de test'
WHERE NOT EXISTS (SELECT 1 FROM public.avis);

-- 3. Vérifier RLS
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'avis';

-- 4. Si RLS = true, créer policy
CREATE POLICY IF NOT EXISTS "Les avis sont visibles par tous"
  ON public.avis FOR SELECT
  USING (true);
```

**Puis rechargez l'app et vérifiez !** 🔄

---

## 🆘 Si rien ne marche

**Regardez la console de l'app et copiez-moi** :
1. Les logs complets de chargement
2. Le résultat de `SELECT * FROM public.avis;`
3. Le résultat de `SELECT * FROM pg_policies WHERE tablename = 'avis';`

**Je pourrai alors vous dire exactement où est le problème !**
