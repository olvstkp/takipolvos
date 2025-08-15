# Stok Yönetimi Backend Yapısı

## Veritabanı Tabloları

### 1. `stock_items` Tablosu
```sql
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(50) UNIQUE NOT NULL,
  stock_name VARCHAR(255) NOT NULL, -- Excel: Stok Adı
  category VARCHAR(100) NOT NULL, -- Excel: Kategori
  unit VARCHAR(20) NOT NULL, -- Excel: BR (Birim)
  current_amount DECIMAL(10,3) NOT NULL DEFAULT 0,
  minimum_level DECIMAL(10,3) NOT NULL DEFAULT 0,
  initial_amount DECIMAL(10,3), -- Excel: Stok Giriş Miktarı
  supplier VARCHAR(255), -- Excel: Tedarikçi
  cost_per_unit DECIMAL(10,2),
  description TEXT,
  storage_location VARCHAR(100),
  system_entry_date DATE, -- Excel: Sisteme Giriş Tarihi
  stock_entry_date DATE, -- Excel: Stokta Giriş Tarihi
  expiry_date DATE, -- Excel: Son Kullanma Tarihi
  delivery_info VARCHAR(255), -- Excel: Teslimat
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);
```

### 2. `stock_movements` Tablosu
```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
  movement_date DATE NOT NULL, -- Excel: Giriş/Çıkış tarihi
  movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('in', 'out')),
  amount DECIMAL(10,3) NOT NULL,
  remaining_amount DECIMAL(10,3) NOT NULL,
  supplier VARCHAR(255),
  expiry_date DATE,
  serial_number VARCHAR(100),
  invoice_number VARCHAR(100),
  waybill_number VARCHAR(100), -- İrsaliye No
  batch_number VARCHAR(100),
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  notes TEXT,
  reference_type VARCHAR(50), -- 'purchase', 'production', 'adjustment', 'return'
  reference_id UUID, -- İlgili sipariş, üretim vs. referansı
  delivery_info VARCHAR(255), -- Excel: Teslimat bilgisi
  system_entry_date DATE, -- Sisteme girildiği tarih
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100)
);
```

### 3. `stock_categories` Tablosu
```sql
CREATE TABLE stock_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES stock_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. `stock_suppliers` Tablosu
```sql
CREATE TABLE stock_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  tax_number VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. `stock_alerts` Tablosu
```sql
CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL, -- 'low_stock', 'expiry_warning', 'out_of_stock'
  alert_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(100)
);
```

## Development Politikaları (RLS Kapalı)

```sql
-- Development ortamı için RLS'yi devre dışı bırak
ALTER TABLE stock_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts DISABLE ROW LEVEL SECURITY;

-- İsteğe bağlı: Production'da aktif edilecek
-- ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
```

## Tetikleyiciler (Triggers)

### 1. Stok Güncelleme Tetikleyicisi
```sql
CREATE OR REPLACE FUNCTION update_stock_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Stok miktarını güncelle
  UPDATE stock_items 
  SET 
    current_amount = current_amount + 
      CASE WHEN NEW.movement_type = 'in' THEN NEW.amount ELSE -NEW.amount END,
    updated_at = NOW(),
    updated_by = NEW.created_by
  WHERE id = NEW.stock_item_id;
  
  -- Kalan miktarı hesapla
  NEW.remaining_amount := (
    SELECT current_amount 
    FROM stock_items 
    WHERE id = NEW.stock_item_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_amount
  BEFORE INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_amount();
```

### 2. Düşük Stok Uyarısı Tetikleyicisi
```sql
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Düşük stok kontrolü
  IF NEW.current_amount <= NEW.minimum_level THEN
    INSERT INTO stock_alerts (stock_item_id, alert_type)
    VALUES (NEW.id, 'low_stock')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Stok tükenmişse
  IF NEW.current_amount <= 0 THEN
    INSERT INTO stock_alerts (stock_item_id, alert_type)
    VALUES (NEW.id, 'out_of_stock')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_low_stock
  AFTER UPDATE OF current_amount ON stock_items
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();
```

### 3. Timestamp Güncelleme Tetikleyicisi
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_items_updated_at
  BEFORE UPDATE ON stock_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Frontend API İhtiyaçları

