-- ==============================================================================
-- SCRIPT SETUP RPC ADMIN USER MANAGEMENT
-- Jalankan seluruh script ini di Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Pastikan ekstensi pgcrypto tersedia untuk hashing password
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Tambahkan kolom biodata staff (email pribadi, alamat, kontak saudara yang bisa dihubungi) ke tabel users jika belum ada
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS personal_email text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- 2. Fungsi untuk membuat user baru secara aman dari frontend
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_name text,
  p_role text
) RETURNS void AS $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  clean_email text := lower(trim(p_email));
BEGIN
  -- Cek jika email sudah terdaftar di auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email) THEN
    RAISE EXCEPTION 'Email % already exists', clean_email;
  END IF;

  -- A. Insert ke auth.users (Supabase Authentication)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    clean_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', p_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- B. Insert ke auth.identities (Wajib agar user bisa login dengan email & password)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', clean_email),
    'email',
    new_user_id::text,
    now(),
    now(),
    now()
  );

  -- C. Insert profil ke tabel public.users
  INSERT INTO public.users (
    id,
    name,
    email,
    role,
    status,
    is_first_login,
    points,
    attendance_rate
  )
  VALUES (
    new_user_id,
    p_name,
    clean_email,
    p_role::public.user_role,
    'active',
    true,
    0,
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fungsi untuk menghapus user secara permanen
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id uuid
) RETURNS void AS $$
BEGIN
  -- Menghapus dari auth.users (otomatis cascade ke auth.identities dan public.users)
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fungsi untuk mereset password user kembali ke password awal / default
CREATE OR REPLACE FUNCTION public.admin_reset_password(
  p_user_id uuid,
  p_new_password text DEFAULT '12345678'
) RETURNS void AS $$
BEGIN
  -- A. Update encrypted_password di auth.users
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;

  -- B. Update status di public.users agar kembali ke kondisi awal (wajib ganti password saat login)
  UPDATE public.users
  SET is_first_login = true,
      password_changed_at = NULL,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fungsi untuk mengupdate nama, email, dan role user secara sinkron di auth dan public
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_role text
) RETURNS void AS $$
DECLARE
  clean_email text := lower(trim(p_email));
  clean_name text := trim(p_name);
BEGIN
  -- A. Validasi jika email baru sudah digunakan oleh akun lain
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email AND id != p_user_id) THEN
    RAISE EXCEPTION 'Email % already exists', clean_email;
  END IF;

  -- B. Update di auth.users (Supabase Authentication)
  UPDATE auth.users
  SET email = clean_email,
      raw_user_meta_data = jsonb_set(
        coalesce(raw_user_meta_data, '{}'::jsonb),
        '{name}',
        to_jsonb(clean_name)
      ),
      updated_at = now()
  WHERE id = p_user_id;

  -- C. Update di auth.identities agar email login sinkron
  UPDATE auth.identities
  SET identity_data = jsonb_set(
        coalesce(identity_data, '{}'::jsonb),
        '{email}',
        to_jsonb(clean_email)
      ),
      updated_at = now()
  WHERE user_id = p_user_id;

  -- D. Update di public.users (Tabel Profil Aplikasi)
  UPDATE public.users
  SET name = clean_name,
      email = clean_email,
      role = p_role::public.user_role,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Berikan izin eksekusi fungsi ke role authenticated, anon, dan service_role
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text, text) TO authenticated, anon, service_role;
