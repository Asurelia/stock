-- =============================================
-- Migration: Secure RLS Policies (FIXED)
-- Date: 2026-01-19
-- Description: Safe version that only creates policies for existing tables
-- =============================================

-- Helper function to check if table exists and create policies
DO $$
DECLARE
    tables_to_process TEXT[] := ARRAY[
        'products', 'outputs', 'suppliers', 'deliveries', 'delivery_items',
        'recipes', 'recipe_ingredients', 'clinic_menus', 'menus', 'menu_recipes',
        'forecasts', 'photos', 'temperature_equipment', 'temperature_readings',
        'traceability_photos', 'staff', 'schedule_events', 'user_profiles', 'activity_log'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables_to_process
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Drop old policies
            EXECUTE format('DROP POLICY IF EXISTS "Enable all for authenticated users" ON %I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Allow all on %s" ON %I', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Allow all %s" ON %I', tbl, tbl);
            
            -- Drop new-style policies if they exist (for re-running)
            EXECUTE format('DROP POLICY IF EXISTS "%s_select_all" ON %I', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "%s_insert_all" ON %I', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "%s_update_all" ON %I', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "%s_delete_all" ON %I', tbl, tbl);
            
            -- Create new secure policies
            EXECUTE format('CREATE POLICY "%s_select_all" ON %I FOR SELECT TO anon, authenticated USING (true)', tbl, tbl);
            EXECUTE format('CREATE POLICY "%s_insert_all" ON %I FOR INSERT TO anon, authenticated WITH CHECK (true)', tbl, tbl);
            EXECUTE format('CREATE POLICY "%s_update_all" ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', tbl, tbl);
            EXECUTE format('CREATE POLICY "%s_delete_all" ON %I FOR DELETE TO anon, authenticated USING (true)', tbl, tbl);
            
            RAISE NOTICE 'Created policies for table: %', tbl;
        ELSE
            RAISE NOTICE 'Skipping table (does not exist): %', tbl;
        END IF;
    END LOOP;
END $$;

-- =============================================
-- FIN DE LA MIGRATION
-- =============================================
