# Modül Detayları: Proforma Oluşturucu

Bu doküman, proforma oluşturma modülünün iş akışını, veri gereksinimlerini ve fonksiyonel özelliklerini detaylandırır.

## 1. İş Akışı ve Kullanıcı Senaryosu
1.  **Tür Seçimi:** Kullanıcı, proformanın "Koli" (Case) bazlı mı yoksa "Tane" (Piece) bazlı mı hesaplanacağını seçerek süreci başlatır.
2.  **Müşteri Seçimi:** Sistemde kayıtlı müşteriler arasından arama yaparak veya listeden seçerek proformanın oluşturulacağı müşteriyi belirler. Müşteri seçildiğinde, fatura ve teslimat adresleri gibi bilgiler ilgili alanlara otomatik olarak dolar.
3.  **Ürün Ekleme:** Kullanıcı, "Ürün Ekle" butonu ile proformaya yeni bir satır ekler. Açılan satırda, sistemdeki ürünleri aratabilir ve seçebilir.
4.  **Miktar Girişi:** Seçilen ürün için miktar girilir.
5.  **Otomatik Hesaplama:** Sistem, en başta seçilen "Koli/Tane" türüne göre ilgili ürünün birim fiyatını otomatik olarak getirir ve girilen miktarla çarparak satır toplamını hesaplar.
6.  **Genel Toplam:** Eklenen tüm ürünlerin toplam tutarı, proformanın genel toplamını oluşturur.
7.  **Diğer Bilgiler:** Ödeme şekli, banka bilgileri, teslimat notları gibi ek alanlar doldurulur.
8.  **İşlemler:** Kullanıcı, oluşturduğu proformayı kaydedebilir, önizleyebilir veya PDF olarak dışa aktarabilir.

## 2. Gerekli Veri Modelleri (Tablolar)

Proformanın doğru çalışabilmesi için aşağıdaki veri yapılarına (veya veritabanı tablolarına) ihtiyaç duyulacaktır. Geliştirme aşamasında bu yapılar için TypeScript `interface`'leri oluşturulacaktır.

-   **`Customer` (Müşteri):**
    -   `id`: Benzersiz kimlik
    -   `name`: Müşteri adı (Örn: "BERFINI S.R.O.")
    -   `address`: Adres bilgisi
    -   `taxId`: Vergi Numarası (Örn: "CZ08251711")
    -   `contactPerson`: İlgili kişi (Örn: "SEZEN ÇAKIR")

-   **`Product` (Ürün):**
    -   `id`: Benzersiz kimlik
    -   `name`: Ürün adı (Örn: "OLIVOS SELENE'S SERENITY OLIVE OIL SOAP 500ML X12- GOAT MILK")
    -   `sku`: Stok kodu
    -   `series`: Ürün serisi (Gruplama için, örn: "500X12")
    -   `pricePerCase`: Koli birim fiyatı
    -   `pricePerPiece`: Tane birim fiyatı
    -   `net_weight_kg_per_piece`: Tek bir ürünün net ağırlığı (örn: 0.5)
    -   `piecesPerCase`: Bir kolideki ürün adedi (örn: 12)
    -   `packaging_weight_kg_per_case`: Koli ambalajının ağırlığı (paletsiz dara)
    -   `width_cm`: Genişlik (koli)
    -   `height_cm`: Yükseklik (koli)
    -   `depth_cm`: Derinlik (koli)

-   **`Proforma` (Proforma Kaydı):**
    -   `id`: Benzersiz kimlik
    -   `proformaNumber`: Proforma numarası (Örn: "PROF 1")
    -   `customerId`: Müşteri ID'si
    -   `issueDate`: Oluşturma tarihi
    -   `items`: Proforma kalemlerini içeren liste (`ProformaItem[]`)
    -   `totalAmount`: Toplam tutar
    -   `paymentMethod`: Ödeme yöntemi (Örn: "CASH IN ADVANCE")
    -   `bankDetails`: Banka bilgileri
    -   `status`: Durum (Taslak, Gönderildi, Onaylandı)

