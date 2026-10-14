-- ==============================================================================
-- SETUP CRON NOTIFIKASI EMAIL AGENDA / MEETING H-3 KE STAFF
-- Jalankan di Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Buat tabel pencatatan pengiriman notifikasi agar tidak terkirim ganda
CREATE TABLE IF NOT EXISTS public.meeting_reminder_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_name text,
  reminder_type text DEFAULT 'H-3', -- misal: 'H-3', 'H-1'
  status text DEFAULT 'sent', -- 'sent', 'failed'
  sent_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_event 
ON public.meeting_reminder_logs(event_id, recipient_email, reminder_type);

-- 2. Fungsi SQL untuk mencari seluruh agenda H-3 dan staf terkait beserta email pribadinya
CREATE OR REPLACE FUNCTION public.get_upcoming_h3_meetings()
RETURNS TABLE (
  event_id uuid,
  title text,
  event_date date,
  start_time text,
  end_time text,
  location text,
  pic text,
  notes text,
  staff_name text,
  staff_email text,
  is_personal_email boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS event_id,
    e.title,
    e.event_date,
    e.start_time,
    e.end_time,
    e.location,
    e.pic,
    e.notes,
    u.name AS staff_name,
    -- Prioritaskan personal_email, fallback ke email login akun
    COALESCE(NULLIF(trim(u.personal_email), ''), u.email) AS staff_email,
    (NULLIF(trim(u.personal_email), '') IS NOT NULL) AS is_personal_email
  FROM public.calendar_events e
  CROSS JOIN public.users u
  WHERE 
    -- Filter kegiatan yang tepat H-3 hari dari hari ini
    e.event_date = CURRENT_DATE + INTERVAL '3 days'
    -- Cocokkan staf yang namanya tercantum di kolom pic agenda
    AND (
      position(lower(trim(u.name)) in lower(e.pic)) > 0
      OR (lower(u.role) = 'owner' AND position('uma' in lower(e.pic)) > 0)
    )
    -- Pastikan belum pernah dikirim notifikasi H-3 ke email tersebut untuk event ini
    AND NOT EXISTS (
      SELECT 1 FROM public.meeting_reminder_logs l
      WHERE l.event_id = e.id 
        AND l.recipient_email = COALESCE(NULLIF(trim(u.personal_email), ''), u.email)
        AND l.reminder_type = 'H-3'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Panduan Otomatisasi dengan pg_cron & Resend / Edge Function di Supabase:
-- Jika mengaktifkan extension pg_cron dan pg_net di Supabase:
-- 
-- SELECT cron.schedule(
--   'h3-meeting-email-reminder-daily',
--   '0 1 * * *', -- Berjalan setiap hari pukul 08:00 WIB (01:00 UTC)
--   $$
--   SELECT net.http_post(
--     url := 'https://<PROJECT-REF>.supabase.co/functions/v1/send-meeting-reminder',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
