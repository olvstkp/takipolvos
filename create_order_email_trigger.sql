-- Email bildirimi için database trigger kurulumu
-- Bu trigger yeni sipariş eklendiğinde otomatik email gönderir

-- 1. HTTP extension'ı aktifleştir (sadece bir kez çalıştır)
CREATE EXTENSION IF NOT EXISTS http;

-- 2. Email gönderme fonksiyonu
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
DECLARE
    function_url text;
    service_key text;
    payload jsonb;
    response text;
BEGIN
    -- Supabase function URL'i
    function_url := 'https://duxgrvwcwnxoogyekffw.supabase.co/functions/v1/send-order-notification';
    
    -- Service role key (Supabase dashboard > Settings > API > service_role)
    -- GÜVENLIK: Bu key'i environment variable olarak kullanın
    service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1eGdydndjd254b29neWVrZmZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzI1MjI2NywiZXhwIjoyMDY4ODI4MjY3fQ.xyz'; -- BURAYA GERÇEK SERVICE KEY YAZILACAK
    
    -- Payload hazırla
    payload := jsonb_build_object(
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
    );
    
    -- HTTP POST request gönder
    SELECT content INTO response
    FROM http_post(
        function_url,
        payload::text,
        'application/json',
        jsonb_build_object(
            'Authorization', 'Bearer ' || service_key,
            'Content-Type', 'application/json'
        )
    );
    
    -- Log için (opsiyonel)
    RAISE LOG 'Email notification sent for order: %, Response: %', NEW.order_number, response;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Hata durumunda sipariş kaydını etkilemesin
        RAISE LOG 'Failed to send email notification for order: %, Error: %', NEW.order_number, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger oluştur
DROP TRIGGER IF EXISTS trigger_new_order_notification ON orders;

CREATE TRIGGER trigger_new_order_notification
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_order();

-- 4. Test için örnek sipariş ekle (opsiyonel)
/*
INSERT INTO orders (
    order_number, 
    order_date, 
    company_name, 
    contact_person, 
    email, 
    phone, 
    country, 
    estimated_value, 
    currency, 
    total_items,
    status,
    additional_message
) VALUES (
    'TEST-' || extract(epoch from now())::text,
    now(),
    'Test Şirketi',
    'Test Kişi', 
    'test@example.com',
    '+90123456789',
    'Türkiye',
    1500.00,
    'USD',
    5,
    'pending',
    'Bu bir test siparişidir.'
);
*/

-- 5. Trigger'ı kontrol et
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_new_order_notification';

-- 6. Log'ları kontrol et (test sonrası)
-- SELECT * FROM pg_stat_statements WHERE query LIKE '%notify_new_order%';

COMMENT ON FUNCTION notify_new_order() IS 'Yeni sipariş eklendiğinde otomatik email bildirimi gönderir';
COMMENT ON TRIGGER trigger_new_order_notification ON orders IS 'Orders tablosuna INSERT olduğunda email bildirim trigger''ı';
