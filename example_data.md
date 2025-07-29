# Supabase Database - Örnek Veriler

Bu dosya, proforma sisteminin test edilmesi için gerekli örnek verileri içerir. SQL komutlarını Supabase SQL Editor'da sırayla çalıştırın.

## 1. Müşteriler (customers)

```sql
INSERT INTO customers (name, address, tax_id, contact_person, phone, phone2, email, delivery) VALUES 
('BERFINI S.R.O.', 'Vrchlického 2120/1a, Mariánské Hory, 709 00 Ostrava, CZECHIA', 'CZ08251711', 'Sezen Çakır', '+420 722 546 796', '+420 722 546 797', 'sezen@berfini.cz', 'CZECHIA'),
('GLOBAL IMPORTS LTD', '123 Global Avenue, Business District, London SW1A 1AA, UNITED KINGDOM', 'GB123456789', 'John Smith', '+44 20 7946 0958', '+44 20 7946 0959', 'john.smith@globalimports.co.uk', 'UNITED KINGDOM'),
('KOSMETIK EUROPA GMBH', 'Hauptstraße 45, 10115 Berlin, GERMANY', 'DE987654321', 'Anna Mueller', '+49 30 12345678', '+49 30 12345679', 'anna.mueller@kosmetikeuropa.de', 'GERMANY'),
('MEDITERRANEAN TRADING', 'Via Roma 123, 00100 Roma, ITALY', 'IT456789123', 'Marco Rossi', '+39 06 12345678', '+39 06 12345679', 'marco.rossi@medtrading.it', 'ITALY'),
('BEAUTY SUPPLY CO', '456 Beauty Street, New York, NY 10001, USA', 'US789123456', 'Sarah Johnson', '+1 212 555 0123', '+1 212 555 0124', 'sarah.johnson@beautysupply.com', 'USA'),
('NATURAL COSMETICS FR', '78 Rue de la Beauté, 75001 Paris, FRANCE', 'FR321654987', 'Marie Dubois', '+33 1 42 96 12 34', '+33 1 42 96 12 35', 'marie.dubois@naturalcosmetics.fr', 'FRANCE');
```

## 2. Seriler (series)

```sql
INSERT INTO series (name, pieces_per_case, net_weight_kg_per_piece, packaging_weight_kg_per_case, width_cm, length_cm, height_cm, description) VALUES 
('500ML X12', 12, 0.500, 1.297, 40, 30, 25, '500ml ürünler için 12''li koli'),
('750ML X9', 9, 0.750, 0.584, 35, 30, 30, '750ml ürünler için 9''lu koli'),
('150G X24', 24, 0.150, 5.460, 50, 40, 20, '150g katı ürünler için 24''lü koli'),
('2X100G', 18, 0.200, 4.327, 45, 35, 18, '2x100g ikili paket ürünler'),
('25G X100', 100, 0.025, 2.621, 60, 40, 15, '25g mini ürünler için 100''lü koli'),
('2ML X100', 100, 0.002, 0.026, 30, 25, 10, '2ml sachet ürünler için 100''lü koli'),
('PROMO', 1, 0.100, 1.000, 20, 20, 20, 'Promosyon ürünleri (tek parça)'),
('1L X6', 6, 1.000, 0.800, 35, 25, 35, '1 litre ürünler için 6''lı koli'),
('250ML X24', 24, 0.250, 2.400, 45, 35, 25, '250ml ürünler için 24''lü koli'),
('50G X48', 48, 0.050, 3.200, 55, 40, 20, '50g küçük ürünler için 48''li koli');
```

## 3. Ürünler (products)

