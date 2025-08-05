-- Basit çözüm: Sadece yeni sütunları ekle (mevcut yapıyı bozmadan)

ALTER TABLE company_payment 
ADD COLUMN IF NOT EXISTS bank_name_usd VARCHAR(255),
ADD COLUMN IF NOT EXISTS branch_usd VARCHAR(255),
ADD COLUMN IF NOT EXISTS branch_code_usd VARCHAR(50),
ADD COLUMN IF NOT EXISTS swift_code_usd VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_name_usd VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_number_usd VARCHAR(100);

-- DASPI için USD bilgileri örneği ekle
UPDATE company_payment 
SET 
    bank_name_usd = 'İŞ BANKASI',
    branch_usd = 'EDREMİT / BALIKESİR ŞUBE',
    branch_code_usd = 'ISBTRXXX',
    swift_code_usd = 'ISBKTRISXXX',
    account_name_usd = 'OLIVE VE TİCARET',
    account_number_usd = 'USD: TR 95 0006 4000 0022 1230 7227 03'
WHERE company_name = 'DASPI';

-- Eğer DASPI kaydı yoksa ekle
INSERT INTO company_payment (
    company_name,
    bank_name,
    branch,
    branch_code,
    swift_code,
    account_name,
    account_number,
    bank_name_usd,
    branch_usd,
    branch_code_usd,
    swift_code_usd,
    account_name_usd,
    account_number_usd,
    is_active
) VALUES (
    'DASPI',
    'İŞ BANKASI',
    'EDREMİT / BALIKESİR ŞUBE',
    'ISBTRXXX',
    'ISBKTRISXXX',
    'OLIVE VE TİCARET',
    'TR 95 0006 4000 0022 1230 7227 02',
    'İŞ BANKASI',
    'EDREMİT / BALIKESİR ŞUBE',
    'ISBTRXXX',
    'ISBKTRISXXX',
    'OLIVE VE TİCARET',
    'USD: TR 95 0006 4000 0022 1230 7227 03',
    true
) ON CONFLICT (company_name) DO UPDATE SET
    bank_name_usd = EXCLUDED.bank_name_usd,
    branch_usd = EXCLUDED.branch_usd,
    branch_code_usd = EXCLUDED.branch_code_usd,
    swift_code_usd = EXCLUDED.swift_code_usd,
    account_name_usd = EXCLUDED.account_name_usd,
    account_number_usd = EXCLUDED.account_number_usd;