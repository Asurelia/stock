-- Migration: Ajouter les index manquants pour améliorer les performances
-- Date: 2026-01-19
-- Description: Index sur les clés étrangères pour optimiser les jointures

-- Index sur products.supplier_id pour jointures avec suppliers
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- Index sur schedule_events.validated_by pour jointures avec staff
CREATE INDEX IF NOT EXISTS idx_schedule_events_validated_by ON schedule_events(validated_by);

-- Index sur user_profiles.staff_id pour jointures avec staff
CREATE INDEX IF NOT EXISTS idx_user_profiles_staff_id ON user_profiles(staff_id);

-- Index composite sur outputs pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_outputs_product_date ON outputs(product_id, output_date DESC);

-- Index sur deliveries pour recherche par date
CREATE INDEX IF NOT EXISTS idx_deliveries_date_desc ON deliveries(delivery_date DESC);

-- Index sur schedule_events pour recherche par plage de dates
CREATE INDEX IF NOT EXISTS idx_schedule_events_date_range ON schedule_events(start_date, end_date);

-- Index sur temperature_readings pour recherche par équipement et date
CREATE INDEX IF NOT EXISTS idx_temp_readings_equipment_date ON temperature_readings(equipment_id, recorded_at DESC);

-- Commentaire: Les politiques RLS ne sont PAS modifiées dans cette migration
-- pour éviter de casser l'application en production.
-- Les RLS doivent être ajustées manuellement après implémentation de l'authentification.
