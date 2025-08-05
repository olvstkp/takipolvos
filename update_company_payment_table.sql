-- Mevcut company_payment tablosunu güncelle - EUR ve USD için ayrı alanlar

-- Yeni sütunlar ekle
ALTER TABLE company_payment 
ADD COLUMN bank_name_usd VARCHAR(255),
ADD COLUMN branch_usd VARCHAR(255),
ADD COLUMN branch_code_usd VARCHAR(50),
ADD COLUMN swift_code_usd VARCHAR(50),
ADD COLUMN account_name_usd VARCHAR(255),
ADD COLUMN account_number_usd VARCHAR(100);

-- Mevcut sütunları EUR için yeniden adlandır (opsiyonel)
-- İsterseniz bu kısmı açabilirsiniz
/*
ALTER TABLE company_payment 
RENAME COLUMN bank_name TO bank_name_eur;
ALTER TABLE company_payment 
RENAME COLUMN branch TO branch_eur;
ALTER TABLE company_payment 
RENAME COLUMN branch_code TO branch_code_eur;
ALTER TABLE company_payment 
RENAME COLUMN swift_code TO swift_code_eur;
ALTER TABLE company_payment 
RENAME COLUMN account_name TO account_name_eur;
ALTER TABLE company_payment 
RENAME COLUMN account_number TO account_number_eur;
*/

-- Mevcut EUR verisi varsa USD'ye de kopyala (opsiyonel)
UPDATE company_payment 
SET 
    bank_name_usd = bank_name,
    branch_usd = branch,
    branch_code_usd = branch_code,
    swift_code_usd = swift_code,
    account_name_usd = account_name,
    account_number_usd = account_number
WHERE bank_name IS NOT NULL;

-- DASPI için USD bilgileri örneği
UPDATE company_payment 
SET 
    bank_name_usd = 'İŞ BANKASI',
    branch_usd = 'EDREMİT / BALIKESİR ŞUBE',
    branch_code_usd = 'ISBTRXXX',
    swift_code_usd = 'ISBKTRISXXX',
    account_name_usd = 'OLIVE VE TİCARET',
    account_number_usd = 'USD: TR 95 0006 4000 0022 1230 7227 03'
WHERE company_name = 'DASPI';

-- Currency sütununu kaldır (artık EUR ve USD ayrı ayrı)
ALTER TABLE company_payment DROP COLUMN currency;