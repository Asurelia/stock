-- Table pour stocker les configurations de sorties récurrentes (configuration globale)
CREATE TABLE IF NOT EXISTS recurring_output_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('petit-dej', 'petit-dej-perso', 'gouter', 'repas-perso')),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(category, product_id)
);

-- Table pour stocker les sorties récurrentes du jour (permet modification jour par jour)
CREATE TABLE IF NOT EXISTS daily_recurring_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL CHECK (category IN ('petit-dej', 'petit-dej-perso', 'gouter', 'repas-perso')),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL DEFAULT 1,
    is_executed BOOLEAN DEFAULT false,
    executed_at TIMESTAMPTZ,
    output_id UUID REFERENCES outputs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(date, category, product_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_recurring_configs_category ON recurring_output_configs(category);
CREATE INDEX IF NOT EXISTS idx_daily_recurring_date ON daily_recurring_outputs(date);

-- RLS policies
ALTER TABLE recurring_output_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_recurring_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_output_configs_select_all" ON recurring_output_configs FOR SELECT USING (true);
CREATE POLICY "recurring_output_configs_insert_all" ON recurring_output_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "recurring_output_configs_update_all" ON recurring_output_configs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "recurring_output_configs_delete_all" ON recurring_output_configs FOR DELETE USING (true);

CREATE POLICY "daily_recurring_outputs_select_all" ON daily_recurring_outputs FOR SELECT USING (true);
CREATE POLICY "daily_recurring_outputs_insert_all" ON daily_recurring_outputs FOR INSERT WITH CHECK (true);
CREATE POLICY "daily_recurring_outputs_update_all" ON daily_recurring_outputs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "daily_recurring_outputs_delete_all" ON daily_recurring_outputs FOR DELETE USING (true);
