create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.activity_logs enable row level security;

-- Drop existing policies if any
DROP POLICY IF EXISTS "authenticated users can read activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "authenticated users can insert activity_logs" ON public.activity_logs;

-- Create policies for activity_logs
-- Allow all authenticated users to read logs
CREATE POLICY "authenticated users can read activity_logs" 
ON public.activity_logs 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow all authenticated users to insert logs
CREATE POLICY "authenticated users can insert activity_logs" 
ON public.activity_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Ensure schema permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.activity_logs TO authenticated;
