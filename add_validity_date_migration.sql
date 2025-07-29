-- Proforma tablosuna validity_date kolunu ekle
ALTER TABLE proformas 
ADD COLUMN validity_date DATE;

-- Mevcut kayıtlar için default değer ata (issue_date + 30 gün)
UPDATE proformas 
SET validity_date = issue_date + INTERVAL '30 days' 
WHERE validity_date IS NULL;

-- Gelecekteki kayıtlar için NOT NULL constraint ekle
ALTER TABLE proformas 
ALTER COLUMN validity_date SET NOT NULL; 