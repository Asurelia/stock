-- =============================================
-- Migration: Add Staff Groups
-- Date: 2026-01-19
-- Description: Ajoute un système de groupes pour organiser les collaborateurs
--              (Semaine 1, Semaine 2, Chef Gérant)
-- =============================================

-- Ajouter la colonne staff_group à la table staff
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS staff_group TEXT DEFAULT 'week1' 
CHECK (staff_group IN ('week1', 'week2', 'manager'));

-- Ajouter un index pour faciliter les requêtes par groupe
CREATE INDEX IF NOT EXISTS idx_staff_group ON staff(staff_group);

-- Ajouter un commentaire descriptif
COMMENT ON COLUMN staff.staff_group IS 
'Groupe du collaborateur: week1 (Semaine 1), week2 (Semaine 2), manager (Chef Gérant)';

-- =============================================
-- FIN DE LA MIGRATION
-- =============================================
