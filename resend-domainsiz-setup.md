# Resend.com Domainsiz Setup Rehberi

## 🚀 **Hızlı Başlangıç (Domain olmadan)**

### 1. **Resend Hesabı Oluştur**
- https://resend.com adresine git
- Ücretsiz hesap oluştur
- Email doğrulaması yap

### 2. **API Key Al**
- Dashboard > API Keys
- "Create API Key" tıkla
- Key'i kopyala: `re_xxxxxxxxxxxxxxxxx`

### 3. **Supabase'e Ekle**
```bash
supabase secrets set RESEND_API_KEY=re_your_actual_key_here
supabase secrets set NOTIFICATION_EMAIL=info@olivosltd.com
```

### 4. **Function Deploy**
```bash
supabase functions deploy send-order-notification
```

---

## ⚠️ **Domainsiz Sınırlar**

### **Gönderen Adresi:**
- ❌ `noreply@olivosltd.com` 
- ✅ `onboarding@resend.dev`

### **Alıcı Sınırı:**
- ✅ Sadece doğrulanmış email adreslerine gönderim
- ✅ Test ortamı için ideal
- ❌ Rastgele müşteri emaillerine gönderilemez

### **Günlük Limit:**
- ✅ 100 email/gün (ücretsiz)
- ✅ 3000 email/ay (ücretsiz)

---

## 🧪 **Test Etme**

### 1. **Doğrulanmış Email Ekle**
Resend Dashboard'da:
- Settings > Domains > Verified emails
- `info@olivosltd.com` adresini ekle
- Doğrulama emailini kontrol et

### 2. **Test Email Gönder**
```bash
curl -X POST https://duxgrvwcwnxoogyekffw.supabase.co/functions/v1/send-order-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
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

---

## 🔄 **Domain'e Geçiş (İleride)**

### **Avantajları:**
- ✅ Profesyonel görünüm: `noreply@olivosltd.com`
- ✅ Sınırsız alıcı
- ✅ Yüksek delivery rate
- ✅ DKIM/SPF doğrulaması

### **Geçiş Adımları:**
1. Domain satın al (olivosltd.com)
2. Resend'de domain ekle
3. DNS kayıtlarını güncelle
4. Edge function'da `from` adresini değiştir

---

## 💡 **Hemen Kullanım**

**Domainsiz versiyonla:**
- ✅ Sistem testleri yapabilirsiniz
- ✅ Internal bildirimler alabilirsiniz  
- ✅ Geliştirme ortamında çalışabilir
- ✅ Email templatelerini test edebilirsiniz

**Tek değişiklik:**
```typescript
from: 'onboarding@resend.dev' // Domain yerine
```

Bu şekilde hemen başlayabilir, domain aldıktan sonra kolayca güncelleyebilirsiniz!

---

## 📧 **Alternatif: SendGrid**

SendGrid de domainsiz çalışabilir:
```typescript
from: 'test@sendgrid.net' // SendGrid'in test adresi
```

Her iki seçenek de domain almadan test etmenizi sağlar.
