-- ==============================================================================
-- MIGRATION CONSOLIDÉE - 2026-01-20
-- Exécutez ce script EN UNE SEULE FOIS dans Supabase SQL Editor
-- ==============================================================================

-- 1. GROUPES DE COLLABORATEURS (STAFF GROUPS)
-- ==============================================================================
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS staff_group TEXT DEFAULT 'week1';

-- Ajouter la contrainte seulement si elle n'existe pas (astuce avec DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'staff_staff_group_check'
    ) THEN
        ALTER TABLE staff 
        ADD CONSTRAINT staff_staff_group_check 
        CHECK (staff_group IN ('week1', 'week2', 'manager'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_group ON staff(staff_group);

COMMENT ON COLUMN staff.staff_group IS 
'Groupe du collaborateur: week1 (Semaine 1), week2 (Semaine 2), manager (Chef Gérant)';


-- 2. JOURS DE TRAVAIL PAR SEMAINE
-- ==============================================================================
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS work_days_week1 TEXT[] DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri'];

ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS work_days_week2 TEXT[] DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri'];

COMMENT ON COLUMN staff.work_days_week1 IS 
'Jours travaillés en semaine 1: mon, tue, wed, thu, fri, sat, sun';
COMMENT ON COLUMN staff.work_days_week2 IS 
'Jours travaillés en semaine 2: mon, tue, wed, thu, fri, sat, sun';


-- 3. TRAÇABILITÉ PHOTOS CORRECTION & OPTION
-- ==============================================================================

-- Correction captured_date -> captured_at
DO $$ 
BEGIN
    -- Vérifier si la colonne captured_date existe encore
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'traceability_photos' AND column_name = 'captured_date'
    ) THEN
        -- Ajouter la nouvelle colonne captured_at si elle n'existe pas
        ALTER TABLE traceability_photos 
        ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT now();
        
        -- Copier les données
        UPDATE traceability_photos 
        SET captured_at = captured_date::timestamptz
        WHERE captured_at IS NULL;
        
        -- Supprimer l'ancienne colonne
        ALTER TABLE traceability_photos DROP COLUMN IF EXISTS captured_date;
    ELSE
        -- Si captured_at n'existe pas non plus, la créer
        ALTER TABLE traceability_photos 
        ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Recréer les index
DROP INDEX IF EXISTS idx_traceability_date;
CREATE INDEX IF NOT EXISTS idx_traceability_captured_at ON traceability_photos(captured_at DESC);
DROP INDEX IF EXISTS idx_traceability_product_date;

-- Ajouter le champ d'exemption manuelle sur les produits
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS requires_traceability_photo BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN products.requires_traceability_photo IS 
'Indique si le produit nécessite une photo de traçabilité (TRUE par défaut)';

-- ==============================================================================
-- FIN DE LA MIGRATION CONSOLIDÉE
-- ==============================================================================
