# Stok Kodu Üretimi ve İş Akışları

## Stok Kodu Üretim Sistemi

### 1. Stok Kodu Formatı
```
[KATEGORİ_2_KARAKTER][ÜRÜN_ADI_3_KARAKTER][YY][MM][GG][LOT_2_KARAKTER]
```

**Örnek Formatlar:**
- `HATUZ24091701` - Hammadde + TUZ + 24/09/17 + 01. lot
- `HAHİM24091701` - Hammadde + Hİ MALAYA Tuzu (Hİ+M) + 24/09/17 + 01. lot
- `KMKOS24091702` - Kimyasal + Kostik Soda (KOS) + 24/09/17 + 02. lot
- `AMKAL24091801` - Ambalaj + Kalıp + 24/09/18 + 01. lot

### 2. Kategori Kodları Tablosu
```sql
CREATE TABLE stock_code_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(2) NOT NULL, -- HA, KM, AM, YA
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Günlük lot takibi için tablo
CREATE TABLE daily_lot_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_key VARCHAR(8) NOT NULL, -- YYYYMMDD formatında
  category_code VARCHAR(2) NOT NULL,
  product_prefix VARCHAR(3) NOT NULL,
  current_lot INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date_key, category_code, product_prefix)
);
```

### 3. Ürün Adı Prefix Üretim Fonksiyonu
```sql
CREATE OR REPLACE FUNCTION generate_product_prefix(p_product_name VARCHAR)
RETURNS VARCHAR(3) AS $$
DECLARE
  v_clean_name VARCHAR;
  v_prefix VARCHAR(3);
  v_chars VARCHAR[];
  v_char VARCHAR(1);
  v_index INTEGER := 1;
  v_prefix_length INTEGER := 0;
BEGIN
  -- Ürün adını temizle (Türkçe karakterler korunur)
  v_clean_name := UPPER(TRIM(p_product_name));
  
  -- Boşlukları kaldır ve kelimelerden karakter topla
  v_chars := string_to_array(replace(v_clean_name, ' ', ''), NULL);
  v_prefix := '';
  
  -- İlk 3 karakteri al (boşluklar hariç)
  FOREACH v_char IN ARRAY v_chars
  LOOP
    IF v_prefix_length < 3 THEN
      -- Sadece harf ve sayı karakterlerini al
      IF v_char ~ '[A-ZÇĞıİÖŞÜ0-9]' THEN
        v_prefix := v_prefix || v_char;
        v_prefix_length := v_prefix_length + 1;
      END IF;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  -- Eğer 3 karakterden az ise, eksikleri 'X' ile doldur
  WHILE LENGTH(v_prefix) < 3 LOOP
    v_prefix := v_prefix || 'X';
  END LOOP;
  
  RETURN v_prefix;
END;
$$ LANGUAGE plpgsql;
```

### 4. Stok Kodu Üretim Fonksiyonu
```sql
CREATE OR REPLACE FUNCTION generate_stock_code(p_category VARCHAR, p_product_name VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  v_category_code VARCHAR(2);
  v_product_prefix VARCHAR(3);
  v_date_key VARCHAR(8);
  v_date_part VARCHAR(6);
  v_current_lot INTEGER;
  v_stock_code VARCHAR(50);
BEGIN
  -- Kategori kodunu al
  SELECT category_code
  INTO v_category_code
  FROM stock_code_categories 
  WHERE category_name = p_category AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kategori bulunamadı: %', p_category;
  END IF;
  
  -- Ürün prefix'ini oluştur
  v_product_prefix := generate_product_prefix(p_product_name);
  
  -- Tarih formatını oluştur (YYMMDD)
  v_date_key := TO_CHAR(NOW(), 'YYYYMMDD');
  v_date_part := TO_CHAR(NOW(), 'YYMMDD');
  
  -- Günlük lot sayacını al ve artır
  INSERT INTO daily_lot_counters (date_key, category_code, product_prefix, current_lot)
  VALUES (v_date_key, v_category_code, v_product_prefix, 1)
  ON CONFLICT (date_key, category_code, product_prefix)
  DO UPDATE SET current_lot = daily_lot_counters.current_lot + 1
  RETURNING current_lot INTO v_current_lot;
  
  -- Stok kodunu oluştur: [KATEGORİ_2][ÜRÜN_3][YYMMDD][LOT_2]
  v_stock_code := v_category_code || v_product_prefix || v_date_part || 
                  LPAD(v_current_lot::VARCHAR, 2, '0');
  
  -- Benzersizlik kontrolü (güvenlik için)
  WHILE EXISTS (SELECT 1 FROM stock_items WHERE stock_code = v_stock_code) LOOP
    -- Lot numarasını artır
    UPDATE daily_lot_counters 
    SET current_lot = current_lot + 1
    WHERE date_key = v_date_key AND category_code = v_category_code AND product_prefix = v_product_prefix
    RETURNING current_lot INTO v_current_lot;
    
    v_stock_code := v_category_code || v_product_prefix || v_date_part || 
                    LPAD(v_current_lot::VARCHAR, 2, '0');
  END LOOP;
  
  RETURN v_stock_code;
END;
$$ LANGUAGE plpgsql;
```

