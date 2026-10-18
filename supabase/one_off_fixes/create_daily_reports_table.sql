-- Migration: Membuat tabel daily_reports untuk Laporan Harian Staff Sebelum Pulang
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

-- Index untuk performa query berdasarkan tanggal dan staff
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_staff ON public.daily_reports(staff);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Policy untuk read, insert, update, delete
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
