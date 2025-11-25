-- Script de correction : Trigger de mise à jour des notes
-- Exécuter ce script si les notes ne sont pas mises à jour automatiquement

-- ============================================
-- ÉTAPE 1 : Vérifier et créer les colonnes
-- ============================================

-- Ajouter les colonnes si elles n'existent pas
ALTER TABLE public.trajets
ADD COLUMN IF NOT EXISTS note numeric(3,2) DEFAULT 0;

ALTER TABLE public.trajets
ADD COLUMN IF NOT EXISTS nb_avis integer DEFAULT 0;

-- ============================================
-- ÉTAPE 2 : Supprimer l'ancien trigger s'il existe
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_trajet_note ON public.avis;
DROP FUNCTION IF EXISTS update_trajet_note();

-- ============================================
-- ÉTAPE 3 : Créer la fonction de mise à jour
-- ============================================

CREATE OR REPLACE FUNCTION update_trajet_note()
RETURNS TRIGGER AS $$
DECLARE
  v_trajet_id uuid;
  v_nouvelle_note numeric;
  v_nouveau_nb_avis integer;
BEGIN
  -- Déterminer le trajet_id selon l'opération
  IF (TG_OP = 'DELETE') THEN
    v_trajet_id := OLD.trajet_id;
  ELSE
    v_trajet_id := NEW.trajet_id;
  END IF;
  
  -- Calculer la nouvelle note moyenne
  SELECT COALESCE(AVG(note), 0)::numeric(3,2)
  INTO v_nouvelle_note
  FROM avis 
  WHERE trajet_id = v_trajet_id;
  
  -- Compter le nombre d'avis
  SELECT COUNT(*)
  INTO v_nouveau_nb_avis
  FROM avis 
  WHERE trajet_id = v_trajet_id;
  
  -- Mettre à jour le trajet
  UPDATE trajets
  SET 
    note = v_nouvelle_note,
    nb_avis = v_nouveau_nb_avis
  WHERE id = v_trajet_id;
  
  -- Log pour debug (visible dans les logs Supabase)
  RAISE NOTICE 'Trajet % mis à jour: note=%, nb_avis=%', v_trajet_id, v_nouvelle_note, v_nouveau_nb_avis;
  
  -- Retourner la bonne valeur selon l'opération
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÉTAPE 4 : Créer le trigger
-- ============================================

CREATE TRIGGER trigger_update_trajet_note
AFTER INSERT OR UPDATE OR DELETE ON public.avis
FOR EACH ROW
EXECUTE FUNCTION update_trajet_note();

-- ============================================
-- ÉTAPE 5 : Recalculer toutes les notes existantes
-- ============================================

-- Mettre toutes les notes à 0 d'abord
UPDATE trajets
SET note = 0, nb_avis = 0;

-- Recalculer pour chaque trajet qui a des avis
UPDATE trajets t
SET 
  note = COALESCE((
    SELECT AVG(note)::numeric(3,2) 
    FROM avis 
    WHERE trajet_id = t.id
  ), 0),
  nb_avis = (
    SELECT COUNT(*) 
    FROM avis 
    WHERE trajet_id = t.id
  );

-- ============================================
-- ÉTAPE 6 : Vérification
-- ============================================

-- Afficher un résumé
DO $$
DECLARE
  v_total_trajets integer;
  v_trajets_avec_avis integer;
  v_total_avis integer;
BEGIN
  SELECT COUNT(*) INTO v_total_trajets FROM trajets;
  SELECT COUNT(*) INTO v_trajets_avec_avis FROM trajets WHERE nb_avis > 0;
  SELECT COUNT(*) INTO v_total_avis FROM avis;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'RÉSUMÉ DE LA MISE À JOUR';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Total trajets: %', v_total_trajets;
  RAISE NOTICE 'Trajets avec avis: %', v_trajets_avec_avis;
  RAISE NOTICE 'Total avis: %', v_total_avis;
  RAISE NOTICE '==========================================';
  
  IF v_total_avis > 0 AND v_trajets_avec_avis = 0 THEN
    RAISE WARNING 'ATTENTION: Il y a des avis mais aucun trajet n''a été mis à jour!';
  ELSIF v_total_avis > 0 THEN
    RAISE NOTICE '✅ Trigger installé et notes recalculées avec succès!';
  ELSE
    RAISE NOTICE '⚠️ Aucun avis dans la base. Le trigger est prêt à fonctionner.';
  END IF;
END $$;

-- Afficher les 5 premiers trajets avec leurs notes
SELECT 
  id,
  depart,
  arrivee,
  note,
  nb_avis,
  CASE 
    WHEN nb_avis = 0 THEN '📊 Pas d''avis'
    WHEN note >= 4.5 THEN '⭐ Excellent'
    WHEN note >= 3.5 THEN '👍 Bon'
    WHEN note >= 2.5 THEN '😐 Moyen'
    ELSE '👎 À améliorer'
  END as evaluation
FROM trajets
ORDER BY nb_avis DESC, note DESC
LIMIT 5;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION update_trajet_note() IS 
'Fonction trigger qui met à jour automatiquement la note moyenne et le nombre d''avis d''un trajet';

COMMENT ON COLUMN trajets.note IS 
'Note moyenne du trajet (0-5 étoiles), calculée automatiquement à partir des avis';

COMMENT ON COLUMN trajets.nb_avis IS 
'Nombre total d''avis pour ce trajet, mis à jour automatiquement';
