-- Perbaiki tipe data points di tabel tasks
ALTER TABLE public.tasks ALTER COLUMN points TYPE numeric USING points::numeric;

-- Pastikan kolom poin di tabel lain juga numeric
ALTER TABLE public.users ALTER COLUMN points TYPE numeric USING points::numeric;
ALTER TABLE public.tax_services_catalog ALTER COLUMN base_points TYPE numeric USING base_points::numeric;

NOTIFY pgrst, 'reload schema';
