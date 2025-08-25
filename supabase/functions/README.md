# Supabase Edge Functions

## Setup

1. Supabase CLI kurulumu:
```bash
npm install -g supabase
```

2. Login:
```bash
supabase login
```

3. Project linki:
```bash
supabase link --project-ref duxgrvwcwnxoogyekffw
```

4. Environment variables ayarla:
```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
supabase secrets set NOTIFICATION_EMAIL=info@olivosltd.com
```

5. Function deploy et:
```bash
supabase functions deploy send-order-notification
```

## send-order-notification Function

Bu function yeni sipariş geldiğinde otomatik email bildirimi gönderir.

### Environment Variables
- `RESEND_API_KEY`: Resend.com API key
- `NOTIFICATION_EMAIL`: Bildirimlerin gönderileceği email adresi

### Kullanım
```javascript
const { data, error } = await supabase.functions.invoke('send-order-notification', {
  body: {
    order_number: "OLV-123456",
    company_name: "Example Company",
    contact_person: "John Doe",
    email: "john@example.com",
    phone: "+1234567890",
    country: "Turkey",
    estimated_value: 1500.00,
    currency: "USD",
    total_items: 10,
    order_date: "2025-01-15T10:30:00Z",
    additional_message: "Urgent order"
  }
});
```

### Test
```bash
supabase functions serve send-order-notification
```

Test request:
```bash
curl -X POST http://localhost:54321/functions/v1/send-order-notification \
  -H "Content-Type: application/json" \
  -d '{"order_number":"TEST-001","company_name":"Test Company",...}'
```