-   **`ProformaItem` (Proforma Kalemi):**
    -   `productId`: Ürün ID'si
    -   `description`: Ürün açıklaması
    -   `quantity`: Miktar
    -   `unitPrice`: Birim Fiyat
    -   `total`: Satır Toplamı 

## 3. Sayfa 2: Packing List (Paketleme Listesi)

Proforma sürecinin ikinci adımı, gümrük ve lojistik işlemleri için kritik olan Paketleme Listesi'nin (Packing List) oluşturulmasıdır. Bu liste, proformadaki ürünlerin fiziksel özelliklerini ve paketleme detaylarını içerir.

### 3.1. Temel Mantık ve Hesaplama Yöntemleri

- **Ürün Gruplama:** Fiziksel olarak benzer boyut ve ağırlıktaki ürünler (örneğin tüm 500ml'lik şişeler), hesaplama kolaylığı için tek bir kalemde gruplanır. Gümrük için önemli olan toplam ağırlık ve hacimdir.
- **Hesaplama Esası:** Tıpkı proformada olduğu gibi, hesaplamalar "Koli" (Case) veya "Adet" (Piece) bazlı yapılabilir. Bu seçim, tüm ağırlık ve adet hesaplamalarını etkiler.
- **Palet Ağırlığı Dağılımı:** Toplam sevkiyatın palet ağırlığı, her bir koliye veya ürüne oransal olarak dağıtılır.

### 3.2. Hesaplama Detayları (Koli Bazlı Senaryo)

Aşağıdaki hesaplamalar, bir ürün grubunun **koli başına** değerlerini bulmak için kullanılır.

1.  **Net Ağırlık (`WEIGHT Kg/box`):** Bir kolinin içindeki ürünlerin toplam net ağırlığıdır.
    -   *Örnek:* 500ml'lik 12'li bir koli için `0.5 kg/adet * 12 adet = 6.00 kg`.

2.  **Koli Başına Palet Ağırlığı:** Toplam palet ağırlığının toplam koli sayısına bölünmesiyle bulunur.
    -   `Toplam Palet Ağırlığı = Palet Sayısı * Bir Paletin Ağırlığı` (Örn: 4 palet * 20 kg/palet = 80 kg)
    -   `Koli Başına Palet Ağırlığı = Toplam Palet Ağırlığı / Toplam Koli Sayısı` (Örn: 80 kg / 232 koli = 0.34 kg)

3.  **Dara (`TARE Kg/box`):** Ürün dışındaki her şeyin (koli ambalajı + koli başına düşen palet payı) ağırlığıdır.
    -   `Dara = Koli Ambalaj Ağırlığı + Koli Başına Palet Ağırlığı`
    -   *Örnek:* Bir kolinin ambalajı 1.66 kg ise, `1.66 kg + 0.34 kg = 2.00 kg`.

4.  **Brüt Ağırlık (`BRUT WEIGHT Kg/box`):** Bir kolinin tüm bileşenleriyle birlikte toplam ağırlığıdır.
    -   `Brüt Ağırlık = Net Ağırlık + Dara`
    -   *Örnek:* `6.00 kg + 2.00 kg = 8.00 kg`.

### 3.3. Hesaplama Detayları (Adet Bazlı Senaryo)

Eğer hesaplama "Adet" bazlı yapılırsa mantık benzerdir, ancak dağıtım birimleri değişir:
- **Net Ağırlık:** Tek bir ürünün net ağırlığı baz alınır (Örn: 0.5 kg).
- **Adet Başına Palet Ağırlığı:** `Toplam Palet Ağırlığı / Toplam Ürün Adedi` formülü ile hesaplanır.
- **Dara:** Tek bir ürünün ambalaj ağırlığı (varsa) ve adet başına düşen palet ağırlığının toplamıdır.

### 3.4. Tablo Doldurma ve Final Hesaplamalar

1.  **Ürün Gruplama (`series`):**
    -   Packing List oluşturulurken, proformadaki ürünler `series` alanına göre gruplanır. Aynı seriye sahip ürünlerin miktarları toplanır ve listede tek bir satır olarak temsil edilir.
    -   Örneğin, proformada "500X12" serisinden 3 farklı üründen 10'ar koli varsa, Packing List'te bu seri için tek bir satır ve `CUP /CASES` sütununda toplam "30" değeri görünür.

2.  **Miktar Sütunu (`CUP /CASES`):**
    -   Bu sütun, gruplanmış ürünlerin proformadaki toplam koli (veya adet) sayısını gösterir.
    -   Hesaplama "Adet" bazlı ise, sütun başlığı **"CUP / PIECE"** olarak değişmelidir.

3.  **Final Toplamları:**
    -   Her ürün grubu (her satır) için `TOTAL KG`, `TOTAL TARE`, `BRÜT KG` ve `ADET/PCS` gibi nihai değerler hesaplanır.
    -   Tablonun en altında, bu sütunların genel toplamını gösteren bir **özet satırı** bulunmalıdır.

4.  **İhmal Edilecek Alanlar:**
    -   Kullanıcının belirttiği üzere `width`, `height`, `high` ve `M3` sütunları hesaplamalara dahil edilmez ve arayüzde boş bırakılabilir.


## 4. Sayfa 3: Packing List - Özet
Bu son sayfa, 2. sayfada ("Packing List") hesaplanan verilerin dikey ve özetlenmiş bir formatta sunulduğu nihai rapordur.

### 4.1. Ürün Bazlı Özet
-   Bu bölümde, proformadaki her bir ürün türü (ticari değeri olmayanlar dahil) için ayrı bir özet kartı oluşturulur.
-   Her kartta aşağıdaki bilgiler yer alır:
    -   `Total Number of Cases`: O ürüne ait toplam koli sayısı.
    -   `Total number of [ürün adı]`: O ürüne ait toplam adet.
    -   `Net Weight`: O ürünün toplam net ağırlığı.
    -   `Gross Weight`: O ürünün toplam brüt ağırlığı.

### 4.2. Genel Sevkiyat Özeti
-   Sayfanın en altında, tüm sevkiyat için genel toplamları içeren bir özet tablosu bulunur.
-   Bu tabloda yer alan veriler:
    -   `TOTAL NUMBER OF CASES`: Sevkiyattaki toplam koli sayısı.
    -   `TOTAL NUMBER OF SOAPS AND PRODUCTS`: Sevkiyattaki tüm ürünlerin toplam adedi.
    -   `NET KG`: Tüm sevkiyatın toplam net ağırlığı.
    -   `GROSS KG`: Tüm sevkiyatın toplam brüt ağırlığı.
    -   `NUMBER OF PALLETS`: Sevkiyattaki toplam palet sayısı.
    -   `WIDTHXLENGTHXHEIGHT`: Her bir paletin kendine ait "GenişlikxUzunlukxYükseklik" ölçüsü listelenir. Bu, paletlerin farklı boyutlarda olabileceğini gösterir.

### 3.5. Gerekli Ek Veri Modelleri

Bu hesaplamaları yapabilmek için sipariş bazında palet bilgilerini tutmak için yeni bir modele ihtiyaç vardır:

-   **`ShipmentInfo` (Sevkiyat Bilgisi):**
    -   `proformaId`: İlgili proforma ID'si
    -   `weight_per_pallet_kg`: Tek bir paletin standart ağırlığı
    -   `pallets`: Sevkiyata dahil olan paletlerin listesi (`Pallet[]`)

-   **`Pallet` (Palet):**
    -   `pallet_number`: Paletin numarası (örn: 1, 2, 3...)
    -   `width_cm`: Genişlik (örn: 80)
    -   `length_cm`: Uzunluk (örn: 120)
    -   `height_cm`: Yükseklik (örn: 124) 