# Products Tablosu Yapısı

## Tablo Bilgileri
- **Tablo Adı:** `products`
- **Schema:** `public`
- **RLS:** Devre dışı
- **Boyut:** 152 kB
- **Kayıt Sayısı:** 13 aktif, 42 silinmiş

## Sütun Yapısı

| Sıra | Sütun Adı | Veri Tipi | Nullable | Default | Açıklama |
|------|-----------|-----------|----------|---------|----------|
| 1 | `id` | `uuid` | ❌ | `gen_random_uuid()` | Birincil anahtar |
| 2 | `name` | `varchar` | ❌ | - | Ürün adı |
| 3 | `series_id` | `uuid` | ✅ | - | Seri referansı (series tablosu) |
| 4 | `price_per_case` | `numeric` | ❌ | - | Koli fiyatı (EUR) |
| 5 | `price_per_piece` | `numeric` | ❌ | - | Adet fiyatı (EUR) |
| 6 | `barcode` | `varchar` | ✅ | - | Barkod |
| 7 | `is_active` | `boolean` | ✅ | `true` | Aktif durumu |
| 8 | `created_at` | `timestamptz` | ✅ | `now()` | Oluşturulma tarihi |
| 9 | `updated_at` | `timestamptz` | ✅ | `now()` | Güncellenme tarihi |
| 10 | `proforma_group_id` | `varchar` | ✅ | - | Proforma grubu ID referansı |
| 11 | `price_per_case_usd` | `numeric` | ✅ | - | Koli fiyatı (USD) |
| 12 | `price_per_piece_usd` | `numeric` | ✅ | - | Adet fiyatı (USD) |

## İlişkiler

### Foreign Key İlişkileri
1. **series_id** → `series.id`
   - Ürünün hangi seriye ait olduğunu belirtir
   
2. **proforma_group_id** → `proforma_groups.id`
   - Ürünün hangi proforma grubuna ait olduğunu belirtir

### Referans Veren Tablolar
1. **proforma_items.product_id** → `products.id`
   - Proforma kalemlerinde ürün referansı

## Önemli Notlar

- **Fiyat Yapısı:** Hem EUR hem USD fiyatları ayrı ayrı tutuluyor
- **Seri Bağlantısı:** Her ürün bir seriye bağlı olabilir (opsiyonel)
- **Proforma Grubu:** Ürünler proforma gruplarına atanabilir
- **Aktiflik:** `is_active` ile ürünler pasif hale getirilebilir
- **Barkod:** Opsiyonel barkod alanı
- **Zaman Damgaları:** Otomatik oluşturulma ve güncellenme tarihleri

## Excel Import İçin Gerekli Alanlar

Excel import yaparken aşağıdaki alanlar gerekli olacak:
- `name` (Ürün Adı) - **Zorunlu**
- `price_per_piece` (Adet Fiyatı EUR) - **Zorunlu**
- `price_per_piece_usd` (Adet Fiyatı USD) - **Opsiyonel**
- `series_id` (Seri ID) - **Opsiyonel**
- `proforma_group_id` (Proforma Grubu ID) - **Opsiyonel**
- `barcode` (Barkod) - **Opsiyonel** 