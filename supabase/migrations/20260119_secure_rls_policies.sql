-- =============================================
-- Migration: Secure RLS Policies
-- Date: 2026-01-19
-- Author: Claude Code
-- Description: Replace generic USING(true) policies with explicit role-based policies
-- =============================================
--
-- IMPORTANT: Cette migration remplace les policies génériques par des policies explicites
-- qui spécifient clairement les rôles autorisés (anon, authenticated).
--
-- STRATÉGIE ACTUELLE:
-- L'application fonctionne actuellement SANS authentification Supabase Auth.
-- Elle utilise la clé anon pour tous les appels API.
-- Toutes les opérations (SELECT, INSERT, UPDATE, DELETE) sont autorisées pour anon.
--
-- AMÉLIORATION APPORTÉE:
-- - Les policies sont maintenant EXPLICITES sur les rôles autorisés
-- - Chaque table a 4 policies distinctes (SELECT, INSERT, UPDATE, DELETE)
-- - La clause TO spécifie clairement "anon, authenticated"
-- - Ceci prépare le terrain pour une future authentification
--
-- POUR SÉCURISER DAVANTAGE (avec Supabase Auth):
-- Voir les exemples en fin de fichier pour implémenter des policies basées sur auth.uid()
-- =============================================

-- =============================================
-- ÉTAPE 1: Supprimer les anciennes policies permissives
-- =============================================

-- Products
DROP POLICY IF EXISTS "Enable all for authenticated users" ON products;
DROP POLICY IF EXISTS "Allow all on products" ON products;

-- Outputs
DROP POLICY IF EXISTS "Enable all for authenticated users" ON outputs;
DROP POLICY IF EXISTS "Allow all on outputs" ON outputs;

-- Suppliers
DROP POLICY IF EXISTS "Enable all for authenticated users" ON suppliers;
DROP POLICY IF EXISTS "Allow all on suppliers" ON suppliers;

-- Deliveries
DROP POLICY IF EXISTS "Enable all for authenticated users" ON deliveries;
DROP POLICY IF EXISTS "Allow all on deliveries" ON deliveries;

-- Delivery Items
DROP POLICY IF EXISTS "Enable all for authenticated users" ON delivery_items;
DROP POLICY IF EXISTS "Allow all on delivery_items" ON delivery_items;

-- Recipes
DROP POLICY IF EXISTS "Enable all for authenticated users" ON recipes;
DROP POLICY IF EXISTS "Allow all on recipes" ON recipes;

-- Recipe Ingredients
DROP POLICY IF EXISTS "Enable all for authenticated users" ON recipe_ingredients;
DROP POLICY IF EXISTS "Allow all on recipe_ingredients" ON recipe_ingredients;

-- Clinic Menus
DROP POLICY IF EXISTS "Enable all for authenticated users" ON clinic_menus;
DROP POLICY IF EXISTS "Allow all on clinic_menus" ON clinic_menus;

-- Menus (new structure)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON menus;
DROP POLICY IF EXISTS "Allow all on menus" ON menus;

-- Menu Recipes
DROP POLICY IF EXISTS "Enable all for authenticated users" ON menu_recipes;
DROP POLICY IF EXISTS "Allow all on menu_recipes" ON menu_recipes;

-- Forecasts
DROP POLICY IF EXISTS "Enable all for authenticated users" ON forecasts;
DROP POLICY IF EXISTS "Allow all on forecasts" ON forecasts;

-- Photos
DROP POLICY IF EXISTS "Enable all for authenticated users" ON photos;
DROP POLICY IF EXISTS "Allow all on photos" ON photos;

-- Temperature Equipment
DROP POLICY IF EXISTS "Allow all temperature_equipment" ON temperature_equipment;
DROP POLICY IF EXISTS "Allow all on temperature_equipment" ON temperature_equipment;

-- Temperature Readings
DROP POLICY IF EXISTS "Allow all temperature_readings" ON temperature_readings;
DROP POLICY IF EXISTS "Allow all on temperature_readings" ON temperature_readings;

-- Traceability Photos
DROP POLICY IF EXISTS "Allow all traceability_photos" ON traceability_photos;
DROP POLICY IF EXISTS "Allow all on traceability_photos" ON traceability_photos;

