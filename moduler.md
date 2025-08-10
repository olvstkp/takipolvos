# Modülerleştirme Rehberi (LabelGenerator)

Bu belge, Etiket Oluşturucu sayfasının (LabelGenerator) mimarisini, veri modellerini, akışları, bileşen ayrımlarını ve yapılan geliştirmeleri ayrıntılı şekilde açıklar. Amacı, projeye yeni giren birinin veya gelecekteki bir bakıcının sayfayı hızla kavrayıp güvenle geliştirmeye devam etmesini sağlamaktır.

## 1) Yüksek Seviyede Mimari
- UI: React 18 + TypeScript + Vite + Tailwind CSS
- Durum: React `useState/useEffect` (ileride `useReducer`/Zustand düşünülebilir)
- Önizleme: HTML Canvas (mm → px, DPI: 203/300/600)
- Barkod: EAN‑13 özel üretim (checksum + raster çizim)
- Yazdırma: Tarayıcı print (canvas PNG); ayrıca ZPL üretimi ve indirme
- Depolama: LocalStorage (kullanıcı ayarları) + Supabase (şablonlar ve şirket logoları)

## 2) Dosya Haritası (ilgili)
- `src/pages/LabelGenerator.tsx`: Ana sayfa (state, veri akışı, şablon yönetimi)
- `src/components/StandardForm.tsx`: Standart etiket formu (modüler)
- `src/components/FreeItemsPanel.tsx`: Serbest öğe listesi (modüler)
- `src/components/PreviewCanvas.tsx`: Canvas + overlay (drag/resize) önizleme bileşeni
- `src/components/ConfirmDialog.tsx`: Genel amaçlı onay diyaloğu (modüler)
- `src/lib/supabase.ts`: Supabase istemcisi
- `create_label_templates.sql`: Şablon tablo şeması (projede)

## 3) Yapılan Modülerleştirme (Şimdiye kadar)
1. Serbest ve Standart UI parçaları ayrıştırıldı:
   - Serbest öğe listesi ve katman kontrolleri `FreeItemsPanel.tsx` içine alındı (liste sürükle‑bırak burada yönetiliyor).
   - Standart etiket formu tek bir bileşene taşındı: `StandardForm.tsx`.
   - Önizleme canvas + overlay (drag/resize) `PreviewCanvas.tsx`'e taşındı.
   - Tek tip onay pencereleri için `ConfirmDialog.tsx` eklendi (silme vb.).

2. Sekme Bazlı Render Ayrımı:
   - Standart öğeler (başlık/ürün/detay/barkod) yalnızca `activeTab==='standart'` iken çizilir.
   - Serbest öğeler yalnızca `activeTab==='serbest'` iken çizilir.

3. Şablon Sistemi – Serbest/Standart Ayırımı:
   - Supabase tarafına `label_templates.is_free boolean` sütunu eklendi (ve indexlendi).
   - Kaydet/Güncelle sırasında aktif sekmeye göre `is_free` set edilir.
   - Listeleme, sekmeye göre filtrelenir (Serbest sekmede `is_free=true` olanlar gelir, Standartta `false`).
   - Şablon kartlarında sağ üstte çöp kutusu ikonu ile silme; silmede onay diyaloğu.

4. ZPL ve Önizleme Güncellemesi:
   - ZPL oluşturma butonu kaldırıldı; artık canvas ve ZPL, durum değiştikçe otomatik üretilir.
   - “ZPL İndir” ve “Yazdır” butonları kaldı.

5. Mock Verilerin Kaldırılması:
   - Standart etiket başlangıç `labelData` alanları boş başlar; zorunlu alan yoktur.

6. Serbest Mod İyileştirmeleri:
   - Izgara (grid) ve snap; grid boyutu ayarlanabilir.
   - Drag&drop ve resize için global mousemove/mouseup ile pürüzsüz akış.
   - Resize yumuşatma/sensitivite: `RESIZE_SENS`, `RESIZE_SMOOTH`, küçük hareket filtresi (0.2mm).
   - Katman sistemi: `zIndex` normalize edilir; komşu ile swap (Alt/Üst), listede drag‑drop ile yeniden sıralama.
   - Yeni öğe tipleri: line, circle, ring (çember). Barkod için sol offset uygulanır (kutudan taşmaması için).

7. Standart/Serbest Bağımsızlığı:
   - Standart LocalStorage konumları Serbest’te render edilmez; sekmelerin önizlemeleri bağımsızdır.

## 4) Veri Modelleri ve Durumlar
### LabelData
```
productName, serialNumber, entryDate, expiryDate, amount,
invoiceNumber, batchNumber, supplier, logo, barcode?
```

### Anchors / Styles / Visibility (Standart)
- `anchors`: mm cinsinden konumlar (title, productName, details, barcode)
- `styles`: font boyutları, sarmalama genişliği, barkod yükseklik/genişliği
- `visible`: öğe bazlı görünürlük
- LocalStorage anahtarları: `label_anchors_v1`, `label_styles_v1`, `label_visibility_v1`, `label_zoom`

### Free Items (Serbest)
```
type FreeItemType = 'text' | 'barcode' | 'image' | 'line' | 'circle' | 'ring';
interface FreeItem {
  id, type, x, y, widthMm?, heightMm?, text?, fontMm?, wrapWidthMm?, src?, zIndex?
}
```
- Ek durumlar: `selectedFreeId`, `freeDraft`, `editingFreeId`
- Çizim sırası: `freeItems` zIndex’e göre artan sıralanır
- Liste sürükle‑bırak sıralaması `FreeItemsPanel` içinde kendi lokal drag durumuyla yönetilir.

