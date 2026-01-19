-- =============================================
-- Migration: Staff & Planning System
-- Date: 2026-01-18
-- =============================================

-- =============================================
-- Table: staff (Collaborateurs)
-- =============================================
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Cuisinier',
    email TEXT,
    phone TEXT,
    color TEXT DEFAULT '#3B82F6', -- Couleur pour le calendrier
    avatar_url TEXT,
    contract_hours NUMERIC DEFAULT 35, -- Heures contractuelles par semaine
    is_active BOOLEAN DEFAULT TRUE,
    signature_data TEXT, -- Signature électronique (base64)
    pin_code TEXT, -- Code PIN simple pour identification
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on staff" ON staff FOR ALL USING (true);

-- =============================================
-- Table: schedule_events (Événements du planning)
-- =============================================
CREATE TABLE IF NOT EXISTS schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'work',           -- Jour de travail
        'vacation',       -- Congés payés
        'sick',           -- Maladie
        'overtime',       -- Heures supplémentaires
        'training',       -- Formation
        'holiday',        -- Jour férié
        'unpaid_leave',   -- Congé sans solde
        'recovery'        -- Récupération
    )),
    title TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,      -- Heure de début (pour work/overtime)
    end_time TIME,        -- Heure de fin
    hours NUMERIC,        -- Nombre d'heures (calculé ou manuel)
    notes TEXT,
    is_validated BOOLEAN DEFAULT FALSE,
    validated_by UUID REFERENCES staff(id),
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on schedule_events" ON schedule_events FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_schedule_staff ON schedule_events(staff_id);
CREATE INDEX IF NOT EXISTS idx_schedule_dates ON schedule_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedule_type ON schedule_events(event_type);

-- =============================================
-- Table: user_profiles (Profils utilisateurs simplifiés)
-- =============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    avatar_emoji TEXT DEFAULT '👤',
    last_login TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on user_profiles" ON user_profiles FOR ALL USING (true);

-- =============================================
-- Table: activity_log (Journal d'activité)
-- =============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on activity_log" ON activity_log FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_log(created_at DESC);
