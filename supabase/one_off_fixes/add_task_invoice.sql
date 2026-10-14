-- 1. Tambahkan kolom invoice_url ke tabel tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS invoice_url text;

-- 2. Buat storage bucket untuk invoices jika belum ada
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Hapus policy lama jika ada (agar bersih)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- 4. Buat policy akses storage untuk bucket invoices
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Allow public reads" 
ON storage.objects FOR SELECT TO public 
USING (bucket_id = 'invoices');

CREATE POLICY "Allow authenticated deletes" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'invoices');

-- 5. Beritahu PostgREST agar membaca kolom baru
NOTIFY pgrst, 'reload schema';
