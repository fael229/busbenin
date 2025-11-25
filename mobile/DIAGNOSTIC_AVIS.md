# 🔍 Diagnostic : Avis non visible

## 🎯 Problème

Vous avez laissé un avis mais il n'apparaît nulle part.

## 📋 Checklist de diagnostic

### 1. ✅ Vérifier que l'avis existe dans la base

Dans **Supabase SQL Editor**, exécutez :

```sql
-- Voir tous les avis
SELECT * FROM public.avis ORDER BY created_at DESC LIMIT 10;
```

**Résultat attendu** :
- ✅ Vous voyez votre avis → Problème d'affichage
- ❌ Vous ne voyez rien → Problème d'insertion

---

### 2. ✅ Vérifier les RLS Policies

```sql
-- Vérifier si RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'avis';

-- Lister les policies
SELECT * FROM pg_policies WHERE tablename = 'avis';
```

**Si `rowsecurity = false`** :
```sql
ALTER TABLE public.avis ENABLE ROW LEVEL SECURITY;
```

**Si aucune policy de SELECT** :
```sql
CREATE POLICY "Les avis sont visibles par tous"
  ON public.avis FOR SELECT
  USING (true);
```

---

### 3. ✅ Vérifier le trigger de mise à jour

```sql
-- Vérifier si le trigger existe
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'avis';

-- Vérifier si la fonction existe
SELECT proname FROM pg_proc 
WHERE proname = 'update_trajet_note';
```

**Si le trigger n'existe pas**, exécutez le fichier :
```
supabase_migrations/verify_avis_system.sql
```

---

### 4. ✅ Vérifier les colonnes dans trajets

```sql
-- Vérifier que note et nb_avis existent
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trajets' 
  AND column_name IN ('note', 'nb_avis');
```

**Si les colonnes n'existent pas** :
```sql
ALTER TABLE public.trajets ADD COLUMN note numeric(3,2) DEFAULT 0.0;
ALTER TABLE public.trajets ADD COLUMN nb_avis integer DEFAULT 0;
```

---

### 5. ✅ Tester le système complet

```sql
-- Insérer un avis de test
INSERT INTO public.avis (user_id, trajet_id, note, commentaire)
VALUES (
  auth.uid(), -- Votre ID utilisateur
  'VOTRE_TRAJET_ID', -- Remplacer par un vrai ID de trajet
  5,
  'Test d''avis'
);

-- Vérifier que le trajet a été mis à jour
SELECT id, depart, arrivee, note, nb_avis
FROM public.trajets
WHERE id = 'VOTRE_TRAJET_ID';
```

**Résultat attendu** :
- `note` devrait être > 0
- `nb_avis` devrait être ≥ 1

---

## 🛠️ Solution rapide : Tout réinitialiser

**Exécutez ce script dans Supabase SQL Editor** :

```sql
-- 1. Ajouter les colonnes si manquantes
ALTER TABLE public.trajets 
ADD COLUMN IF NOT EXISTS note numeric(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS nb_avis integer DEFAULT 0;

-- 2. Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_trajet_note ON public.avis;
DROP FUNCTION IF EXISTS public.update_trajet_note();

CREATE OR REPLACE FUNCTION public.update_trajet_note()
RETURNS TRIGGER AS $$
DECLARE
  v_trajet_id uuid;
  v_avg_note numeric;
  v_count_avis integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_trajet_id := OLD.trajet_id;
  ELSE
    v_trajet_id := NEW.trajet_id;
  END IF;

  SELECT 
    COALESCE(AVG(note), 0.0),
    COUNT(*)
  INTO v_avg_note, v_count_avis
  FROM public.avis
  WHERE trajet_id = v_trajet_id;

  UPDATE public.trajets
  SET 
    note = ROUND(v_avg_note, 1),
    nb_avis = v_count_avis
  WHERE id = v_trajet_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trajet_note
  AFTER INSERT OR UPDATE OR DELETE ON public.avis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trajet_note();

-- 3. Configurer les RLS
ALTER TABLE public.avis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Les avis sont visibles par tous" ON public.avis;
CREATE POLICY "Les avis sont visibles par tous"
  ON public.avis FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des avis" ON public.avis;
CREATE POLICY "Les utilisateurs peuvent créer des avis"
  ON public.avis FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. Recalculer toutes les notes
UPDATE public.trajets t
SET 
  note = COALESCE((
    SELECT ROUND(AVG(note), 1)
    FROM public.avis WHERE trajet_id = t.id
  ), 0.0),
  nb_avis = COALESCE((
    SELECT COUNT(*)
    FROM public.avis WHERE trajet_id = t.id
  ), 0);

-- 5. Vérification
SELECT 
  'SYSTÈME CONFIGURÉ' as statut,
  (SELECT COUNT(*) FROM public.avis) as total_avis,
  (SELECT COUNT(*) FROM public.trajets WHERE nb_avis > 0) as trajets_notes;
```