### Stock Items API
```typescript
interface StockItemAPI {
  // CRUD operasyonları
  getStockItems(filters?: StockFilters): Promise<StockItem[]>
  getStockItem(id: string): Promise<StockItem>
  createStockItem(item: CreateStockItemRequest): Promise<StockItem>
  updateStockItem(id: string, item: UpdateStockItemRequest): Promise<StockItem>
  deleteStockItem(id: string): Promise<void>
  
  // Özel sorgular
  getLowStockItems(): Promise<StockItem[]>
  getStockByCategory(category: string): Promise<StockItem[]>
  searchStockItems(query: string): Promise<StockItem[]>
}
```

### Stock Movements API
```typescript
interface StockMovementAPI {
  // CRUD operasyonları
  getStockMovements(filters?: MovementFilters): Promise<StockMovement[]>
  createStockMovement(movement: CreateMovementRequest): Promise<StockMovement>
  updateMovementNotes(id: string, notes: string): Promise<StockMovement>
  
  // Raporlar
  getMovementsByDateRange(from: Date, to: Date): Promise<StockMovement[]>
  getMovementsByStockItem(stockItemId: string): Promise<StockMovement[]>
  getStockReport(filters?: ReportFilters): Promise<StockReport>
}
```

### Stock Alerts API
```typescript
interface StockAlertAPI {
  getActiveAlerts(): Promise<StockAlert[]>
  resolveAlert(id: string): Promise<void>
  getAlertHistory(): Promise<StockAlert[]>
}
```

## Örnek Veri Yapıları

### StockItem (TypeScript)
```typescript
interface StockItem {
  id: string
  stockCode: string
  stockName: string // Excel: Stok Adı
  category: string // Excel: Kategori  
  unit: string // Excel: BR (Birim)
  currentAmount: number
  minimumLevel: number
  initialAmount?: number // Excel: Stok Giriş Miktarı
  supplier?: string // Excel: Tedarikçi
  costPerUnit?: number
  description?: string
  storageLocation?: string
  systemEntryDate?: string // Excel: Sisteme Giriş Tarihi
  stockEntryDate?: string // Excel: Stokta Giriş Tarihi
  expiryDate?: string // Excel: Son Kullanma Tarihi
  deliveryInfo?: string // Excel: Teslimat
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy?: string
}
```

### StockMovement (TypeScript)
```typescript
interface StockMovement {
  id: string
  stockItemId: string
  movementDate: string
  movementType: 'in' | 'out'
  amount: number
  remainingAmount: number
  supplier?: string
  expiryDate?: string
  serialNumber?: string
  invoiceNumber?: string
  waybillNumber?: string // İrsaliye No
  batchNumber?: string
  unitCost?: number
  totalCost?: number
  notes?: string
  referenceType?: string
  referenceId?: string
  createdAt: string
  createdBy: string
  
  // İlişkili veriler
  stockItem?: StockItem
}
```

## İndeksler

```sql
-- Performans için önemli indeksler
CREATE INDEX idx_stock_items_category ON stock_items(category);
CREATE INDEX idx_stock_items_supplier ON stock_items(supplier);
CREATE INDEX idx_stock_items_stock_code ON stock_items(stock_code);
CREATE INDEX idx_stock_movements_stock_item_id ON stock_movements(stock_item_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_alerts_stock_item_id ON stock_alerts(stock_item_id);
CREATE INDEX idx_stock_alerts_resolved ON stock_alerts(is_resolved);
```

## Güvenlik ve İzinler

### Development Ortamı
- **Tüm kullanıcılar**: Tam erişim (CRUD işlemleri)
- **RLS**: Devre dışı
- **Auth kontrolü**: Yok

### Veri Doğrulama
- Stok kodu benzersiz olmalı
- Hareket miktarı pozitif olmalı
- Çıkış hareketleri mevcut stoktan fazla olamaz
- Tarihler geçerli aralıkta olmalı

## Raporlama İhtiyaçları

### Dashboard Metrikleri
- Toplam stok değeri
- Düşük stok uyarıları sayısı
- Son 30 gün stok hareketleri
- Kategori bazlı stok dağılımı
- En çok hareket eden ürünler

### Excel/PDF Raporları
- Stok durum raporu
- Hareket geçmişi raporu
- Değer analizi raporu
- ABC analizi raporu

## Excel Import/Export Sistemi

