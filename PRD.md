# Ürün Gereksinimleri Dokümanı (PRD) - Olivos Sabun Üretim Yönetim Sistemi

## 1. Ürüne Genel Bakış
Bu doküman, zeytinyağı sabunu üreten bir firma için geliştirilen üretim ve operasyon yönetim yazılımının gereksinimlerini özetlemektedir. Projenin ana amacı, sabun üretim sürecini baştan sona dijitalleştirmek, takip etmek ve optimize etmektir.

## 2. Amaç
Yazılımın temel amacı, ham madde tedariğinden nihai ürünün etiketlenmesine kadar olan tüm süreçleri tek bir platformda birleştirmektir. Bu sayede üretim verimliliğinin artırılması, stok yönetiminin kolaylaştırılması ve operasyonel hataların en aza indirilmesi hedeflenmektedir.

## 3. Hedef Kitle
- Üretim sorumluları
- Depo personeli
- Satın alma yetkilileri
- Yöneticiler

## 4. Temel Özellikler (Mevcut Modüller)
- **Dashboard:** Sistemdeki kilit metriklerin ve genel durumun anlık olarak izlendiği ana panel.
- **Stok Yönetimi:** Zeytinyağı, kostik, esans gibi ham maddelerin ve üretilen sabunların stok takibi.
- **Stok Hareketleri:** Depolar arası transferler, giriş ve çıkışların kaydı.
- **Tedarikçi Yönetimi:** Ham madde sağlayan firmaların bilgilerinin yönetimi.
- **Reçete Yönetimi:** Farklı sabun türleri için üretim reçetelerinin oluşturulması ve saklanması.
- **Üretim Kayıtları:** Gerçekleşen üretimlerin parti bazında kaydı.
- **Sabun Bazı Üretimi:** Sabun üretiminin temel adımı olan baz üretim sürecinin takibi.
- **Yağ Tankları:** Kullanılan zeytinyağı tanklarının doluluk oranları ve takibi.
- **Proforma Oluşturucu:** Satışlar için proforma faturaların hazırlanması. (Detaylar için `PROFORMA.md` dosyasına bakınız.)
- **Ürünler:** Nihai ürün kataloğunun yönetimi.
- **Etiket Oluşturucu:** Ürünler için yasal gerekliliklere uygun etiketlerin basılması.
- **Ayarlar:** Uygulama genelindeki ayarlar.

## 5. Teknik Yapı
- **UI Kütüphanesi:** React
- **Programlama Dili:** TypeScript
- **Geliştirme Ortamı:** Vite
- **Stil/CSS:** Tailwind CSS
- **Yönlendirme (Routing):** React Router DOM
- **Form Yönetimi:** React Hook Form & Yup
- **İkonlar:** Lucide React
- **Grafikler:** Recharts
- **Backend / Veritabanı:** Supabase 