# Proforma Sistemi - Supabase Backend Planı

## 🔐 Supabase Konfigürasyonu

```env
NEXT_PUBLIC_SUPABASE_URL=https://duxgrvwcwnxoogyekffw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1eGdydndjd254b29neWVrZmZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTIyNjcsImV4cCI6MjA2ODgyODI2N30.uzk40ZBpVNXWMiFyaqlOWk-Xfqiw-9Wgz5qRcKaj7qA
```

## 📊 Database Şeması

### 1. **customers** tablosu
```sql
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    tax_id VARCHAR(50) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    phone2 VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    delivery VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. **series** tablosu
```sql
CREATE TABLE series (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- "500ML X12", "750ML X9", etc.
    pieces_per_case INTEGER NOT NULL,
    net_weight_kg_per_piece DECIMAL(8,3) NOT NULL, -- Her parçanın net ağırlığı
    net_weight_kg_per_case DECIMAL(8,3) NOT NULL, -- Kolinin toplam net ağırlığı (piece * count)
    packaging_weight_kg_per_case DECIMAL(8,3) NOT NULL, -- Koli ambalaj ağırlığı (sadece ambalaj)
    width_cm INTEGER,
    length_cm INTEGER, 
    height_cm INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. **products** tablosu
```sql
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    series_id UUID REFERENCES series(id) ON DELETE RESTRICT,
    price_per_case DECIMAL(10,2) NOT NULL,
    price_per_piece DECIMAL(10,2) NOT NULL,
    barcode VARCHAR(50), -- Ürün barkodu (opsiyonel)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. **proformas** tablosu
```sql
CREATE TABLE proformas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proforma_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(100) DEFAULT 'CASH IN ADVANCE',
    bank_name VARCHAR(255),
    bank_branch VARCHAR(255),
    swift_code VARCHAR(20),
    account_number VARCHAR(50),
    notes TEXT,
    departure VARCHAR(255) DEFAULT 'İzmir-FOB',
    delivery VARCHAR(255),
    brand VARCHAR(100) DEFAULT 'DASPI',
    weight_per_pallet_kg DECIMAL(8,3) DEFAULT 20,
    status VARCHAR(20) DEFAULT 'draft', -- draft, confirmed, sent, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. **proforma_items** tablosu
```sql
CREATE TABLE proforma_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proforma_id UUID REFERENCES proformas(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit VARCHAR(10) NOT NULL CHECK (unit IN ('case', 'piece')),
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. **pallets** tablosu
```sql
CREATE TABLE pallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proforma_id UUID REFERENCES proformas(id) ON DELETE CASCADE,
    pallet_number INTEGER NOT NULL,
    width_cm INTEGER NOT NULL,
    length_cm INTEGER NOT NULL,
    height_cm INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7. **proforma_exports** tablosu (Excel/PDF export log)
```sql
CREATE TABLE proforma_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proforma_id UUID REFERENCES proformas(id) ON DELETE CASCADE,
    export_type VARCHAR(10) NOT NULL CHECK (export_type IN ('excel', 'pdf')),
    file_name VARCHAR(255),
    exported_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Indexes ve Optimizasyonlar

```sql
-- Performance indexes
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_tax_id ON customers(tax_id);
CREATE INDEX idx_series_name ON series(name);
CREATE INDEX idx_series_active ON series(is_active);
CREATE INDEX idx_products_series ON products(series_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_proformas_number ON proformas(proforma_number);
CREATE INDEX idx_proformas_customer ON proformas(customer_id);
CREATE INDEX idx_proformas_date ON proformas(issue_date);
CREATE INDEX idx_proformas_status ON proformas(status);
CREATE INDEX idx_proforma_items_proforma ON proforma_items(proforma_id);
CREATE INDEX idx_pallets_proforma ON pallets(proforma_id);

-- Unique constraints
ALTER TABLE proformas ADD CONSTRAINT unique_proforma_number UNIQUE (proforma_number);
ALTER TABLE customers ADD CONSTRAINT unique_customer_tax_id UNIQUE (tax_id);
ALTER TABLE series ADD CONSTRAINT unique_series_name UNIQUE (name);
```

## 🔐 Row Level Security (RLS) Politikaları

```sql
-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE proformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_exports ENABLE ROW LEVEL SECURITY;

-- Tüm authenticated kullanıcılar için tam erişim (şimdilik)
CREATE POLICY "Enable all operations for authenticated users" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON series FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON proformas FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON proforma_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON pallets FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON proforma_exports FOR ALL TO authenticated USING (true);
```

## 🔄 Database Functions ve Triggers

### 1. Otomatik updated_at trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_series_updated_at BEFORE UPDATE ON series FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proformas_updated_at BEFORE UPDATE ON proformas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Proforma total calculation trigger
```sql
CREATE OR REPLACE FUNCTION calculate_proforma_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE proformas 
    SET total_amount = (
        SELECT COALESCE(SUM(total), 0) 
        FROM proforma_items 
        WHERE proforma_id = COALESCE(NEW.proforma_id, OLD.proforma_id)
    )
    WHERE id = COALESCE(NEW.proforma_id, OLD.proforma_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_calculate_proforma_total 
    AFTER INSERT OR UPDATE OR DELETE ON proforma_items 
    FOR EACH ROW EXECUTE FUNCTION calculate_proforma_total();
```

### 3. Proforma number generator
```sql
CREATE OR REPLACE FUNCTION generate_proforma_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number INTEGER;
BEGIN
    IF NEW.proforma_number IS NULL OR NEW.proforma_number = '' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(proforma_number FROM 'PROF-(\d+)') AS INTEGER)), 0) + 1
        INTO new_number
        FROM proformas
        WHERE proforma_number ~ '^PROF-\d+$';
        
        NEW.proforma_number := 'PROF-' || LPAD(new_number::TEXT, 3, '0');
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_generate_proforma_number 
    BEFORE INSERT ON proformas 
    FOR EACH ROW EXECUTE FUNCTION generate_proforma_number();
