-- ============================================
-- Script de mise à jour pour reservations_location
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Étape 1: Vérifier si les colonnes existent déjà
DO $$ 
BEGIN
    -- Vérifier nom_locataire
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reservations_location' 
        AND column_name = 'nom_locataire'
    ) THEN
        ALTER TABLE public.reservations_location ADD COLUMN nom_locataire TEXT;
        RAISE NOTICE 'Colonne nom_locataire ajoutée';
    ELSE
        RAISE NOTICE 'Colonne nom_locataire existe déjà';
    END IF;

    -- Vérifier telephone_locataire
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reservations_location' 
        AND column_name = 'telephone_locataire'
    ) THEN
        ALTER TABLE public.reservations_location ADD COLUMN telephone_locataire TEXT;
        RAISE NOTICE 'Colonne telephone_locataire ajoutée';
    ELSE
        RAISE NOTICE 'Colonne telephone_locataire existe déjà';
    END IF;

    -- Vérifier email_locataire
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reservations_location' 
        AND column_name = 'email_locataire'
    ) THEN
        ALTER TABLE public.reservations_location ADD COLUMN email_locataire TEXT;
        RAISE NOTICE 'Colonne email_locataire ajoutée';
    ELSE
        RAISE NOTICE 'Colonne email_locataire existe déjà';
    END IF;

    -- Vérifier statut_paiement
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reservations_location' 
        AND column_name = 'statut_paiement'
    ) THEN
        ALTER TABLE public.reservations_location ADD COLUMN statut_paiement TEXT DEFAULT 'pending';
        RAISE NOTICE 'Colonne statut_paiement ajoutée';
    ELSE
        RAISE NOTICE 'Colonne statut_paiement existe déjà';
    END IF;

    -- Vérifier transaction_id (normalement déjà présente)
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

-- Étape 2: Mettre à jour les réservations existantes qui n'ont pas de statut_paiement
UPDATE public.reservations_location
SET statut_paiement = 'pending'
WHERE statut_paiement IS NULL;

-- Étape 3: Afficher la structure finale de la table
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'reservations_location'
ORDER BY ordinal_position;

-- ============================================
-- Fin du script
-- ============================================
