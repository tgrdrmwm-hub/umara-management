-- Jalankan script ini di SQL Editor Supabase untuk menyesuaikan role
UPDATE public.users 
SET role = 'magang' 
WHERE email = 'magang@umaratax.com';

UPDATE public.users 
SET role = 'owner' 
WHERE email = 'owner@umaratax.com';