```sql
-- 500ML X12 Serisi Ürünler
INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS SELENE''S SERENITY OLIVE OIL SOAP 500ML X12 - GOAT MILK',
    id,
    39.24,
    3.27
FROM series WHERE name = '500ML X12';

INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS AMBROSIA NECTAR OLIVE OIL SOAP 500ML X12 - MANDARIN',
    id,
    39.24,
    3.27
FROM series WHERE name = '500ML X12';

INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS PURE OLIVE OIL SOAP 500ML X12 - LAVENDER',
    id,
    39.24,
    3.27
FROM series WHERE name = '500ML X12';

INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS NATURAL OLIVE OIL SOAP 500ML X12 - ROSE',
    id,
    39.24,
    3.27
FROM series WHERE name = '500ML X12';

-- 750ML X9 Serisi Ürünler
INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS PREMIUM OLIVE OIL SOAP 750ML X9 - HONEY',
    id,
    42.00,
    4.67
FROM series WHERE name = '750ML X9';

INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS LUXURY OLIVE OIL SOAP 750ML X9 - JASMINE',
    id,
    42.00,
    4.67
FROM series WHERE name = '750ML X9';

-- 150G X24 Serisi Ürünler
INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS GOAT MILK SOAP 150G X24',
    id,
    40.80,
    1.70
FROM series WHERE name = '150G X24';

INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS DEAD SEA MUD SOAP 150G X24',
    id,
    45.60,
    1.90
FROM series WHERE name = '150G X24';

INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS CHARCOAL SOAP 150G X24',
    id,
    43.20,
    1.80
FROM series WHERE name = '150G X24';

-- 2X100G Serisi Ürünler
INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS DUAL PACK OLIVE OIL SOAP 2X100G - ALOE VERA',
    id,
    38.70,
    2.15
FROM series WHERE name = '2X100G';

INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS DUAL PACK OLIVE OIL SOAP 2X100G - CUCUMBER',
    id,
    38.70,
    2.15
FROM series WHERE name = '2X100G';

-- 25G X100 Serisi Ürünler
INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS MINI MIX SOAP 25G X100 - ASSORTED',
    id,
    35.00,
    0.35
FROM series WHERE name = '25G X100';

-- 2ML X100 Serisi Ürünler
INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS OLIVE OIL SACHET 2ML X100 - SAMPLE PACK',
    id,
    15.00,
    0.15
FROM series WHERE name = '2ML X100';

-- PROMO Serisi Ürünler (Ücretsiz promosyon ürünleri)
INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS PROMO MINI SOAP - FREE SAMPLE',
    id,
    0.00,
    0.00
FROM series WHERE name = 'PROMO';

INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS PROMOTIONAL KEYCHAIN',
    id,
    0.00,
    0.00
FROM series WHERE name = 'PROMO';

-- 1L X6 Serisi Ürünler
INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS LIQUID OLIVE OIL SOAP 1L X6 - PROFESSIONAL',
    id,
    48.00,
    8.00
FROM series WHERE name = '1L X6';

-- 250ML X24 Serisi Ürünler
INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS OLIVE OIL SHAMPOO 250ML X24',
    id,
    52.80,
    2.20
FROM series WHERE name = '250ML X24';

INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS OLIVE OIL CONDITIONER 250ML X24',
    id,
    52.80,
    2.20
FROM series WHERE name = '250ML X24';

-- 50G X48 Serisi Ürünler
INSERT INTO products (name, series_id, price_per_case, price_per_piece) 
SELECT 
    'OLIVOS TRAVEL SIZE SOAP 50G X48 - MIXED',
    id,
    46.08,
    0.96
FROM series WHERE name = '50G X48';
```

## 4. Örnek Proforma Kayıtları

