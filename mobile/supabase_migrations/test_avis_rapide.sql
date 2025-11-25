-- ========================================
-- TEST RAPIDE : Pourquoi les avis ne s'affichent pas ?
-- ========================================

-- 1. Combien d'avis existent dans la base ?
SELECT 
  COUNT(*) as total_avis,
  COUNT(DISTINCT trajet_id) as trajets_avec_avis
FROM public.avis;

-- 2. Voir les 5 derniers avis créés
SELECT 
  a.id,
  a.note,
  SUBSTRING(a.commentaire, 1, 50) as commentaire_extrait,
  a.created_at,
  a.trajet_id,
  t.depart || ' → ' || t.arrivee as trajet
FROM public.avis a
LEFT JOIN public.trajets t ON a.trajet_id = t.id
ORDER BY a.created_at DESC
LIMIT 5;

-- 3. Vérifier RLS sur la table avis
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_active
FROM pg_tables 
WHERE tablename = 'avis';

-- 4. Lister les policies RLS
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE tablename = 'avis';

-- 5. Tester la lecture des avis (simulation utilisateur non connecté)
SET ROLE anon;
SELECT COUNT(*) as avis_lisibles_anon FROM public.avis;
RESET ROLE;

-- 6. Tester la lecture des avis (simulation utilisateur connecté)
-- Note: Remplacez 'VOTRE_USER_ID' par votre vrai UUID utilisateur
-- SELECT COUNT(*) as avis_lisibles_auth FROM public.avis;

-- 7. Vérifier si les colonnes note et nb_avis sont à jour
SELECT 
  t.id,
  t.depart || ' → ' || t.arrivee as trajet,
  t.note as note_trajet,
  t.nb_avis as nb_avis_trajet,
  COUNT(a.id) as avis_reels,
  ROUND(AVG(a.note), 1) as note_reelle
FROM public.trajets t
LEFT JOIN public.avis a ON a.trajet_id = t.id
GROUP BY t.id, t.depart, t.arrivee, t.note, t.nb_avis
HAVING COUNT(a.id) > 0
ORDER BY COUNT(a.id) DESC;

-- ========================================
-- SOLUTION SI RLS BLOQUE LA LECTURE
-- ========================================

-- Si les avis existent mais ne sont pas lisibles, 
-- vérifiez que cette policy existe :
/*
CREATE POLICY "Les avis sont visibles par tous"
  ON public.avis FOR SELECT
  USING (true);
*/

-- ========================================
-- AIDE AU DIAGNOSTIC
-- ========================================

DO $$
DECLARE
  v_total_avis integer;
  v_rls_enabled boolean;
  v_has_select_policy boolean;
BEGIN
  -- Compter les avis
  SELECT COUNT(*) INTO v_total_avis FROM public.avis;
  
  -- Vérifier RLS
  SELECT rowsecurity INTO v_rls_enabled 
  FROM pg_tables 
  WHERE tablename = 'avis' AND schemaname = 'public';
  
  -- Vérifier policy SELECT
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'avis' 
      AND cmd = 'SELECT'
  ) INTO v_has_select_policy;
  
  -- Afficher le diagnostic
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'DIAGNOSTIC SYSTÈME AVIS';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total avis dans la base: %', v_total_avis;
  RAISE NOTICE 'RLS activé: %', v_rls_enabled;
  RAISE NOTICE 'Policy SELECT existe: %', v_has_select_policy;
  RAISE NOTICE '';
  
  IF v_total_avis = 0 THEN
    RAISE NOTICE '❌ PROBLÈME: Aucun avis dans la base';
    RAISE NOTICE '   → Créez un avis de test depuis l''app';
  ELSE
    RAISE NOTICE '✅ % avis trouvés dans la base', v_total_avis;
  END IF;
  
  IF v_rls_enabled AND NOT v_has_select_policy THEN
    RAISE NOTICE '❌ PROBLÈME: RLS activé mais pas de policy SELECT';
    RAISE NOTICE '   → Exécutez: CREATE POLICY "Les avis sont visibles par tous" ON public.avis FOR SELECT USING (true);';
  ELSIF v_has_select_policy THEN
    RAISE NOTICE '✅ Policy SELECT existe';
  END IF;
  
  RAISE NOTICE '===========================================';
END $$;