### 5. Frontend Stok Kodu Üretimi
```typescript
// Stok kodu üretim servisi
class StockCodeService {
  static async generateStockCode(category: string, productName: string): Promise<string> {
    const { data, error } = await supabase.rpc('generate_stock_code', {
      p_category: category,
      p_product_name: productName
    });
    
    if (error) throw error;
    return data;
  }
  
  static async validateStockCode(stockCode: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('stock_items')
      .select('id')
      .eq('stock_code', stockCode);
    
    if (error) throw error;
    return data.length === 0; // Eğer sonuç yoksa unique
  }
  
  // Ürün adından prefix üretme (frontend önizleme için)
  static generateProductPrefix(productName: string): string {
    const cleanName = productName.toUpperCase().trim();
    const withoutSpaces = cleanName.replace(/\s+/g, '');
    const chars = withoutSpaces.split('').filter(char => 
      /[A-ZÇĞIİÖŞÜ0-9]/.test(char)
    );
    
    let prefix = chars.slice(0, 3).join('');
    while (prefix.length < 3) {
      prefix += 'X';
    }
    
    return prefix;
  }
  
  // Stok kodu önizlemesi (kaydetmeden önce gösterim için)
  static previewStockCode(category: string, productName: string): string {
    const categoryMap: Record<string, string> = {
      'Hammadde': 'HA',
      'Kimyasal': 'KM', 
      'Ambalaj': 'AM',
      'Yardımcı Malzeme': 'YA'
    };
    
    const categoryCode = categoryMap[category] || 'XX';
    const productPrefix = this.generateProductPrefix(productName);
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    
    return `${categoryCode}${productPrefix}${dateStr}01`;
  }
}
```

## İş Akışı 1: Yeni Stok Ürünü Ekleme

### Adım 1: Form Hazırlığı
```typescript
const StockItemForm = () => {
  const [formData, setFormData] = useState({
    stockCode: '', // Otomatik üretilecek
    productName: '',
    category: 'Hammadde',
    unit: 'Kg',
    currentAmount: 0,
    minimumLevel: 0,
    supplier: '',
    costPerUnit: 0,
    description: '',
    storageLocation: ''
  });
  
  // Kategori veya ürün adı değiştiğinde stok kodu önizlemesi
  useEffect(() => {
    if (formData.category && formData.productName) {
      const preview = StockCodeService.previewStockCode(formData.category, formData.productName);
      setFormData(prev => ({ ...prev, stockCode: preview }));
    }
  }, [formData.category, formData.productName]);
  
  const generateFinalCode = async () => {
    try {
      const code = await StockCodeService.generateStockCode(formData.category, formData.productName);
      setFormData(prev => ({ ...prev, stockCode: code }));
    } catch (error) {
      showToast('Stok kodu oluşturulamadı', 'error');
    }
  };
};
```

