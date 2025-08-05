-- company_payment tablosu RLS policy'lerini düzelt

-- Önce mevcut policy'leri sil
DROP POLICY IF EXISTS "Company payment read access" ON public.company_payment;
DROP POLICY IF EXISTS "Company payment write access" ON public.company_payment;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.company_payment;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.company_payment;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.company_payment;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.company_payment;

-- Yeni basit policy'ler ekle
CREATE POLICY "Enable all access for all users" ON public.company_payment FOR ALL USING (true);

-- Alternatif: RLS'yi tamamen kapat (daha basit çözüm)
-- ALTER TABLE public.company_payment DISABLE ROW LEVEL SECURITY;

-- Policy'leri kontrol et
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'company_payment';