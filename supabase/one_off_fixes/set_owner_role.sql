-- Script untuk mengubah role user yang sudah ada menjadi 'owner'
-- Ganti 'email_owner_anda@domain.com' dengan email yang digunakan untuk login owner

UPDATE public.users 
SET role = 'owner' 
WHERE email = 'owner@umaratax.com';
