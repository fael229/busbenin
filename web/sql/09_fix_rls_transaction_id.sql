-- ============================================
-- Politique RLS pour permettre la mise à jour du transaction_id
-- ============================================

-- Vérifier les politiques existantes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'reservations_location';

-- Supprimer l'ancienne politique UPDATE si elle est trop restrictive
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs propres réservations" ON public.reservations_location;

-- Créer une nouvelle politique UPDATE qui permet de mettre à jour ses propres réservations
CREATE POLICY "Mettre à jour ses propres réservations de location" 
ON public.reservations_location
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Vérifier que la colonne transaction_id existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'reservations_location'
  AND column_name = 'transaction_id';

-- Si la colonne n'existe pas, la créer
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reservations_location' 
        AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE public.reservations_location ADD COLUMN transaction_id TEXT;
        RAISE NOTICE 'Colonne transaction_id ajoutée';
    ELSE
        RAISE NOTICE 'Colonne transaction_id existe déjà';
    END IF;
END $$;

-- Afficher un exemple de réservation pour vérifier
SELECT 
    id,
    user_id,
    montant_total,
    statut,
    statut_paiement,
    transaction_id,
    created_at
FROM public.reservations_location
ORDER BY created_at DESC
LIMIT 1;

-- Test : Essayer de mettre à jour une réservation (remplacez l'ID par un vrai ID de votre table)
-- UPDATE public.reservations_location
-- SET transaction_id = 'test_transaction_id'
-- WHERE id = 'VOTRE_ID_ICI' AND user_id = auth.uid();

-- Vérifier toutes les politiques RLS sur la table
SELECT * FROM pg_policies WHERE tablename = 'reservations_location';
