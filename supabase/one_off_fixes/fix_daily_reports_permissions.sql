-- ==============================================================================
-- FIX PERMISSIONS & SCHEMA FOR DAILY REPORTS (LAPORAN HARIAN STAFF)
-- Jalankan query ini di Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Berikan hak akses skema dan tabel ke role Supabase API
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Pastikan tabel yang dibuat di masa mendatang otomatis dapat diakses oleh API
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Pastikan tabel daily_reports ada dan memiliki semua kolom yang diperlukan
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff text NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  report_date date NOT NULL DEFAULT current_date,
  report_time text,
  tasks_summary text NOT NULL,
  client_name text,
  status text NOT NULL DEFAULT 'Selesai',
  obstacles text,
  tomorrow_plan text,
  attachment_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tambahkan kolom jika sebelumnya tabel dibuat dengan struktur minimal
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS staff text;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS report_date date DEFAULT current_date;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS report_time text;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS tasks_summary text;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS status text DEFAULT 'Selesai';
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS obstacles text;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS tomorrow_plan text;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Berikan hak akses eksplisit ke tabel daily_reports
GRANT ALL ON TABLE public.daily_reports TO anon, authenticated, service_role;

-- Index untuk mempercepat filter tanggal dan staff
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_staff ON public.daily_reports(staff);

-- 3. Atur Row Level Security (RLS) dan Policies
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to read daily_reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Allow all authenticated users to insert daily_reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Allow all authenticated users to update daily_reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Allow all authenticated users to delete daily_reports" ON public.daily_reports;
DROP POLICY IF EXISTS "Allow anon all daily_reports" ON public.daily_reports;

CREATE POLICY "Allow all authenticated users to read daily_reports"
  ON public.daily_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert daily_reports"
  ON public.daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update daily_reports"
  ON public.daily_reports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to delete daily_reports"
  ON public.daily_reports FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon all daily_reports"
  ON public.daily_reports FOR ALL
  TO anon
  USING (true);

-- 4. Berikan hak akses juga jika ada tabel bernama 'laporan_harian'
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'laporan_harian') THEN
    EXECUTE 'GRANT ALL ON TABLE public.laporan_harian TO anon, authenticated, service_role;';
  END IF;
END $$;