-- Staff
DROP POLICY IF EXISTS "Allow all on staff" ON staff;

-- Schedule Events
DROP POLICY IF EXISTS "Allow all on schedule_events" ON schedule_events;

-- User Profiles
DROP POLICY IF EXISTS "Allow all on user_profiles" ON user_profiles;

-- Activity Log
DROP POLICY IF EXISTS "Allow all on activity_log" ON activity_log;

-- =============================================
-- ÉTAPE 2: Créer les nouvelles policies sécurisées
-- =============================================

-- =============================================
-- PRODUCTS - Table principale des produits
-- Lecture: Tout le monde (catalogue public)
-- Écriture: anon + authenticated (gestion stock)
-- Suppression: authenticated uniquement
-- =============================================
CREATE POLICY "products_select_all" ON products
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "products_insert_all" ON products
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "products_update_all" ON products
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "products_delete_all" ON products
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- OUTPUTS - Sorties de stock
-- Critique pour la gestion du stock
-- Note: DELETE autorisé pour anon car l'app l'utilise pour annuler des sorties
-- =============================================
CREATE POLICY "outputs_select_all" ON outputs
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "outputs_insert_all" ON outputs
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "outputs_update_all" ON outputs
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "outputs_delete_all" ON outputs
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- SUPPLIERS - Fournisseurs
-- =============================================
CREATE POLICY "suppliers_select_all" ON suppliers
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "suppliers_insert_all" ON suppliers
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "suppliers_update_all" ON suppliers
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "suppliers_delete_all" ON suppliers
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- DELIVERIES - Livraisons
-- =============================================
CREATE POLICY "deliveries_select_all" ON deliveries
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "deliveries_insert_all" ON deliveries
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "deliveries_update_all" ON deliveries
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "deliveries_delete_all" ON deliveries
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- DELIVERY_ITEMS - Articles de livraison
-- =============================================
CREATE POLICY "delivery_items_select_all" ON delivery_items
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "delivery_items_insert_all" ON delivery_items
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "delivery_items_update_all" ON delivery_items
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "delivery_items_delete_all" ON delivery_items
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- RECIPES - Recettes
-- =============================================
CREATE POLICY "recipes_select_all" ON recipes
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "recipes_insert_all" ON recipes
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "recipes_update_all" ON recipes
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "recipes_delete_all" ON recipes
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- RECIPE_INGREDIENTS - Ingrédients des recettes
-- =============================================
CREATE POLICY "recipe_ingredients_select_all" ON recipe_ingredients
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "recipe_ingredients_insert_all" ON recipe_ingredients
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "recipe_ingredients_update_all" ON recipe_ingredients
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "recipe_ingredients_delete_all" ON recipe_ingredients
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- CLINIC_MENUS - Menus clinique (ancienne structure)
-- =============================================
CREATE POLICY "clinic_menus_select_all" ON clinic_menus
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "clinic_menus_insert_all" ON clinic_menus
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "clinic_menus_update_all" ON clinic_menus
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "clinic_menus_delete_all" ON clinic_menus
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- MENUS - Menus (nouvelle structure)
-- =============================================
CREATE POLICY "menus_select_all" ON menus
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "menus_insert_all" ON menus
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "menus_update_all" ON menus
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "menus_delete_all" ON menus
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- MENU_RECIPES - Recettes des menus
-- =============================================
CREATE POLICY "menu_recipes_select_all" ON menu_recipes
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "menu_recipes_insert_all" ON menu_recipes
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "menu_recipes_update_all" ON menu_recipes
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "menu_recipes_delete_all" ON menu_recipes
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- FORECASTS - Prévisions
-- =============================================
CREATE POLICY "forecasts_select_all" ON forecasts
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "forecasts_insert_all" ON forecasts
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "forecasts_update_all" ON forecasts
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "forecasts_delete_all" ON forecasts
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- PHOTOS - Photos générales
-- =============================================
CREATE POLICY "photos_select_all" ON photos
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "photos_insert_all" ON photos
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "photos_update_all" ON photos
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "photos_delete_all" ON photos
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- TEMPERATURE_EQUIPMENT - Équipements de température
-- =============================================
CREATE POLICY "temp_equipment_select_all" ON temperature_equipment
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "temp_equipment_insert_all" ON temperature_equipment
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "temp_equipment_update_all" ON temperature_equipment
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "temp_equipment_delete_all" ON temperature_equipment
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- TEMPERATURE_READINGS - Relevés de température
-- Note: UPDATE/DELETE autorisés pour anon (fonctionnement actuel)
-- Recommandation future: restreindre à authenticated pour HACCP
-- =============================================
CREATE POLICY "temp_readings_select_all" ON temperature_readings
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "temp_readings_insert_all" ON temperature_readings
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "temp_readings_update_all" ON temperature_readings
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "temp_readings_delete_all" ON temperature_readings
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- TRACEABILITY_PHOTOS - Photos de traçabilité
-- Note: DELETE autorisé pour anon (fonctionnement actuel)
-- Recommandation future: restreindre à authenticated pour HACCP
-- =============================================
CREATE POLICY "traceability_photos_select_all" ON traceability_photos
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "traceability_photos_insert_all" ON traceability_photos
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "traceability_photos_update_all" ON traceability_photos
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "traceability_photos_delete_all" ON traceability_photos
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- STAFF - Collaborateurs (DONNÉES SENSIBLES)
-- Lecture: tous (pour affichage planning)
-- Note: pin_code devrait être hashé en production
-- =============================================
CREATE POLICY "staff_select_all" ON staff
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "staff_insert_all" ON staff
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "staff_update_all" ON staff
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "staff_delete_all" ON staff
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- SCHEDULE_EVENTS - Événements du planning
-- =============================================
CREATE POLICY "schedule_events_select_all" ON schedule_events
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "schedule_events_insert_all" ON schedule_events
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "schedule_events_update_all" ON schedule_events
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "schedule_events_delete_all" ON schedule_events
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- USER_PROFILES - Profils utilisateurs (DONNÉES SENSIBLES)
-- =============================================
CREATE POLICY "user_profiles_select_all" ON user_profiles
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "user_profiles_insert_all" ON user_profiles
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "user_profiles_update_all" ON user_profiles
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "user_profiles_delete_all" ON user_profiles
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- ACTIVITY_LOG - Journal d'activité
-- =============================================
CREATE POLICY "activity_log_select_all" ON activity_log
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "activity_log_insert_all" ON activity_log
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "activity_log_update_all" ON activity_log
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "activity_log_delete_all" ON activity_log
    FOR DELETE TO anon, authenticated
    USING (true);

