-- Migration: Mengubah tipe data points dan base_points menjadi NUMERIC agar mendukung desimal (0.25)
ALTER TABLE public.users 
  ALTER COLUMN points TYPE NUMERIC(10, 2) USING points::numeric;

ALTER TABLE public.tasks 
  ALTER COLUMN points TYPE NUMERIC(10, 2) USING points::numeric;

ALTER TABLE public.tax_services_catalog 
  ALTER COLUMN base_points TYPE NUMERIC(10, 2) USING base_points::numeric;

-- Update nilai default
ALTER TABLE public.users ALTER COLUMN points SET DEFAULT 0;
ALTER TABLE public.tasks ALTER COLUMN points SET DEFAULT 0.25;
ALTER TABLE public.tax_services_catalog ALTER COLUMN base_points SET DEFAULT 0.25;