```

### 4. Auto-calculate series net weight per case
```sql
CREATE OR REPLACE FUNCTION calculate_series_net_weight_per_case()
RETURNS TRIGGER AS $$
BEGIN
    -- Otomatik hesaplama: net_weight_kg_per_piece * pieces_per_case
    NEW.net_weight_kg_per_case := NEW.net_weight_kg_per_piece * NEW.pieces_per_case;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_calculate_series_net_weight 
    BEFORE INSERT OR UPDATE ON series 
    FOR EACH ROW EXECUTE FUNCTION calculate_series_net_weight_per_case();
```

## 📊 Views ve Stored Procedures

### 1. Proforma detay view
```sql
CREATE VIEW proforma_details AS
SELECT 
    p.id,
    p.proforma_number,
    p.issue_date,
    p.total_amount,
    p.status,
    c.name as customer_name,
    c.address as customer_address,
    c.contact_person,
    c.phone,
    c.email,
    COUNT(pi.id) as item_count,
    ARRAY_AGG(
        JSON_BUILD_OBJECT(
            'product_name', pr.name,
            'series_name', s.name,
            'description', pi.description,
            'quantity', pi.quantity,
            'unit', pi.unit,
            'unit_price', pi.unit_price,
            'total', pi.total,
            'pieces_per_case', s.pieces_per_case,
            'net_weight_kg_per_piece', s.net_weight_kg_per_piece,
            'net_weight_kg_per_case', s.net_weight_kg_per_case,
            'packaging_weight_kg', s.packaging_weight_kg_per_case
        )
    ) as items