## 5) Render/Canvas ve ZPL
### mm → px ve mm → dots
- `px = round(mm × (dpi/25.4))`
- `dots = round(mm × (dpi/25.4))`

### Standart Çizim
- Logo (veya metin fallback), ürün adı (wrap), detay satırları, barkod EAN‑13

### Serbest Çizim
- Metin, barkod (EAN‑13), görsel, çizgi, dolu daire ve çember
- Barkod sol offset ~3mm: muhafız çizgiler ve ilk rakam kutu içinde kalsın

### ZPL
- Otomatik üretilir; `^PW`, `^LL`, `^MD`, `^FO`, `^A0N`, `^BCN`/`^BQN`
- İndirme: text blob
- Yazdırma (canvas raster) için ayrı akış (print window)

## 6) Etkileşimler
### Drag & Drop
- Global `mousemove`/`mouseup` dinleyicileri ile akıcı sürükleme
- Snap‑to‑grid aktif ise konum grid’e yuvarlanır

### Resize (pürüzsüz)
- Global `mousemove` üzerinde delta hesaplanır
- Parametreler:
  - `RESIZE_SENS` (ölçek/hassasiyet)
  - `RESIZE_SMOOTH` (lerp katsayısı)
  - 0.2mm altı hareket yok sayılır
- Serbest öğelerde kutu sınırlarını aşmayacak `maxW/maxH` sınırları uygulanır

### Katmanlar
- `normalizeZ`: zIndex’leri 0..N-1 aralığına yeniden yazar
- `moveLayer(id,'up'|'down')`: komşu öğe ile **swap** eder (gerçek katman değişimi)
- Liste sürükle‑bırak (`reorderLayers`): liste sırasına göre zIndex yeniden kurulur

## 7) Şablon Yönetimi
### Supabase Tablosu: `label_templates`
- Sütunlar: `id`, `name`, `data JSONB`, `thumbnail TEXT`, `created_at`, `updated_at`, `is_free BOOLEAN`
- `is_free`: Serbest/Standart ayrımı için eklendi (indexlendi)

### Akışlar
- Kaydet: Tüm state `serializeState()` ile JSON olarak saklanır; `thumbnail` canvas’tan alınır
- Güncelle: Var olan kaydın adı/JSON’u/thumbnail’i yenilenir
- Listeleme: Sekmeye göre `is_free` filtresi
- Aç: JSON state’i sayfaya uygulanır
- Sil: Kartın sağ üst çöp kutusu ile, onay diyaloğu sonrası Supabase’den silinir

## 8) UI Ayrıntıları
- ZPL ve Önizleme otomatik güncellenir
- Grid & Zoom kontrolü; grid görünürlüğü ve snap anahtarları
- Serbest öğe ekleme: Metin/Barkod/Görsel/Çizgi/Daire/Çember (ikonlarla)
- Gelişmiş ayarlar: DPI, görsel koyuluk, ZPL koyuluk (`^MD`)

## 9) Güvenlik ve Performans
- Supabase anon key’i frontend’de; prod ortamda gizli değişkenlerle yönetilmeli
- Thumbnails Base64; istenirse obje depolama veya limitler
- Büyük görseller: çizim önbelleği (freeImageCache)

## 10) Çalıştırma
```
npm install
npm run dev
```

## 11) Bilinen Sınırlar
- Barkod: yalnız EAN‑13
- Yazdırma: raster canvas (doğrudan ZPL gönderimi yapılmıyor – indirilebilir ZPL mevcut)
- State yönetimi sayfa içinde; küresel store yok

---

# Gelecek Yol Haritası (Tavsiye)

1) Bileşen Ayrışmasını Tamamla
- `TemplatesModal.tsx`: Kart grid, arama, silme, açma; `is_free` rozeti.
- `FreeToolbar.tsx`: Serbest araç paleti (öğe ekleme, zoom, grid kontrolleri).

2) Hook’lar ve Context
- `useLabelState` (serialize/apply + dirty kontrol + baselines)
- `useCanvasRender` (mm→px, EAN‑13, darkness, logo cache)
- `LabelProvider` ile sekme bazlı bağımsızlık garanti edilebilir.

3) LocalStorage Anahtarlarını Mod Bazlı Yapılandır
- `label_anchors_standard`, `label_styles_standard`, `label_visibility_standard`
- `free_items_state` (serbest öğeleri de opsiyonel olarak sakla)

4) İyileştirmeler
- Katman UX: “En üste/En alta” ve çoklu seçim (Shift + tıklama)
- Klavye kısayolları: oklar ile 0.5mm hareket; Shift ile 5mm; Ctrl+PgUp/PgDn katman
- Hizalama araçları: sola/sağa/orta, eşit aralıkla dağıtma; grid’e hizalama
- Resize modları: Shift=orantılı, Alt=merkezden ölçekleme
- Araç ipuçları (tooltip) ve ölçü balonları (mm)

5) Performans ve Test
- Canvas çizimini memoize et (yalnızca etkilenen parçaları güncelle)
- Unit test: EAN‑13 checksum, `normalizeEan13`, `moveLayer`, `reorderLayers`
- E2E test: şablon kaydet/aç/güncelle/sil akışları

6) Erişilebilirlik ve i18n
- Butonlara `aria-label`; dialog odak tuzakları
- i18n çeviri altyapısı (Türkçe/İngilizce)

7) Genişletilebilirlik
- Öğe türleri için plugin yaklaşımı (QR, DataMatrix, dinamik alanlar)
- ZPL üretiminde şablonlanabilir layer sistemi (opsiyonel)

---

Bu rehberi izleyerek dosyayı küçük, okunabilir ve test edilebilir parçalara ayırabilir, yeni özellikleri güvenle ekleyebilirsiniz.



