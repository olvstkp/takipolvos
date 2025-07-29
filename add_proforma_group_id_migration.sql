-- Migration: Add proforma_group_id column to products table
-- Date: 2024-12-28
-- Description: Adds proforma_group_id column to store proforma group assignments

-- Add the new column
ALTER TABLE products ADD COLUMN proforma_group_id VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN products.proforma_group_id IS 'Proforma grubu ID referansı (localStorage ile senkronize)';

-- Create index for better performance (optional)
CREATE INDEX idx_products_proforma_group ON products(proforma_group_id);

-- Update existing products with default group assignments based on product names
UPDATE products 
SET proforma_group_id = CASE 
    WHEN name ILIKE '%750ml%' OR name ILIKE '%750 ml%' THEN 'pg_1'
    WHEN name ILIKE '%500ml%' OR name ILIKE '%500 ml%' THEN 'pg_2'
    WHEN name ILIKE '%450ml%' OR name ILIKE '%450 ml%' THEN 'pg_3'
    WHEN name ILIKE '%100g%' OR name ILIKE '%100 g%' THEN 'pg_4'
    WHEN name ILIKE '%125g%' OR name ILIKE '%125 g%' THEN 'pg_5'
    WHEN name ILIKE '%150g%' OR name ILIKE '%150 g%' THEN 'pg_6'
    WHEN name ILIKE '%2x100%' OR name ILIKE '%dual%' OR name ILIKE '%pack%' THEN 'pg_7'
    ELSE NULL
END
WHERE proforma_group_id IS NULL;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'proforma_group_id'; 