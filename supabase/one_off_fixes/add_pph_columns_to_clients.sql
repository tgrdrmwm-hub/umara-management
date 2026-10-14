-- Menambahkan kolom PPh & PPN ke tabel clients jika belum ada
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS pph_25 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pph_final boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ppn boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pph_21 boolean DEFAULT false;
