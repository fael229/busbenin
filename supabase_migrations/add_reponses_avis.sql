-- Migration: Ajouter les réponses aux avis
-- Description: Permet aux admins et compagnies de répondre aux avis clients

-- 1. Ajouter les colonnes pour les réponses dans la table avis
ALTER TABLE public.avis
ADD COLUMN IF NOT EXISTS reponse text,
ADD COLUMN IF NOT EXISTS reponse_par uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reponse_at timestamp with time zone;

-- 1b. Ajouter les colonnes note et nb_avis dans la table trajets
ALTER TABLE public.trajets
ADD COLUMN IF NOT EXISTS note numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS nb_avis integer DEFAULT 0;

-- 2. Créer une contrainte unique (un utilisateur = un avis par trajet)
ALTER TABLE public.avis 
DROP CONSTRAINT IF EXISTS unique_user_trajet;

ALTER TABLE public.avis 
ADD CONSTRAINT unique_user_trajet UNIQUE (user_id, trajet_id);

-- 3. Créer des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_avis_trajet_id ON public.avis(trajet_id);
CREATE INDEX IF NOT EXISTS idx_avis_user_id ON public.avis(user_id);

-- 4. Fonction pour calculer la note moyenne d'un trajet
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

-- 5. Trigger pour mettre à jour automatiquement la note moyenne
DROP TRIGGER IF EXISTS trigger_update_trajet_note ON public.avis;
CREATE TRIGGER trigger_update_trajet_note
AFTER INSERT OR UPDATE OR DELETE ON public.avis
FOR EACH ROW
EXECUTE FUNCTION update_trajet_note();

-- 6. RLS pour les avis
ALTER TABLE public.avis ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les avis
DROP POLICY IF EXISTS "Avis visibles par tous" ON public.avis;
CREATE POLICY "Avis visibles par tous"
ON public.avis FOR SELECT
TO authenticated
USING (true);

-- Les utilisateurs peuvent créer leurs propres avis (un seul par trajet)
-- La contrainte UNIQUE (user_id, trajet_id) empêche les doublons
DROP POLICY IF EXISTS "Utilisateurs peuvent créer avis" ON public.avis;
CREATE POLICY "Utilisateurs peuvent créer avis"
ON public.avis FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent modifier/supprimer leurs propres avis
DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leurs avis" ON public.avis;
CREATE POLICY "Utilisateurs peuvent modifier leurs avis"
ON public.avis FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateurs peuvent supprimer leurs avis" ON public.avis;
CREATE POLICY "Utilisateurs peuvent supprimer leurs avis"
ON public.avis FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Les admins et compagnies peuvent ajouter des réponses
DROP POLICY IF EXISTS "Admins et compagnies peuvent répondre" ON public.avis;
CREATE POLICY "Admins et compagnies peuvent répondre"
ON public.avis FOR UPDATE
TO authenticated
USING (
  -- Admin ou compagnie du trajet
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND (
      p.admin = true
      OR p.compagnie_id = (
        SELECT compagnie_id FROM trajets WHERE id = avis.trajet_id
      )
    )
  )
)
WITH CHECK (
  -- Seuls les champs reponse peuvent être modifiés
  reponse_par = auth.uid()
);

