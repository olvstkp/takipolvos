-- Şirket ödeme bilgileri tablosu oluşturma
CREATE TABLE company_payment (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    branch_code VARCHAR(50),
    swift_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Benzersiz şirket adı için index
CREATE UNIQUE INDEX idx_company_payment_company_name ON company_payment(company_name);

-- Güncellenme zamanı için trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_payment_updated_at 
    BEFORE UPDATE ON company_payment 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Örnek veri ekleme (İş Bankası)
INSERT INTO company_payment (
    company_name,
    bank_name,
    branch,
    branch_code,
    swift_code,
    account_name,
    account_number,
    currency
) VALUES (
    'DASPI',
    'İŞ BANKASI',
    'EDREMİT / BALIKESİR ŞUBE',
    'ISBTRXXX',
    'ISBKTRISXXX',
    'OLIVE VE TİCARET',
    'TR 95 0006 4000 0022 1230 7227 02',
    'EUR'
);

-- Row Level Security (RLS) aktifleştir
ALTER TABLE company_payment ENABLE ROW LEVEL SECURITY;

-- Tüm kullanıcılar okuyabilir
CREATE POLICY "Company payment read access" ON company_payment
    FOR SELECT USING (true);

-- Sadece authenticated kullanıcılar yazabilir
CREATE POLICY "Company payment write access" ON company_payment
    FOR ALL USING (auth.role() = 'authenticated');