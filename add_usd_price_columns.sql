-- Migration: Add USD price columns to products table
-- Date: 2024-12-28
-- Description: Adds USD price columns for both case and piece pricing

-- Add USD price columns
ALTER TABLE products ADD COLUMN price_per_case_usd DECIMAL(10,2);
ALTER TABLE products ADD COLUMN price_per_piece_usd DECIMAL(10,2);

-- Add comments
COMMENT ON COLUMN products.price_per_case_usd IS 'Koli fiyatı (USD)';
COMMENT ON COLUMN products.price_per_piece_usd IS 'Adet fiyatı (USD)';

-- Create indexes for USD prices
CREATE INDEX idx_products_price_case_usd ON products(price_per_case_usd);
CREATE INDEX idx_products_price_piece_usd ON products(price_per_piece_usd);

-- Update existing products with USD prices (approximate conversion: 1 EUR = 1.1 USD)
UPDATE products 
SET 
    price_per_case_usd = ROUND(price_per_case * 1.1, 2),
    price_per_piece_usd = ROUND(price_per_piece * 1.1, 2)
WHERE price_per_case_usd IS NULL OR price_per_piece_usd IS NULL;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name LIKE '%usd%'
ORDER BY ordinal_position;

-- Check sample data
SELECT 
    id, 
    name, 
    price_per_case, 
    price_per_case_usd,
    price_per_piece, 
    price_per_piece_usd
FROM products 
LIMIT 5; 