### Adım 2: Validasyon
```typescript
const validateStockItem = (data: StockItemForm): ValidationResult => {
  const errors: string[] = [];
  
  // Zorunlu alanlar
  if (!data.stockCode.trim()) errors.push('Stok kodu gerekli');
  if (!data.productName.trim()) errors.push('Ürün adı gerekli');
  if (data.currentAmount < 0) errors.push('Miktar negatif olamaz');
  if (data.minimumLevel < 0) errors.push('Minimum seviye negatif olamaz');
  
  // Stok kodu format kontrolü: [KATEGORİ_2][ÜRÜN_3][YYMMDD][LOT_2]
  const codePattern = /^[A-ZÇĞIİÖŞÜ]{2}[A-ZÇĞIİÖŞÜX]{3}\d{6}\d{2}$/;
  if (!codePattern.test(data.stockCode)) {
    errors.push('Stok kodu formatı geçersiz (XXXXXYYMMDDLL)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### Adım 3: Veritabanına Kayıt
```typescript
const createStockItem = async (data: StockItemForm): Promise<StockItem> => {
  // Validasyon
  const validation = validateStockItem(data);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }
  
  // Benzersizlik kontrolü
  const isUnique = await StockCodeService.validateStockCode(data.stockCode);
  if (!isUnique) {
    throw new Error('Bu stok kodu zaten kullanımda');
  }
  
  // Veritabanına kaydet
  const { data: newItem, error } = await supabase
    .from('stock_items')
    .insert({
      stock_code: data.stockCode,
      product_name: data.productName,
      category: data.category,
      unit: data.unit,
      current_amount: data.currentAmount,
      minimum_level: data.minimumLevel,
      supplier: data.supplier,
      cost_per_unit: data.costPerUnit,
      description: data.description,
      storage_location: data.storageLocation,
      created_by: getCurrentUserId()
    })
    .select()
    .single();
    
  if (error) throw error;
  
  // İlk stok hareketi oluştur (açılış)
  if (data.currentAmount > 0) {
    await createInitialMovement(newItem.id, data.currentAmount);
  }
  
  return newItem;
};
```

## İş Akışı 2: Stok Hareketi Ekleme

### Adım 1: Hareket Türü Belirleme
```typescript
type MovementType = 'in' | 'out';
type MovementReason = 
  | 'purchase'      // Satın alma
  | 'production'    // Üretim
  | 'adjustment'    // Düzeltme
  | 'return'        // İade
  | 'transfer'      // Transfer
  | 'waste'         // Fire
  | 'sale';         // Satış

