-- =============================================
-- StockPro Clinique - Complete Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PRODUCTS TABLE (already exists, ensure structure)
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT DEFAULT 'kg',
    quantity NUMERIC DEFAULT 0,
    "minStock" NUMERIC DEFAULT 0,
    "avgConsumption" NUMERIC DEFAULT 0,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. OUTPUTS TABLE (Stock Removals)
-- =============================================
CREATE TABLE IF NOT EXISTS outputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    reason TEXT DEFAULT 'Service midi',
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outputs_date ON outputs(date);
CREATE INDEX idx_outputs_product ON outputs(product_id);

-- =============================================
-- 3. SUPPLIERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'autre',
    phone TEXT,
    email TEXT,
    contact TEXT,
    notes TEXT,
    logo_url TEXT,
    order_days TEXT[] DEFAULT '{}',
    delivery_days TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. DELIVERIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    photo_url TEXT,
    total NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_date ON deliveries(date);

-- =============================================
-- 5. DELIVERY ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS delivery_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    quantity NUMERIC NOT NULL,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_items_delivery ON delivery_items(delivery_id);

-- =============================================
-- 6. RECIPES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    portions INTEGER DEFAULT 1,
    photo_url TEXT,
    dietary_tags TEXT[] DEFAULT '{}',
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. RECIPE INGREDIENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    quantity NUMERIC NOT NULL,
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- =============================================
-- 8. CLINIC MENUS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS clinic_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    patient_lunch JSONB DEFAULT '{}',
    patient_dinner JSONB DEFAULT '{}',
    staff_lunch JSONB DEFAULT '{}',
    punctual_orders JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clinic_menus_date ON clinic_menus(date);

-- =============================================
-- 9. FORECASTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    patients INTEGER DEFAULT 0,
    staff INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forecasts_date ON forecasts(date);

-- =============================================
-- 10. PHOTOS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_path TEXT,
    url TEXT,
    type TEXT DEFAULT 'stock',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FUNCTIONS: Auto-update stock on outputs
-- =============================================
CREATE OR REPLACE FUNCTION update_stock_on_output()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE products
        SET quantity = quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE products
        SET quantity = quantity + OLD.quantity,
            updated_at = NOW()
        WHERE id = OLD.product_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_output_stock
AFTER INSERT OR DELETE ON outputs
FOR EACH ROW EXECUTE FUNCTION update_stock_on_output();

-- =============================================
-- FUNCTIONS: Auto-update stock on delivery items
-- =============================================
CREATE OR REPLACE FUNCTION update_stock_on_delivery_item()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE products
        SET quantity = quantity + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE products
        SET quantity = quantity - OLD.quantity,
            updated_at = NOW()
        WHERE id = OLD.product_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delivery_item_stock
AFTER INSERT OR DELETE ON delivery_items
FOR EACH ROW EXECUTE FUNCTION update_stock_on_delivery_item();

-- =============================================
-- FUNCTIONS: Update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_recipes_updated_at
BEFORE UPDATE ON recipes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_clinic_menus_updated_at
BEFORE UPDATE ON clinic_menus
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_forecasts_updated_at
BEFORE UPDATE ON forecasts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (Enable for all tables)
-- =============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (adjust for your auth needs)
CREATE POLICY "Enable all for authenticated users" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON outputs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON delivery_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON recipe_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON clinic_menus FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON forecasts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON photos FOR ALL USING (true) WITH CHECK (true);
