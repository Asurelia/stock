-- =============================================
-- Migration: Temperature Equipment & Traceability Photos
-- Date: 2026-01-18
-- Description: Add tables for temperature tracking and traceability photos
-- =============================================

-- 1. Table temperature_equipment (Frigos/Congélateurs)
CREATE TABLE IF NOT EXISTS temperature_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('fridge', 'freezer', 'cold_room')),
    location TEXT,
    min_temp NUMERIC NOT NULL DEFAULT -5,
    max_temp NUMERIC NOT NULL DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE temperature_equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all temperature_equipment" ON temperature_equipment;
CREATE POLICY "Allow all temperature_equipment" ON temperature_equipment FOR ALL USING (true);

-- 2. Table temperature_readings (Relevés de température)
CREATE TABLE IF NOT EXISTS temperature_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES temperature_equipment(id) ON DELETE CASCADE,
    temperature NUMERIC NOT NULL,
    is_compliant BOOLEAN DEFAULT TRUE,
    recorded_by TEXT,
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE temperature_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all temperature_readings" ON temperature_readings;
CREATE POLICY "Allow all temperature_readings" ON temperature_readings FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_temp_readings_equipment ON temperature_readings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_temp_readings_date ON temperature_readings(recorded_at DESC);

-- 3. Table traceability_photos (Photos d'étiquettes)
CREATE TABLE IF NOT EXISTS traceability_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    output_id UUID REFERENCES outputs(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    url TEXT,
    captured_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE traceability_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all traceability_photos" ON traceability_photos;
CREATE POLICY "Allow all traceability_photos" ON traceability_photos FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_traceability_product ON traceability_photos(product_id);
CREATE INDEX IF NOT EXISTS idx_traceability_date ON traceability_photos(captured_date DESC);
-- Unique constraint: one photo per product per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_traceability_product_date ON traceability_photos(product_id, captured_date);

-- 4. Add emoji column to products (if not exists)
ALTER TABLE products ADD COLUMN IF NOT EXISTS emoji TEXT;

-- 5. Add recipe_id column to outputs (for optional recipe linking)
ALTER TABLE outputs ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;