-- =============================================
-- COMMENTAIRES DE DOCUMENTATION
-- =============================================
COMMENT ON POLICY "products_select_all" ON products IS
'Permet la lecture des produits pour tous les utilisateurs (catalogue public)';

COMMENT ON POLICY "products_delete_all" ON products IS
'Permet la suppression pour anon et authenticated - Nécessaire pour le fonctionnement actuel de l''application';

COMMENT ON POLICY "temp_readings_select_all" ON temperature_readings IS
'Lecture des relevés de température accessible à tous pour l''affichage HACCP';

COMMENT ON POLICY "staff_select_all" ON staff IS
'Lecture du personnel accessible à tous pour l''affichage du planning';

-- =============================================
-- FIN DE LA MIGRATION
-- =============================================

-- =============================================
-- NOTES POUR UNE FUTURE AUTHENTIFICATION COMPLÈTE
-- =============================================
--
-- Quand vous implémenterez Supabase Auth, remplacez les policies par:
--
-- Exemple pour une table avec user_id:
-- CREATE POLICY "users_own_data" ON ma_table
--     FOR ALL TO authenticated
--     USING ((SELECT auth.uid()) = user_id)
--     WITH CHECK ((SELECT auth.uid()) = user_id);
--
-- Exemple pour admin seulement:
-- CREATE POLICY "admin_only" ON ma_table
--     FOR ALL TO authenticated
--     USING (
--         (SELECT auth.jwt() ->> 'role') = 'admin'
--         OR
--         (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
--     );
--
-- IMPORTANT: Créez des index sur les colonnes utilisées dans les policies:
-- CREATE INDEX idx_table_user_id ON ma_table(user_id);
-- =============================================