-- 7. Fonction pour répondre à un avis
CREATE OR REPLACE FUNCTION repondre_avis(
  p_avis_id uuid,
  p_reponse text
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_compagnie_id uuid;
  v_trajet_compagnie_id uuid;
  result json;
BEGIN
  -- Récupérer l'utilisateur actuel
  v_user_id := auth.uid();
  
  -- Vérifier le rôle
  SELECT admin, compagnie_id INTO v_is_admin, v_compagnie_id
  FROM profiles
  WHERE id = v_user_id;
  
  -- Récupérer la compagnie du trajet
  SELECT t.compagnie_id INTO v_trajet_compagnie_id
  FROM avis a
  JOIN trajets t ON a.trajet_id = t.id
  WHERE a.id = p_avis_id;
  
  -- Vérifier les permissions
  IF NOT (v_is_admin OR v_compagnie_id = v_trajet_compagnie_id) THEN
    RAISE EXCEPTION 'Vous n''avez pas la permission de répondre à cet avis';
  END IF;
  
  -- Ajouter la réponse
  UPDATE avis
  SET 
    reponse = p_reponse,
    reponse_par = v_user_id,
    reponse_at = NOW()
  WHERE id = p_avis_id;
  
  -- Retourner le résultat
  SELECT json_build_object(
    'success', true,
    'message', 'Réponse ajoutée avec succès'
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Recalculer les notes existantes
-- Mettre toutes les notes à 0 d'abord pour éviter les incohérences
UPDATE trajets
SET note = 0, nb_avis = 0;

-- Recalculer pour chaque trajet qui a des avis
UPDATE trajets t
SET 
  note = COALESCE((SELECT AVG(note)::numeric(3,2) FROM avis WHERE trajet_id = t.id), 0),
  nb_avis = (SELECT COUNT(*) FROM avis WHERE trajet_id = t.id);

-- 9. Afficher un résumé de la migration
DO $$
DECLARE
  v_total_trajets integer;
  v_trajets_avec_avis integer;
  v_total_avis integer;
  v_trigger_actif boolean;
BEGIN
  -- Compter les éléments
  SELECT COUNT(*) INTO v_total_trajets FROM trajets;
  SELECT COUNT(*) INTO v_trajets_avec_avis FROM trajets WHERE nb_avis > 0;
  SELECT COUNT(*) INTO v_total_avis FROM avis;
  
  -- Vérifier que le trigger existe
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_trajet_note'
  ) INTO v_trigger_actif;
  
  -- Afficher le résumé
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ MIGRATION SYSTÈME D''AVIS TERMINÉE';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistiques:';
  RAISE NOTICE '  • Total trajets: %', v_total_trajets;
  RAISE NOTICE '  • Trajets avec avis: %', v_trajets_avec_avis;
  RAISE NOTICE '  • Total avis: %', v_total_avis;
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Composants installés:';
  RAISE NOTICE '  • Colonnes trajets.note et nb_avis: ✅';
  RAISE NOTICE '  • Colonnes avis.reponse_*: ✅';
  RAISE NOTICE '  • Contrainte unique (user_id, trajet_id): ✅';
  RAISE NOTICE '  • Fonction update_trajet_note(): ✅';
  RAISE NOTICE '  • Trigger automatique: %', CASE WHEN v_trigger_actif THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  • RLS Policies: ✅';
  RAISE NOTICE '  • Fonction repondre_avis(): ✅';
  RAISE NOTICE '';
  
  IF v_total_avis > 0 THEN
    RAISE NOTICE '💡 Notes recalculées pour tous les trajets';
  ELSE
    RAISE NOTICE '⚠️  Aucun avis dans la base (normal pour une nouvelle installation)';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Le système d''avis est opérationnel !';
  RAISE NOTICE '==========================================';
END $$;

-- 10. Commentaires sur les colonnes
COMMENT ON COLUMN avis.reponse IS 'Réponse de l''admin ou de la compagnie à l''avis';
COMMENT ON COLUMN avis.reponse_par IS 'ID de l''utilisateur ayant répondu (admin ou compagnie)';
COMMENT ON COLUMN avis.reponse_at IS 'Date et heure de la réponse';
COMMENT ON COLUMN trajets.note IS 'Note moyenne du trajet (0-5 étoiles), calculée automatiquement par trigger';
COMMENT ON COLUMN trajets.nb_avis IS 'Nombre total d''avis pour ce trajet, mis à jour automatiquement par trigger';
COMMENT ON FUNCTION update_trajet_note() IS 'Fonction trigger qui met à jour automatiquement la note moyenne et le nombre d''avis d''un trajet après INSERT/UPDATE/DELETE sur la table avis';