FROM proformas p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN proforma_items pi ON p.id = pi.proforma_id
LEFT JOIN products pr ON pi.product_id = pr.id
LEFT JOIN series s ON pr.series_id = s.id
GROUP BY p.id, c.id;
```

## 🎯 Örnek Series Data

```sql
-- Series tablosu için örnek veriler (net_weight_kg_per_case otomatik hesaplanır)
INSERT INTO series (name, pieces_per_case, net_weight_kg_per_piece, packaging_weight_kg_per_case, width_cm, length_cm, height_cm, description) VALUES
('500ML X12', 12, 0.500, 1.297, 40, 30, 25, '500ml ürünler için 12''li koli'),
('750ML X9', 9, 0.750, 0.584, 35, 30, 30, '750ml ürünler için 9''lu koli'),
('150G X24', 24, 0.150, 5.460, 50, 40, 20, '150g katı ürünler için 24''lü koli'),
('2X100G', 18, 0.200, 4.327, 45, 35, 18, '2x100g ikili paket ürünler'),
('25G X100', 100, 0.025, 2.621, 60, 40, 15, '25g mini ürünler için 100''lü koli'),
('2ML X100', 100, 0.002, 0.026, 30, 25, 10, '2ml sachet ürünler için 100''lü koli'),
('PROMO ITEMS', 1, 0.100, 1.000, 20, 20, 20, 'Promosyon ürünleri (tek parça)');

-- Sonuç olarak hesaplanan net_weight_kg_per_case değerleri:
-- 500ML X12: 0.500 × 12 = 6.000 kg
-- 750ML X9: 0.750 × 9 = 6.750 kg  
-- 150G X24: 0.150 × 24 = 3.600 kg
-- 2X100G: 0.200 × 18 = 3.600 kg
-- 25G X100: 0.025 × 100 = 2.500 kg
-- 2ML X100: 0.002 × 100 = 0.200 kg
-- PROMO ITEMS: 0.100 × 1 = 0.100 kg
```

## 🚀 Implementation Aşamaları

### Phase 1: Temel Setup
1. ✅ Supabase project kurulumu
2. ⏳ Database tables oluşturma
3. ⏳ RLS policies kurulum
4. ⏳ Triggers ve functions kurulum

### Phase 2: Frontend Integration
1. ⏳ Supabase client kurulumu
2. ⏳ Environment variables setup
3. ⏳ Authentication entegrasyonu
4. ⏳ CRUD operations

### Phase 3: Data Migration
1. ⏳ Mock data'yı database'e aktarma
2. ⏳ Customer management entegrasyonu
3. ⏳ Product management entegrasyonu
4. ⏳ Proforma operations entegrasyonu

### Phase 4: Advanced Features
1. ⏳ Real-time subscriptions
2. ⏳ File upload (Excel import)
3. ⏳ Backup ve recovery
4. ⏳ Analytics ve reporting

## 📋 API Endpoints (Supabase ile)

### Customers
- `GET /rest/v1/customers` - Tüm müşteriler
- `POST /rest/v1/customers` - Yeni müşteri
- `PATCH /rest/v1/customers?id=eq.{id}` - Müşteri güncelle
- `DELETE /rest/v1/customers?id=eq.{id}` - Müşteri sil

### Series
- `GET /rest/v1/series?is_active=eq.true` - Aktif seriler
- `POST /rest/v1/series` - Yeni seri
- `PATCH /rest/v1/series?id=eq.{id}` - Seri güncelle
- `DELETE /rest/v1/series?id=eq.{id}` - Seri sil

### Products
- `GET /rest/v1/products?is_active=eq.true&select=*,series(*)` - Aktif ürünler (series bilgisi ile)
- `POST /rest/v1/products` - Yeni ürün
- `PATCH /rest/v1/products?id=eq.{id}` - Ürün güncelle

### Proformas
- `GET /rest/v1/proforma_details` - Proforma listesi (view)
- `POST /rest/v1/proformas` - Yeni proforma
- `PATCH /rest/v1/proformas?id=eq.{id}` - Proforma güncelle
- `DELETE /rest/v1/proformas?id=eq.{id}` - Proforma sil

## 🔍 Monitoring ve Logging

- Supabase Dashboard'tan real-time monitoring
- Database performance tracking
- Export operations logging
- Error tracking ve alerting

## 🛡️ Security Considerations

1. **Authentication**: Supabase Auth ile kullanıcı yönetimi
2. **Authorization**: RLS policies ile veri erişim kontrolü
3. **Data Validation**: Database constraints ve triggers
4. **API Security**: Rate limiting ve CORS ayarları
5. **Backup**: Otomatik daily backups 