### Excel Import Fonksiyonu
```sql
CREATE OR REPLACE FUNCTION import_stock_from_excel(
  p_stock_code VARCHAR,
  p_stock_name VARCHAR,
  p_unit VARCHAR,
  p_initial_amount DECIMAL,
  p_category VARCHAR,
  p_system_entry_date DATE,
  p_stock_entry_date DATE,
  p_expiry_date DATE,
  p_supplier VARCHAR,
  p_delivery_info VARCHAR,
  p_waybill_number VARCHAR
) RETURNS UUID AS $$
DECLARE
  v_stock_item_id UUID;
  v_category_code VARCHAR(2);
BEGIN
  -- Kategori kodunu belirle
  v_category_code := CASE 
    WHEN p_category = 'HAMMADDE' THEN 'HA'
    WHEN p_category = 'KIMYASAL' THEN 'KM'
    WHEN p_category = 'AMBALAJ' THEN 'AM'
    WHEN p_category = 'YARDIMCI MALZEME' THEN 'YA'
    ELSE 'XX'
  END;
  
  -- Stok kalemini ekle
  INSERT INTO stock_items (
    stock_code, stock_name, category, unit, current_amount, initial_amount,
    supplier, system_entry_date, stock_entry_date, expiry_date, delivery_info,
    created_by
  ) VALUES (
    p_stock_code, p_stock_name, p_category, p_unit, p_initial_amount, p_initial_amount,
    p_supplier, p_system_entry_date, p_stock_entry_date, p_expiry_date, p_delivery_info,
    'excel_import'
  ) RETURNING id INTO v_stock_item_id;
  
  -- İlk stok hareketini ekle
  INSERT INTO stock_movements (
    stock_item_id, movement_date, movement_type, amount, remaining_amount,
    supplier, expiry_date, delivery_info, waybill_number, system_entry_date, reference_type,
    created_by
  ) VALUES (
    v_stock_item_id, p_stock_entry_date, 'in', p_initial_amount, p_initial_amount,
    p_supplier, p_expiry_date, p_delivery_info, p_waybill_number, p_system_entry_date, 'initial_import',
    'excel_import'
  );
  
  RETURN v_stock_item_id;
END;
$$ LANGUAGE plpgsql;
```

### Frontend Excel Import
```typescript
interface ExcelStockRow {
  stockCode: string
  stockName: string
  unit: string
  initialAmount: number
  category: string
  systemEntryDate: string
  stockEntryDate: string
  expiryDate?: string
  supplier?: string
  deliveryInfo?: string
  waybillNumber?: string // İrsaliye No
}

class ExcelImportService {
  static async importStockData(excelData: ExcelStockRow[]): Promise<ImportResult> {
    const results = [];
    const errors = [];
    
    for (const row of excelData) {
      try {
        const { data, error } = await supabase.rpc('import_stock_from_excel', {
          p_stock_code: row.stockCode,
          p_stock_name: row.stockName,
          p_unit: row.unit,
          p_initial_amount: row.initialAmount,
          p_category: row.category,
          p_system_entry_date: row.systemEntryDate,
          p_stock_entry_date: row.stockEntryDate,
          p_expiry_date: row.expiryDate || null,
          p_supplier: row.supplier || null,
          p_delivery_info: row.deliveryInfo || null,
          p_waybill_number: row.waybillNumber || null
        });
        
        if (error) {
          errors.push({ row, error: error.message });
        } else {
          results.push({ stockItemId: data, stockCode: row.stockCode });
        }
      } catch (err) {
        errors.push({ row, error: err.message });
      }
    }
    
    return { successes: results, errors };
  }
  
  static parseExcelFile(file: File): Promise<ExcelStockRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          const stockData: ExcelStockRow[] = jsonData.map((row: any) => ({
            stockCode: row['Stok Kodu'],
            stockName: row['Stok Adı'],
            unit: row['BR'],
            initialAmount: parseFloat(row['Stok Giriş Miktarı']),
            category: row['Kategori'],
            systemEntryDate: this.parseExcelDate(row['Sisteme Giriş Tarihi']),
            stockEntryDate: this.parseExcelDate(row['Stokta Giriş Tarihi']),
            expiryDate: this.parseExcelDate(row['Son Kullanma Tarihi']),
            supplier: row['Tedarikçi'],
            deliveryInfo: row['Teslimat'],
            waybillNumber: row['İrsaliye No']
          }));
          
          resolve(stockData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
  
  private static parseExcelDate(excelDate: any): string | null {
    if (!excelDate) return null;
    
    // Excel tarihi sayı formatındaysa
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // String formatındaysa
    if (typeof excelDate === 'string') {
      const date = new Date(excelDate);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }
    
    return null;
  }
}
```
