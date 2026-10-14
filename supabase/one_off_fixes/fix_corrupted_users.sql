-- Jalankan script ini di menu SQL Editor Supabase untuk menghapus akun yang error
DELETE FROM auth.identities 
WHERE identity_data->>'email' IN ('magang@umaratax.com', 'owner@umaratax.com');

DELETE FROM auth.users 
WHERE email IN ('magang@umaratax.com', 'owner@umaratax.com');

DELETE FROM public.users 
WHERE email IN ('magang@umaratax.com', 'owner@umaratax.com');
