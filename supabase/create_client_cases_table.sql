-- Migration for Client Cases (Case Berjalan & Case Close)
-- Table to record tax letters with columns:
-- No, Nomor Surat, Jenis Surat, Tahun Pajak, Wajib Pajak, PIC, Tanggal, SKK, TTD, BA, SJ, Uraian, Penyelesaian, Status

create table if not exists public.client_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null,
  jenis_surat text not null default 'SP2DK',
  tahun_pajak text,
  wajib_pajak text not null,
  pic text not null,
  tanggal date not null default current_date,
  ar_name text,
  skk boolean not null default false,
  ttd boolean not null default false,
  ba boolean not null default false,
  sj boolean not null default false,
  uraian text,
  penyelesaian text,
  status text not null default 'Case Berjalan',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

-- Enable RLS
alter table public.client_cases enable row level security;

-- Policy for authenticated users
DO $$
BEGIN
  DROP POLICY IF EXISTS "authenticated users can manage client cases" ON public.client_cases;
  CREATE POLICY "authenticated users can manage client cases"
    ON public.client_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grants
GRANT ALL ON TABLE public.client_cases TO anon, authenticated, service_role;
