# Email Bildirimi Kurulum Rehberi

## 🚀 Otomatik Email Sistemi Nasıl Çalışır?

### 1. **Tetikleme Zamanları:**
- ✅ **Yeni sipariş** veritabanına eklendiği anda
- ✅ **Real-time** olarak (anlık bildirim)
- ✅ **Otomatik** - manuel işlem gerektirmez

### 2. **Email İçeriği:**
- Sipariş detayları (numara, tarih, tutar)
- Müşteri bilgileri (şirket, kişi, iletişim)
- Ek mesaj (varsa)
- Profesyonel HTML template

---

## 📧 Email Servis Kurulumu

### Seçenek 1: Resend.com (Önerilen)

1. **Hesap Oluştur:** https://resend.com
2. **Domain Doğrula:** olivosltd.com 
3. **API Key Al:** Dashboard > API Keys
4. **DNS Kayıtları:** SPF, DKIM, DMARC

### Seçenek 2: SendGrid

1. **Hesap Oluştur:** https://sendgrid.com
2. **API Key Al:** Settings > API Keys
3. **Domain Doğrula:** Sender Authentication

---

## ⚙️ Supabase Edge Function Deploy

### 1. Supabase CLI Kurulumu
```bash
npm install -g supabase
supabase login
supabase link --project-ref duxgrvwcwnxoogyekffw
```

### 2. Environment Variables
```bash
# Resend için
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
supabase secrets set NOTIFICATION_EMAIL=info@olivosltd.com

# veya SendGrid için  
supabase secrets set SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
supabase secrets set NOTIFICATION_EMAIL=info@olivosltd.com
```

### 3. Function Deploy
```bash
supabase functions deploy send-order-notification
```

---

## 🔧 Database Trigger Kurulumu

### Real-time Subscription (Şu anda aktif)
- Frontend'te real-time dinleme
- Yeni sipariş geldiğinde otomatik tetikleme
- Sadece sayfa açıkken çalışır

### Database Trigger (Önerilen)
```sql
-- Function oluştur
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
    -- HTTP request gönder
    PERFORM net.http_post(
        url := 'https://duxgrvwcwnxoogyekffw.supabase.co/functions/v1/send-order-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || 'your_service_role_key'
        ),
        body := jsonb_build_object(
            'order_number', NEW.order_number,
            'company_name', NEW.company_name,
            'contact_person', NEW.contact_person,
            'email', NEW.email,
            'phone', NEW.phone,
            'country', NEW.country,
            'estimated_value', NEW.estimated_value,
            'currency', NEW.currency,
            'total_items', NEW.total_items,
            'order_date', NEW.order_date,
            'additional_message', NEW.additional_message
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger oluştur
CREATE TRIGGER trigger_new_order_notification
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_order();
```

---

## 🧪 Test Etme

### 1. Local Test
```bash
supabase functions serve send-order-notification
```

### 2. Test Request
```bash
curl -X POST http://localhost:54321/functions/v1/send-order-notification \
  -H "Content-Type: application/json" \
  -d '{
    "order_number": "TEST-001",
    "company_name": "Test Şirketi", 
    "contact_person": "Test Kişi",
    "email": "test@example.com",
    "phone": "+90123456789",
    "country": "Türkiye",
    "estimated_value": 1500.00,
    "currency": "USD",
    "total_items": 5,
    "order_date": "2025-01-15T10:30:00Z"
  }'
```

### 3. Production Test
Siparişler sayfasından "Email" butonuna tıklayarak test edin.

---

## 📋 Checklist

- [ ] Email servisi kurulumu (Resend/SendGrid)
- [ ] Domain doğrulaması
- [ ] API key alımı
- [ ] Supabase secrets ayarları
- [ ] Edge function deploy
- [ ] Database trigger kurulumu (opsiyonel)
- [ ] Test emaili gönderimi
- [ ] Production test

---

## 🔍 Sorun Giderme

### Email gönderilmiyor:
1. API key doğru mu?
2. Domain doğrulandı mı?
3. Function logs kontrol et: `supabase functions logs`
4. Email limitleri aşıldı mı?

### Real-time çalışmıyor:
1. Sayfa açık mı?
2. Network bağlantısı var mı?
3. Console hatalarını kontrol et

### Database trigger:
1. `net` extension kurulu mu?
2. Service role key doğru mu?
3. Function URL'i doğru mu?

---

## 💡 Öneriler

1. **Production'da Database Trigger kullanın** (sayfa kapalıyken de çalışır)
2. **Email template'ini özelleştirin** (logo, renk)
3. **Rate limiting** ekleyin (spam önleme)
4. **Queue sistemi** ekleyin (yoğun dönemler için)
5. **Email delivery tracking** ekleyin
