-- ==============================================================
-- Schema Tabel Penggajian & Penyesuaian Gaji Staff (Payroll)
-- UMARA TAX CONSULTANT
-- ==============================================================

-- 0. Kolom Tanggal Bergabung di tabel users
alter table if exists public.users add column if not exists join_date date;

-- 1. Pengaturan Default Gaji Staff (Skenario & Simbol Jabatan)
create table if not exists public.staff_salary_settings (
  id uuid primary key default gen_random_uuid(),
  staff_name text not null unique,
  job_title text,
  join_date date,
  scenario text not null default 'tahap_1',
  position_symbol text not null default 'A',
  custom_position_allowance numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Rekam Gaji Bulanan & Penyesuaian (Lembur, Bonus, Potongan)
create table if not exists public.payroll_records (
  id uuid primary key default gen_random_uuid(),
  month text not null, -- Format 'YYYY-MM'
  staff_name text not null,
  scenario text not null default 'tahap_1',
  position_symbol text not null default 'A',
  jam_lembur numeric not null default 0,
  bonus numeric not null default 0,
  potongan numeric not null default 0,
  notes text,
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, staff_name)
);

-- RLS (Row Level Security)
alter table public.staff_salary_settings enable row level security;
alter table public.payroll_records enable row level security;

-- Policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "authenticated users can manage salary settings" ON public.staff_salary_settings;
  CREATE POLICY "authenticated users can manage salary settings"
    ON public.staff_salary_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "authenticated users can manage payroll records" ON public.payroll_records;
  CREATE POLICY "authenticated users can manage payroll records"
    ON public.payroll_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grants
GRANT ALL ON TABLE public.staff_salary_settings TO authenticated;
GRANT ALL ON TABLE public.staff_salary_settings TO service_role;
GRANT ALL ON TABLE public.payroll_records TO authenticated;
GRANT ALL ON TABLE public.payroll_records TO service_role;