---

## 🔍 Vérifier dans l'application

### Console logs à surveiller

Quand vous ouvrez la page des avis, vous devriez voir :

```javascript
🔍 Chargement avis pour trajet: abc-123
✅ 1 avis chargés: [{note: 5, commentaire: "..."}]
```

**Si vous voyez** :
- ❌ `0 avis chargés: []` → Problème de RLS ou l'avis n'existe pas
- ❌ `Erreur PGRST...` → Problème de policy
- ✅ `1 avis chargés` mais rien ne s'affiche → Problème d'UI

### Page à vérifier

```
/avis/liste/[trajetId] → Liste des avis
/trajet/[id] → Note et nombre d'avis
```

---

## 📱 Test complet dans l'app

1. **Aller sur un trajet**
   - Vérifier que la note s'affiche : `⭐ 4.5 (3 avis)`

2. **Cliquer sur "X avis"**
   - Ouvre `/avis/liste/[trajetId]`
   - Doit afficher tous les avis

3. **Laisser un avis**
   - Aller sur `/avis/[trajetId]`
   - Remplir et soumettre
   - Vérifier le retour

4. **Vérifier la mise à jour**
   - Retourner sur la page trajet
   - La note doit être mise à jour
   - Le nombre d'avis doit être incrémenté

---

## 🐛 Erreurs courantes

### Erreur 1 : "column trajets.note does not exist"

**Solution** :
```sql
ALTER TABLE public.trajets 
ADD COLUMN note numeric(3,2) DEFAULT 0.0,
ADD COLUMN nb_avis integer DEFAULT 0;
```

---

### Erreur 2 : "new row violates row-level security policy"

**Solution** :
```sql
-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'avis';

-- Recréer la policy INSERT
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des avis" ON public.avis;
CREATE POLICY "Les utilisateurs peuvent créer des avis"
  ON public.avis FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

---

### Erreur 3 : Les avis existent mais ne s'affichent pas

**Causes possibles** :
1. RLS bloque la lecture
2. L'app ne charge pas correctement
3. L'UI a un bug

**Test rapide** :
```sql
-- Désactiver temporairement RLS
ALTER TABLE public.avis DISABLE ROW LEVEL SECURITY;

-- Voir si ça marche dans l'app
-- Si oui → Problème de RLS
-- Si non → Problème d'app
```

**Ne pas oublier de réactiver** :
```sql
ALTER TABLE public.avis ENABLE ROW LEVEL SECURITY;
```

---

## ✅ Checklist finale

- [ ] Les colonnes `note` et `nb_avis` existent dans `trajets`
- [ ] Le trigger `trigger_update_trajet_note` existe
- [ ] La fonction `update_trajet_note()` existe
- [ ] RLS est activé sur `avis`
- [ ] Policy SELECT existe et permet la lecture
- [ ] Policy INSERT existe pour les utilisateurs
- [ ] Un avis de test existe dans la base
- [ ] Le trajet correspondant a `note > 0` et `nb_avis > 0`
- [ ] L'app affiche les logs de chargement
- [ ] Les avis s'affichent dans l'app

---

## 📞 Si rien ne fonctionne

1. **Exécutez** : `supabase_migrations/verify_avis_system.sql`
2. **Vérifiez** les logs dans la console de l'app
3. **Testez** avec un nouvel avis
4. **Regardez** les erreurs dans Supabase Dashboard

---

## 🎯 Solution la plus probable

Dans 90% des cas, le problème vient de :

1. **Les colonnes `note` et `nb_avis` n'existent pas** dans `trajets`
2. **Le trigger n'a pas été créé**
3. **Les RLS policies bloquent la lecture**

**Solution :** Exécutez le script `verify_avis_system.sql` !
