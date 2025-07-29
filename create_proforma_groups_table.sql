-- Migration: Create proforma_groups table
-- Date: 2024-12-28
-- Description: Creates proforma_groups table to store proforma group definitions

-- Create proforma_groups table
CREATE TABLE proforma_groups (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    group_type VARCHAR(100) NOT NULL,
    size_value INTEGER,
    size_unit VARCHAR(10),
    is_liquid BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE proforma_groups IS 'Proforma grupları tanımları';
COMMENT ON COLUMN proforma_groups.id IS 'Grup ID (pg_1, pg_2, etc.)';
COMMENT ON COLUMN proforma_groups.name IS 'Grup adı (OLIVE OIL SHOWER GEL 750ML)';
COMMENT ON COLUMN proforma_groups.display_name IS 'Görüntüleme adı (Olive Oil Shower Gel 750ML X12)';
COMMENT ON COLUMN proforma_groups.group_type IS 'Grup tipi (SHOWER GEL, LIQUID SOAP, SOAP)';
COMMENT ON COLUMN proforma_groups.size_value IS 'Boyut değeri (750, 450, 100, etc.)';
COMMENT ON COLUMN proforma_groups.size_unit IS 'Boyut birimi (ML, G)';
COMMENT ON COLUMN proforma_groups.is_liquid IS 'Sıvı ürün mü?';
COMMENT ON COLUMN proforma_groups.sort_order IS 'Sıralama düzeni';

-- Create indexes
CREATE INDEX idx_proforma_groups_active ON proforma_groups(is_active);
CREATE INDEX idx_proforma_groups_sort ON proforma_groups(sort_order);
CREATE INDEX idx_proforma_groups_type ON proforma_groups(group_type);

-- Insert default proforma groups
INSERT INTO proforma_groups (id, name, display_name, group_type, size_value, size_unit, is_liquid, sort_order) VALUES
('pg_1', 'OLIVE OIL SHOWER GEL 750ML', 'Olive Oil Shower Gel 750ML X12', 'SHOWER GEL', 750, 'ML', true, 1),
('pg_2', 'OLIVE OIL LIQUID SOAP 450ML', 'Olive Oil Liquid Soap 450ML X15', 'LIQUID SOAP', 450, 'ML', true, 2),
('pg_3', 'OLIVE OIL LIQUID SOAP 500ML', 'Olive Oil Liquid Soap 500ML X12', 'LIQUID SOAP', 500, 'ML', true, 3),
('pg_4', 'OLIVE OIL SOAP 100G', 'Olive Oil Soap 100G X36', 'SOAP', 100, 'G', false, 4),
('pg_5', 'OLIVE OIL SOAP 125G', 'Olive Oil Soap 125G X24', 'SOAP', 125, 'G', false, 5),
('pg_6', 'OLIVE OIL SOAP 150G', 'Olive Oil Soap 150G X24', 'SOAP', 150, 'G', false, 6),
('pg_7', 'OLIVE OIL DUAL PACK 2X100G', 'Olive Oil Dual Pack 2x100G X18', 'SOAP', 200, 'G', false, 7);

-- Add foreign key constraint to products table
ALTER TABLE products 
ADD CONSTRAINT fk_products_proforma_group 
FOREIGN KEY (proforma_group_id) 
REFERENCES proforma_groups(id) 
ON DELETE SET NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_proforma_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_proforma_groups_updated_at 
    BEFORE UPDATE ON proforma_groups 
    FOR EACH ROW EXECUTE FUNCTION update_proforma_groups_updated_at();

-- Verify the migration
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'proforma_groups' 
ORDER BY ordinal_position;

-- Check inserted data
SELECT * FROM proforma_groups ORDER BY sort_order; 