-- =============================================
-- Migration: Add Work Days Schedule
-- Date: 2026-01-19
-- Description: Ajoute les jours de travail par semaine pour chaque collaborateur
-- =============================================

-- Ajouter les colonnes pour les jours de travail
-- work_days_week1/week2: tableau des jours travaillés ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS work_days_week1 TEXT[] DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri'];

ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS work_days_week2 TEXT[] DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri'];

-- Commentaires descriptifs
COMMENT ON COLUMN staff.work_days_week1 IS 
'Jours travaillés en semaine 1: mon, tue, wed, thu, fri, sat, sun';

COMMENT ON COLUMN staff.work_days_week2 IS 
'Jours travaillés en semaine 2: mon, tue, wed, thu, fri, sat, sun';

-- =============================================
-- FIN DE LA MIGRATION
-- =============================================
