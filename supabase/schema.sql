DO $$
BEGIN
  CREATE TYPE public.user_role AS ENUM ('developer', 'manager', 'staff', 'staff_magang', 'magang', 'owner');
EXCEPTION WHEN duplicate_object THEN 
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'magang';
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'owner';
END $$;

DO $$
BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Type user_status already exists';
END $$;

DO $$
BEGIN
  CREATE TYPE public.client_type AS ENUM ('OP', 'Badan');
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Type client_type already exists';
END $$;

DO $$
BEGIN
  CREATE TYPE public.client_status AS ENUM ('Aktif', 'Prospek', 'Nonaktif');
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Type client_status already exists';
END $$;

DO $$
BEGIN
  CREATE TYPE public.task_status AS ENUM ('todo', 'progress', 'review', 'done');
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Type task_status already exists';
END $$;

DO $$
BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('Hadir', 'Terlambat', 'Izin', 'Remote');
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Type attendance_status already exists';
END $$;

DO $$
BEGIN
  CREATE TYPE public.tax_category AS ENUM ('Aktivasi Coretax', 'SP2DK/Pemeriksaan', 'SPT Masa', 'SPT Tahunan');
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Type tax_category already exists';
END $$;

DO $$
BEGIN
  CREATE TYPE public.tax_status AS ENUM ('Draft', 'Berjalan', 'Review', 'Selesai');
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Type tax_status already exists';
END $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'staff',
  phone text,
  avatar text,
  status public.user_status not null default 'active',
  is_first_login boolean not null default true,
  password_changed_at timestamptz,
  points numeric not null default 0,
  attendance_rate numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  npwp text,
  type public.client_type not null default 'Badan',
  status public.client_status not null default 'Aktif',
  pic text,
  email text,
  link_gdrive text,
  keterangan_aktivasi text,
  keterangan_konfirmasi text,
  password_djp text,
  nik_op text,
  password_coretax text,
  passphrase text,
  kode_aktivasi text,
  efin text,
  alamat text,
  password_email text,
  no_telepon text,
  nik_pj text,
  npwp_pj text,
  alamat_pj text,
  konfirmasi text,
  tanggal_mulai_kontrak text,
  tanggal_akhir_kontrak text,
  kontrak text,
  keterangan text,
  spt_tahunan_2024 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client text,
  pic text,
  deadline date,
  status public.task_status not null default 'todo',
  points numeric not null default 0.25,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  staff text,
  date date not null default current_date,
  check_in time,
  check_out time,
  status public.attendance_status not null default 'Hadir',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax (
  id uuid primary key default gen_random_uuid(),
  category public.tax_category not null,
  service text not null,
  client text,
  pic text,
  deadline date,
  status public.tax_status not null default 'Draft',
  attachment text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intern_tasks (
  id uuid primary key default gen_random_uuid(),
  assigner text not null,
  intern text,
  date date not null default current_date,
  title text not null,
  attachment text,
  status public.task_status not null default 'todo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_services_catalog (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  service_name text not null,
  base_points numeric not null default 0.25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_time text,
  end_time text,
  is_all_day boolean not null default false,
  location text,
  pic text,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.tasks enable row level security;
alter table public.attendance enable row level security;
alter table public.tax enable row level security;
alter table public.intern_tasks enable row level security;
alter table public.tax_services_catalog enable row level security;
alter table public.calendar_events enable row level security;

-- Fix: Drop restrictive policies if any to ensure all users can be read by authenticated users
DROP POLICY IF EXISTS "authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can only see themselves" ON public.users;

-- Create policies only if they don't exist
DO $$
BEGIN
  EXECUTE 'CREATE POLICY "authenticated users can read users" ON public.users FOR SELECT TO authenticated USING (true)';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Policy already exists';
END $$;

DO $$
BEGIN
  EXECUTE 'CREATE POLICY "authenticated users can manage users" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Policy already exists';
END $$;

DO $$
BEGIN
  EXECUTE 'CREATE POLICY "authenticated users can manage clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Policy already exists';
END $$;

DO $$
BEGIN
  EXECUTE 'CREATE POLICY "authenticated users can manage tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Policy already exists';
END $$;

DO $$
BEGIN
  EXECUTE 'CREATE POLICY "authenticated users can manage attendance" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Policy already exists';
END $$;

DO $$
BEGIN
  EXECUTE 'CREATE POLICY "authenticated users can manage tax" ON public.tax FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Policy already exists';
END $$;

DO $$
BEGIN
  EXECUTE 'CREATE POLICY "authenticated users can manage intern tasks" ON public.intern_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Policy already exists';
END $$;

DO $$
BEGIN
  EXECUTE 'CREATE POLICY "authenticated users can manage tax services catalog" ON public.tax_services_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Policy already exists';
END $$;

DO $$
BEGIN
  EXECUTE 'CREATE POLICY "authenticated users can manage calendar events" ON public.calendar_events FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Policy already exists';
END $$;

