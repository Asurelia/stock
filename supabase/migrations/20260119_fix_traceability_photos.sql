-- =============================================
-- Migration: Fix Traceability Photos Table
-- Date: 2026-01-19
-- Description: Corrige la structure de la table traceability_photos
--              pour correspondre à l'API (captured_at au lieu de captured_date)
-- =============================================

-- Renommer captured_date en captured_at et changer le type
DO $$ 
BEGIN
    -- Vérifier si la colonne captured_date existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'traceability_photos' AND column_name = 'captured_date'
    ) THEN
        -- Ajouter la nouvelle colonne captured_at
        ALTER TABLE traceability_photos 
        ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT now();
        
        -- Copier les données
        UPDATE traceability_photos 
        SET captured_at = captured_date::timestamptz
        WHERE captured_at IS NULL;
        
        -- Supprimer l'ancienne colonne
        ALTER TABLE traceability_photos DROP COLUMN IF EXISTS captured_date;
        
        RAISE NOTICE 'Colonne captured_date convertie en captured_at';
    ELSE
        -- Si captured_at n'existe pas, la créer
        ALTER TABLE traceability_photos 
        ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT now();
        
        RAISE NOTICE 'Colonne captured_at créée';
    END IF;
END $$;

-- Recréer l'index sur captured_at
DROP INDEX IF EXISTS idx_traceability_date;
CREATE INDEX IF NOT EXISTS idx_traceability_captured_at ON traceability_photos(captured_at DESC);

-- Supprimer l'ancien unique index basé sur product_id et captured_date
DROP INDEX IF EXISTS idx_traceability_product_date;

-- =============================================
-- FIN DE LA MIGRATION
-- =============================================