```sql
-- İlk Proforma (BERFINI S.R.O.)
INSERT INTO proformas (
    proforma_number, 
    issue_date, 
    customer_id, 
    total_amount, 
    payment_method, 
    bank_name, 
    bank_branch, 
    swift_code, 
    account_number, 
    notes, 
    departure, 
    delivery, 
    brand, 
    weight_per_pallet_kg, 
    status
) 
SELECT 
    'PROF-001',
    '2024-01-15',
    customers.id,
    1250.40,
    'CASH IN ADVANCE',
    'İŞ BANKASI',
    'EDREMİT / BALIKESİR ŞUBE',
    'ISBKTRISXXX',
    'TR 95 0006 4000 0022 1230 7227 02',
    'Plus/Minus 10 percent in quantity and amount will be allowed',
    'İzmir-FOB',
    'CZECHIA',
    'DASPI',
    20.00,
    'confirmed'
FROM customers 
WHERE name = 'BERFINI S.R.O.';

-- İkinci Proforma (GLOBAL IMPORTS)
INSERT INTO proformas (
    proforma_number, 
    issue_date, 
    customer_id, 
    total_amount, 
    payment_method, 
    bank_name, 
    bank_branch, 
    swift_code, 
    account_number, 
    notes, 
    departure, 
    delivery, 
    brand, 
    weight_per_pallet_kg, 
    status
) 
SELECT 
    'PROF-002',
    '2024-01-16',
    customers.id,
    980.50,
    'L/C AT SIGHT',
    'İŞ BANKASI',
    'EDREMİT / BALIKESİR ŞUBE',
    'ISBKTRISXXX',
    'TR 95 0006 4000 0022 1230 7227 02',
    'Delivery within 30 days after order confirmation',
    'İzmir-FOB',
    'UNITED KINGDOM',
    'DASPI',
    20.00,
    'draft'
FROM customers 
WHERE name = 'GLOBAL IMPORTS LTD';

-- Üçüncü Proforma (KOSMETIK EUROPA)
INSERT INTO proformas (
    proforma_number, 
    issue_date, 
    customer_id, 
    total_amount, 
    payment_method, 
    bank_name, 
    bank_branch, 
    swift_code, 
    account_number, 
    notes, 
    departure, 
    delivery, 
    brand, 
    weight_per_pallet_kg, 
    status
) 
SELECT 
    'PROF-003',
    '2024-01-17',
    customers.id,
    2150.75,
    'T/T IN ADVANCE',
    'İŞ BANKASI',
    'EDREMİT / BALIKESİR ŞUBE',
    'ISBKTRISXXX',
    'TR 95 0006 4000 0022 1230 7227 02',
    'Special packaging required for EU market',
    'İzmir-FOB',
    'GERMANY',
    'DASPI',
    20.00,
    'sent'
FROM customers 
WHERE name = 'KOSMETIK EUROPA GMBH';
```

## 5. Proforma Kalemleri (proforma_items)

```sql
-- PROF-001 için kalemler
INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    20,
    'case',
    39.24,
    784.80
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-001' 
AND pr.series_id = s.id 
AND s.name = '500ML X12' 
AND pr.name LIKE '%GOAT MILK%';

INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    15,
    'case',
    39.24,
    588.60
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-001' 
AND pr.series_id = s.id 
AND s.name = '500ML X12' 
AND pr.name LIKE '%MANDARIN%';

INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    5,
    'case',
    40.80,
    204.00
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-001' 
AND pr.series_id = s.id 
AND s.name = '150G X24' 
AND pr.name LIKE '%GOAT MILK%';

INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    100,
    'piece',
    0.00,
    0.00
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-001' 
AND pr.series_id = s.id 
AND s.name = 'PROMO' 
AND pr.name LIKE '%FREE SAMPLE%';

-- PROF-002 için kalemler
INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    12,
    'case',
    42.00,
    504.00
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-002' 
AND pr.series_id = s.id 
AND s.name = '750ML X9' 
AND pr.name LIKE '%HONEY%';

INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    8,
    'case',
    42.00,
    336.00
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-002' 
AND pr.series_id = s.id 
AND s.name = '750ML X9' 
AND pr.name LIKE '%JASMINE%';

INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    3,
    'case',
    46.08,
    138.24
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-002' 
AND pr.series_id = s.id 
AND s.name = '50G X48' 
AND pr.name LIKE '%TRAVEL SIZE%';

-- PROF-003 için kalemler (Büyük sipariş)
INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    25,
    'case',
    39.24,
    981.00
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-003' 
AND pr.series_id = s.id 
AND s.name = '500ML X12' 
AND pr.name LIKE '%LAVENDER%';

INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    20,
    'case',
    39.24,
    784.80
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-003' 
AND pr.series_id = s.id 
AND s.name = '500ML X12' 
AND pr.name LIKE '%ROSE%';

INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    10,
    'case',
    45.60,
    456.00
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-003' 
AND pr.series_id = s.id 
AND s.name = '150G X24' 
AND pr.name LIKE '%DEAD SEA%';

INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    8,
    'case',
    43.20,
    345.60
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-003' 
AND pr.series_id = s.id 
AND s.name = '150G X24' 
AND pr.name LIKE '%CHARCOAL%';

INSERT INTO proforma_items (proforma_id, product_id, description, quantity, unit, unit_price, total)
SELECT 
    p.id,
    pr.id,
    pr.name,
    5,
    'case',
    52.80,
    264.00
FROM proformas p, products pr, series s
WHERE p.proforma_number = 'PROF-003' 
AND pr.series_id = s.id 
AND s.name = '250ML X24' 
AND pr.name LIKE '%SHAMPOO%';
```

