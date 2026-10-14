-- 1. Buat tabel tax_services_catalog jika belum ada
CREATE TABLE IF NOT EXISTS public.tax_services_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  service_name text NOT NULL,
  base_points numeric NOT NULL DEFAULT 0.25,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Aktifkan RLS dan buat policy untuk tax_services_catalog
ALTER TABLE public.tax_services_catalog ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  EXECUTE 'CREATE POLICY "authenticated users can manage tax services catalog" ON public.tax_services_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Policy already exists';
END $$;

-- 3. Perbaiki tipe data poin di tabel tasks dan users menjadi numeric
ALTER TABLE public.tasks ALTER COLUMN points TYPE numeric USING points::numeric;
ALTER TABLE public.users ALTER COLUMN points TYPE numeric USING points::numeric;

-- 4. Masukkan data layanan (jika belum ada) ke dalam tax_services_catalog
INSERT INTO public.tax_services_catalog (category, service_name, base_points) VALUES
  ('Coretax', 'Aktivasi Coretax', 40),
  ('Coretax', 'PKP', 35),
  ('Coretax', 'Non PKP', 30),
  ('Coretax', 'NE (Non Efektif)', 25),
  ('Coretax', 'Pembuatan NPWP', 40),
  ('Coretax', 'Pengurangan Sanksi', 25),
  ('Coretax', 'Restitusi Pajak', 35),
  ('Coretax', 'Administrasi Lainnya', 20),
  ('SPT Tahunan', 'SPT Orang Pribadi', 90),
  ('SPT Tahunan', 'SPT Badan', 93),
  ('SPT Tahunan', 'SPT Orang Pribadi Pembetulan', 96),
  ('SPT Tahunan', 'SPT Badan Pembetulan', 100),
  ('SPT Masa', 'PPN', 82),
  ('SPT Masa', 'PPh 21/26', 79),
  ('SPT Masa', 'PPh 22/23', 76),
  ('SPT Masa', 'PPh Unifikasi', 73),
  ('SPT Masa', 'PPh Final', 70),
  ('SPT Masa', 'PPh 25', 67),
  ('Akuntansi', 'Akuntan Internal', 61),
  ('Akuntansi', 'Akuntan Eksternal', 64),
  ('Perizinan', 'Akta Pendirian', 58),
  ('Perizinan', 'NIB', 55),
  ('Perizinan', 'PBG', 52),
  ('Perizinan', 'SLF', 49),
  ('Perizinan', 'Perizinan Lainnya', 46),
  ('Media', 'Website', 45),
  ('Media', 'Instagram', 44),
  ('Media', 'TikTok', 43),
  ('Media', 'YouTube', 42),
  ('Media', 'Facebook', 5),
  ('Media', 'WhatsApp', 5),
  ('Administrasi Pajak', 'Surat Kuasa', 25),
  ('Administrasi Pajak', 'Surat Kontrak', 25),
  ('Administrasi Pajak', 'Penawaran', 30),
  ('Masenger', 'Pengiriman Dokumen', 20),
  ('Masenger', 'Tanda Tangan Dokumen', 20),
  ('Masenger', 'Lainnya', 20),
  ('Masenger', 'KBM', 79)
ON CONFLICT DO NOTHING;

-- 5. Beri tahu PostgREST agar membaca tabel & struktur yang baru
NOTIFY pgrst, 'reload schema';