interface MovementContext {
  type: MovementType;
  reason: MovementReason;
  referenceId?: string; // İlgili belge ID'si
  requiresApproval: boolean;
}
```

### Adım 2: Stok Kontrolleri
```typescript
const validateStockMovement = async (
  stockItemId: string, 
  amount: number, 
  type: MovementType
): Promise<ValidationResult> => {
  const errors: string[] = [];
  
  // Stok kalemini al
  const { data: stockItem, error } = await supabase
    .from('stock_items')
    .select('*')
    .eq('id', stockItemId)
    .single();
    
  if (error || !stockItem) {
    errors.push('Stok kalemi bulunamadı');
    return { isValid: false, errors };
  }
  
  // Çıkış kontrolü
  if (type === 'out' && stockItem.current_amount < amount) {
    errors.push(`Yetersiz stok! Mevcut: ${stockItem.current_amount} ${stockItem.unit}`);
  }
  
  // Miktar kontrolü
  if (amount <= 0) {
    errors.push('Hareket miktarı pozitif olmalı');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### Adım 3: Hareket Kaydı ve Stok Güncelleme
```typescript
const createStockMovement = async (movementData: CreateMovementRequest): Promise<StockMovement> => {
  // Validasyon
  const validation = await validateStockMovement(
    movementData.stockItemId,
    movementData.amount,
    movementData.movementType
  );
  
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }
  
  // Transaction başlat
  const { data, error } = await supabase.rpc('create_stock_movement_transaction', {
    p_stock_item_id: movementData.stockItemId,
    p_movement_date: movementData.movementDate,
    p_movement_type: movementData.movementType,
    p_amount: movementData.amount,
    p_supplier: movementData.supplier,
    p_expiry_date: movementData.expiryDate,
    p_serial_number: movementData.serialNumber,
    p_invoice_number: movementData.invoiceNumber,
    p_batch_number: movementData.batchNumber,
    p_unit_cost: movementData.unitCost,
    p_notes: movementData.notes,
    p_reference_type: movementData.referenceType,
    p_reference_id: movementData.referenceId,
    p_created_by: getCurrentUserId()
  });
  
  if (error) throw error;
  return data;
};
```

### Adım 4: Transaction Fonksiyonu
```sql
CREATE OR REPLACE FUNCTION create_stock_movement_transaction(
  p_stock_item_id UUID,
  p_movement_date DATE,
  p_movement_type VARCHAR,
  p_amount DECIMAL,
  p_supplier VARCHAR DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_serial_number VARCHAR DEFAULT NULL,
  p_invoice_number VARCHAR DEFAULT NULL,
  p_batch_number VARCHAR DEFAULT NULL,
  p_unit_cost DECIMAL DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  v_movement_id UUID;
  v_current_amount DECIMAL;
  v_new_amount DECIMAL;
BEGIN
  -- Mevcut stok miktarını al
  SELECT current_amount INTO v_current_amount
  FROM stock_items
  WHERE id = p_stock_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stok kalemi bulunamadı';
  END IF;
  
  -- Çıkış kontrolü
  IF p_movement_type = 'out' AND v_current_amount < p_amount THEN
    RAISE EXCEPTION 'Yetersiz stok! Mevcut: %, İstenen: %', v_current_amount, p_amount;
  END IF;
  
  -- Yeni miktarı hesapla
  IF p_movement_type = 'in' THEN
    v_new_amount := v_current_amount + p_amount;
  ELSE
    v_new_amount := v_current_amount - p_amount;
  END IF;
  
  -- Stok hareketi kaydet
  INSERT INTO stock_movements (
    stock_item_id, movement_date, movement_type, amount, remaining_amount,
    supplier, expiry_date, serial_number, invoice_number, batch_number,
    unit_cost, total_cost, notes, reference_type, reference_id, created_by
  ) VALUES (
    p_stock_item_id, p_movement_date, p_movement_type, p_amount, v_new_amount,
    p_supplier, p_expiry_date, p_serial_number, p_invoice_number, p_batch_number,
    p_unit_cost, (p_unit_cost * p_amount), p_notes, p_reference_type, p_reference_id, p_created_by
  ) RETURNING id INTO v_movement_id;
  
  -- Stok miktarını güncelle
  UPDATE stock_items 
  SET 
    current_amount = v_new_amount,
    updated_at = NOW(),
    updated_by = p_created_by
  WHERE id = p_stock_item_id;
  
  -- Düşük stok kontrolü
  PERFORM check_stock_alerts(p_stock_item_id);
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;
```

## İş Akışı 3: Stok Uyarı Sistemi

### Adım 1: Uyarı Kontrol Fonksiyonu
```sql
CREATE OR REPLACE FUNCTION check_stock_alerts(p_stock_item_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_amount DECIMAL;
  v_minimum_level DECIMAL;
  v_product_name VARCHAR;
BEGIN
  -- Stok bilgilerini al
  SELECT current_amount, minimum_level, product_name
  INTO v_current_amount, v_minimum_level, v_product_name
  FROM stock_items
  WHERE id = p_stock_item_id;
  
  -- Önceki uyarıları temizle
  UPDATE stock_alerts 
  SET is_resolved = true, resolved_at = NOW()
  WHERE stock_item_id = p_stock_item_id AND is_resolved = false;
  
  -- Stok tükenmişse
  IF v_current_amount <= 0 THEN
    INSERT INTO stock_alerts (stock_item_id, alert_type, alert_message)
    VALUES (p_stock_item_id, 'out_of_stock', v_product_name || ' stoku tükendi!');
    
  -- Düşük stoksa
  ELSIF v_current_amount <= v_minimum_level THEN
    INSERT INTO stock_alerts (stock_item_id, alert_type, alert_message)
    VALUES (p_stock_item_id, 'low_stock', 
            v_product_name || ' düşük seviyede! Mevcut: ' || v_current_amount);
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Adım 2: Frontend Uyarı Sistemi
```typescript
const useStockAlerts = () => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchAlerts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stock_alerts')
      .select(`
        *,
        stock_items (
          product_name,
          current_amount,
          minimum_level,
          unit
        )
      `)
      .eq('is_resolved', false)
      .order('alert_date', { ascending: false });
      
    if (error) {
      showToast('Uyarılar yüklenemedi', 'error');
    } else {
      setAlerts(data || []);
    }
    setLoading(false);
  };
  
  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('stock_alerts')
      .update({ 
        is_resolved: true, 
        resolved_at: new Date().toISOString(),
        resolved_by: getCurrentUserId()
      })
      .eq('id', alertId);
      
    if (error) {
      showToast('Uyarı çözümlenemedi', 'error');
    } else {
      await fetchAlerts(); // Yenile
      showToast('Uyarı çözümlendi', 'success');
    }
  };
  
  return { alerts, loading, fetchAlerts, resolveAlert };
};
```

## İş Akışı 4: Stok Raporu Üretimi

### Adım 1: Rapor Filtreleri
```typescript
interface StockReportFilters {
  dateFrom?: string;
  dateTo?: string;
  categories?: string[];
  suppliers?: string[];
  movementTypes?: MovementType[];
  includeZeroStock?: boolean;
  includeInactive?: boolean;
}
```

### Adım 2: Rapor Üretim Fonksiyonu
```sql
CREATE OR REPLACE FUNCTION generate_stock_report(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_categories TEXT[] DEFAULT NULL,
  p_suppliers TEXT[] DEFAULT NULL
) RETURNS TABLE (
  stock_code VARCHAR,
  product_name VARCHAR,
  category VARCHAR,
  current_amount DECIMAL,
  minimum_level DECIMAL,
  unit VARCHAR,
  total_in DECIMAL,
  total_out DECIMAL,
  movement_count BIGINT,
  last_movement_date DATE,
  stock_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    si.stock_code,
    si.product_name,
    si.category,
    si.current_amount,
    si.minimum_level,
    si.unit,
    COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.amount ELSE 0 END), 0) as total_in,
    COALESCE(SUM(CASE WHEN sm.movement_type = 'out' THEN sm.amount ELSE 0 END), 0) as total_out,
    COUNT(sm.id) as movement_count,
    MAX(sm.movement_date) as last_movement_date,
    (si.current_amount * COALESCE(si.cost_per_unit, 0)) as stock_value
  FROM stock_items si
  LEFT JOIN stock_movements sm ON si.id = sm.stock_item_id
    AND (p_date_from IS NULL OR sm.movement_date >= p_date_from)
    AND (p_date_to IS NULL OR sm.movement_date <= p_date_to)
  WHERE 
    (p_categories IS NULL OR si.category = ANY(p_categories))
    AND (p_suppliers IS NULL OR si.supplier = ANY(p_suppliers))
  GROUP BY si.id, si.stock_code, si.product_name, si.category, 
           si.current_amount, si.minimum_level, si.unit, si.cost_per_unit
  ORDER BY si.category, si.product_name;
