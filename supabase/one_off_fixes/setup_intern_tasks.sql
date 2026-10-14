-- Script untuk menambahkan tabel intern_tasks
-- Silakan jalankan di Supabase SQL Editor

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

alter table public.intern_tasks enable row level security;

DO $$
BEGIN
  EXECUTE 'CREATE POLICY "authenticated users can manage intern tasks" ON public.intern_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Policy already exists';
END $$;
