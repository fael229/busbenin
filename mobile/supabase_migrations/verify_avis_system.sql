-- Script de vérification et correction du système d'avis
-- À exécuter dans Supabase SQL Editor

-- ============================================
-- 1. VÉRIFIER LES DONNÉES EXISTANTES
-- ============================================

-- Voir tous les avis
SELECT 
  a.id,
  a.note,
  a.commentaire,
  a.created_at,
  t.depart,
  t.arrivee,
  t.note as trajet_note,
  t.nb_avis as trajet_nb_avis
FROM avis a
LEFT JOIN trajets t ON a.trajet_id = t.id
ORDER BY a.created_at DESC;

-- Vérifier les colonnes manquantes dans trajets
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trajets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- 2. AJOUTER LES COLONNES SI MANQUANTES
-- ============================================

-- Ajouter note et nb_avis si elles n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trajets' AND column_name = 'note'
  ) THEN
    ALTER TABLE public.trajets ADD COLUMN note numeric(3,2) DEFAULT 0.0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trajets' AND column_name = 'nb_avis'
  ) THEN
    ALTER TABLE public.trajets ADD COLUMN nb_avis integer DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 3. CRÉER/RECRÉER LE TRIGGER
-- ============================================

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_update_trajet_note ON public.avis;
DROP FUNCTION IF EXISTS public.update_trajet_note();

-- Créer la fonction trigger
CREATE OR REPLACE FUNCTION public.update_trajet_note()
RETURNS TRIGGER AS $$
DECLARE
  v_trajet_id uuid;
  v_avg_note numeric;
  v_count_avis integer;
BEGIN
  -- Déterminer le trajet_id selon l'opération
  IF TG_OP = 'DELETE' THEN
    v_trajet_id := OLD.trajet_id;
  ELSE
    v_trajet_id := NEW.trajet_id;
  END IF;

  -- Calculer la moyenne et le nombre d'avis
  SELECT 
    COALESCE(AVG(note), 0.0),
    COUNT(*)
  INTO v_avg_note, v_count_avis
  FROM public.avis
  WHERE trajet_id = v_trajet_id;

  -- Mettre à jour le trajet
  UPDATE public.trajets
  SET 
    note = ROUND(v_avg_note, 1),
    nb_avis = v_count_avis
  WHERE id = v_trajet_id;

  -- Log pour debug
  RAISE NOTICE 'Trajet % mis à jour: note=%, nb_avis=%', 
    v_trajet_id, ROUND(v_avg_note, 1), v_count_avis;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER trigger_update_trajet_note
  AFTER INSERT OR UPDATE OR DELETE ON public.avis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trajet_note();

-- ============================================
-- 4. RECALCULER TOUTES LES NOTES
-- ============================================

-- Mettre à jour tous les trajets
UPDATE public.trajets t
SET 
  note = COALESCE((
    SELECT ROUND(AVG(note), 1)
    FROM public.avis
    WHERE trajet_id = t.id
  ), 0.0),
  nb_avis = COALESCE((
    SELECT COUNT(*)
    FROM public.avis
    WHERE trajet_id = t.id
  ), 0);

-- ============================================
-- 5. CONFIGURER LES RLS POLICIES
-- ============================================

-- Activer RLS sur la table avis
ALTER TABLE public.avis ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Les avis sont visibles par tous" ON public.avis;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des avis" ON public.avis;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs avis" ON public.avis;
DROP POLICY IF EXISTS "Les admins peuvent tout faire" ON public.avis;

-- Policy : Tout le monde peut LIRE les avis
CREATE POLICY "Les avis sont visibles par tous"
  ON public.avis
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy : Les utilisateurs connectés peuvent CRÉER des avis
CREATE POLICY "Les utilisateurs peuvent créer des avis"
  ON public.avis
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent MODIFIER leurs propres avis
CREATE POLICY "Les utilisateurs peuvent modifier leurs avis"
  ON public.avis
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy : Les admins peuvent tout faire
CREATE POLICY "Les admins peuvent tout faire"
  ON public.avis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND admin = true
    )
  );

-- ============================================
-- 6. AJOUTER CONTRAINTE UNICITÉ
-- ============================================

-- Contrainte : Un utilisateur ne peut laisser qu'un seul avis par trajet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'avis_user_trajet_unique'
  ) THEN
    ALTER TABLE public.avis
      ADD CONSTRAINT avis_user_trajet_unique 
      UNIQUE (user_id, trajet_id);
  END IF;
END $$;

-- ============================================
-- 7. VÉRIFICATION FINALE
-- ============================================

-- Afficher un résumé
SELECT 
  'RÉSUMÉ SYSTÈME AVIS' as info,
  (SELECT COUNT(*) FROM public.avis) as total_avis,
  (SELECT COUNT(*) FROM public.trajets WHERE nb_avis > 0) as trajets_avec_avis,
  (SELECT ROUND(AVG(note), 2) FROM public.avis) as note_moyenne_globale;

-- Afficher les trajets avec leurs notes
SELECT 
  t.id,
  t.depart || ' → ' || t.arrivee as trajet,
  t.note,
  t.nb_avis,
  c.nom as compagnie
FROM public.trajets t
LEFT JOIN public.compagnies c ON t.compagnie_id = c.id
WHERE t.nb_avis > 0
ORDER BY t.note DESC, t.nb_avis DESC;

-- Afficher les derniers avis
SELECT 
  a.note,
  SUBSTRING(a.commentaire, 1, 50) as commentaire,
  t.depart || ' → ' || t.arrivee as trajet,
  a.created_at
FROM public.avis a
JOIN public.trajets t ON a.trajet_id = t.id
ORDER BY a.created_at DESC
LIMIT 10;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Système d''avis vérifié et configuré !';
  RAISE NOTICE '📊 Trigger créé et notes recalculées';
  RAISE NOTICE '🔒 RLS policies configurées';
  RAISE NOTICE '✨ Contrainte d''unicité ajoutée';
END $$;