END;
$$ LANGUAGE plpgsql;
```

### Adım 3: Excel Export
```typescript
const exportStockReport = async (filters: StockReportFilters) => {
  // Rapor verilerini al
  const { data, error } = await supabase.rpc('generate_stock_report', {
    p_date_from: filters.dateFrom || null,
    p_date_to: filters.dateTo || null,
    p_categories: filters.categories || null,
    p_suppliers: filters.suppliers || null
  });
  
  if (error) throw error;
  
  // Excel dosyası oluştur
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Sütun genişlikleri
  worksheet['!cols'] = [
    { width: 15 }, // Stok Kodu
    { width: 30 }, // Ürün Adı
    { width: 15 }, // Kategori
    { width: 12 }, // Miktar
    { width: 12 }, // Min. Seviye
    { width: 8 },  // Birim
    { width: 12 }, // Toplam Giriş
    { width: 12 }, // Toplam Çıkış
    { width: 12 }, // Hareket Sayısı
    { width: 15 }, // Son Hareket
    { width: 15 }  // Stok Değeri
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stok Raporu');
  
  // Dosyayı indir
  const fileName = `stok_raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
```

## Örnek Kategori Verileri

```sql
INSERT INTO stock_code_categories (category_name, category_code) VALUES
('Hammadde', 'HA'),
('Kimyasal', 'KM'),
('Ambalaj', 'AM'),
('Yardımcı Malzeme', 'YA'),
('Temizlik', 'TM'),
('Kırtasiye', 'KT'),
('Elektronik', 'EL'),
('Makine Yedek Parça', 'MY');
```

## Stok Kodu Örnekleri

### Gerçek Örnekler
```
TUZ (Hammadde, 17 Eylül 2024):
- Kategori: Hammadde (HA)
- Ürün: TUZ → TUZ
- Tarih: 24/09/17 → 240917
- Lot: 01
- Kod: HATUZ24091701

Hİ MALAYA Tuzu (Hammadde, 17 Eylül 2024):
- Kategori: Hammadde (HA) 
- Ürün: Hİ MALAYA Tuzu → HİM (boşluk sayılmaz)
- Tarih: 24/09/17 → 240917
- Lot: 01
- Kod: HAHİM24091701

Kostik Soda (Kimyasal, 17 Eylül 2024, 2. lot):
- Kategori: Kimyasal (KM)
- Ürün: Kostik Soda → KOS
- Tarih: 24/09/17 → 240917
- Lot: 02
- Kod: KMKOS24091702

ABC Kalıp (Ambalaj, 18 Eylül 2024):
- Kategori: Ambalaj (AM)
- Ürün: ABC Kalıp → ABC
- Tarih: 24/09/18 → 240918
- Lot: 01
- Kod: AMABC24091801
```

Bu sistem ile her kategoride benzersiz, otomatik üretilen ve takip edilebilir stok kodları oluşturabilir, tüm stok işlemlerini güvenli şekilde yönetebilirsiniz.
