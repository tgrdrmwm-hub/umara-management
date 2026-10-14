-- Migration: Membuat tabel calendar_events untuk Kalender Kegiatan Kantor & Bu Uma
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_date date NOT NULL,
  start_time text,
  end_time text,
  is_all_day boolean NOT NULL DEFAULT false,
  location text,
  pic text,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika sudah ada (mencegah error 'already exists')
DROP POLICY IF EXISTS "Allow all authenticated users to read calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow all authenticated users to insert calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow all authenticated users to update calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow all authenticated users to delete calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow anon select calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow anon all calendar_events" ON public.calendar_events;

-- Buat policy baru yang bersih
CREATE POLICY "Allow all authenticated users to read calendar_events"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert calendar_events"
  ON public.calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update calendar_events"
  ON public.calendar_events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to delete calendar_events"
  ON public.calendar_events FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon all calendar_events"
  ON public.calendar_events FOR ALL
  TO anon
  USING (true);
