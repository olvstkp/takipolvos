-- Migration: Add TL price columns to products table
-- Date: 2024-12-28
-- Description: Adds TL price columns for both case and piece pricing

-- Add TL price columns
ALTER TABLE products ADD COLUMN price_per_case_tl DECIMAL(10,2);
ALTER TABLE products ADD COLUMN price_per_piece_tl DECIMAL(10,2);

-- Add comments
COMMENT ON COLUMN products.price_per_case_tl IS 'Koli fiyatı (TL)';
COMMENT ON COLUMN products.price_per_piece_tl IS 'Adet fiyatı (TL)';

-- Create indexes for TL prices
CREATE INDEX idx_products_price_case_tl ON products(price_per_case_tl);
CREATE INDEX idx_products_price_piece_tl ON products(price_per_piece_tl);

-- Remove static auto-fill; TL values should be set dynamically by users or business logic

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name LIKE '%tl%'
ORDER BY ordinal_position;

-- Check sample data
SELECT 
    id, 
    name, 
    price_per_case, 
    price_per_case_usd,
    price_per_case_tl,
    price_per_piece, 
    price_per_piece_usd,
    price_per_piece_tl
FROM products 
LIMIT 5;