## 6. Palet Bilgileri (pallets)

```sql
-- PROF-001 için paletler
INSERT INTO pallets (proforma_id, pallet_number, width_cm, length_cm, height_cm)
SELECT id, 1, 80, 120, 124 FROM proformas WHERE proforma_number = 'PROF-001';

INSERT INTO pallets (proforma_id, pallet_number, width_cm, length_cm, height_cm)
SELECT id, 2, 80, 120, 126 FROM proformas WHERE proforma_number = 'PROF-001';

-- PROF-002 için paletler
INSERT INTO pallets (proforma_id, pallet_number, width_cm, length_cm, height_cm)
SELECT id, 1, 80, 120, 128 FROM proformas WHERE proforma_number = 'PROF-002';

INSERT INTO pallets (proforma_id, pallet_number, width_cm, length_cm, height_cm)
SELECT id, 2, 80, 120, 125 FROM proformas WHERE proforma_number = 'PROF-002';

-- PROF-003 için paletler (Büyük sipariş - 4 palet)
INSERT INTO pallets (proforma_id, pallet_number, width_cm, length_cm, height_cm)
SELECT id, 1, 80, 120, 130 FROM proformas WHERE proforma_number = 'PROF-003';

INSERT INTO pallets (proforma_id, pallet_number, width_cm, length_cm, height_cm)
SELECT id, 2, 80, 120, 128 FROM proformas WHERE proforma_number = 'PROF-003';

INSERT INTO pallets (proforma_id, pallet_number, width_cm, length_cm, height_cm)
SELECT id, 3, 80, 120, 132 FROM proformas WHERE proforma_number = 'PROF-003';

INSERT INTO pallets (proforma_id, pallet_number, width_cm, length_cm, height_cm)
SELECT id, 4, 80, 120, 129 FROM proformas WHERE proforma_number = 'PROF-003';
```

## 7. Total Amount Güncelleme

Proforma toplam tutarlarını güncelle (trigger otomatik hesaplayacak ama manuel de yapabiliriz):

```sql
-- Total amount'ları manuel güncelle
UPDATE proformas 
SET total_amount = (
    SELECT SUM(total) 
    FROM proforma_items 
    WHERE proforma_id = proformas.id
)
WHERE proforma_number IN ('PROF-001', 'PROF-002', 'PROF-003');
```

## 8. Verileri Kontrol Et

```sql
-- Müşteri sayısını kontrol et
SELECT COUNT(*) as customer_count FROM customers;

-- Seri sayısını kontrol et
SELECT COUNT(*) as series_count FROM series;

-- Ürün sayısını kontrol et
SELECT COUNT(*) as product_count FROM products;

-- Proforma sayısını kontrol et
SELECT COUNT(*) as proforma_count FROM proformas;

-- Proforma detaylarını göster
SELECT 
    p.proforma_number,
    c.name as customer_name,
    p.total_amount,
    p.status,
    COUNT(pi.id) as item_count
FROM proformas p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN proforma_items pi ON p.id = pi.proforma_id
GROUP BY p.id, c.name
ORDER BY p.proforma_number;

-- Ürünleri series ile birlikte göster
SELECT 
    s.name as series_name,
    p.name as product_name,
    p.price_per_case,
    p.price_per_piece
FROM products p
LEFT JOIN series s ON p.series_id = s.id
ORDER BY s.name, p.name;
```

---

## ⚠️ Önemli Notlar:

1. **Sıra Önemli**: SQL komutlarını yukarıdaki sırayla çalıştırın (foreign key bağımlılıkları)
2. **ID Kontrolü**: Her adımdan sonra verilerin doğru eklendiğini kontrol edin
3. **Test Verisi**: Bu veriler test amaçlıdır, production'da kendi verilerinizi kullanın
4. **Yedek Alın**: Var olan verileriniz varsa önce yedek alın

Bu veriler sistemi tam olarak test etmek için yeterli çeşitlilikte müşteri, ürün ve proforma örneği içeriyor. 