-- ==============================================================================
-- SCRIPT PERBAIKAN KEAMANAN (SECURITY HARDENING & RPC ADMIN AUTHORIZATION)
-- Jalankan seluruh script ini di Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Ekstensi pgcrypto untuk hashing password
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Amankan fungsi admin_create_user
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
  -- Validasi Izin: Hanya Owner & Developer yang boleh membuat user langsung
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role IN ('owner', 'developer')
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin administratif.';
  END IF;

  -- Cek jika email sudah terdaftar di auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email) THEN
    RAISE EXCEPTION 'Email % already exists', clean_email;
  END IF;

  -- Insert ke auth.users
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

  -- Insert ke auth.identities
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

  -- Insert ke public.users
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

-- 3. Amankan fungsi admin_delete_user
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id uuid
) RETURNS void AS $$
BEGIN
  -- Validasi Izin: Hanya Owner & Developer
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role IN ('owner', 'developer')
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin administratif.';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Amankan fungsi admin_reset_password
CREATE OR REPLACE FUNCTION public.admin_reset_password(
  p_user_id uuid,
  p_new_password text DEFAULT '12345678'
) RETURNS void AS $$
BEGIN
  -- Validasi Izin: Hanya Owner & Developer
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role IN ('owner', 'developer')
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin administratif.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;

  UPDATE public.users
  SET is_first_login = true,
      password_changed_at = NULL,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Amankan fungsi admin_update_user
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
  -- Validasi Izin: Hanya Owner & Developer
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role IN ('owner', 'developer')
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin administratif.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email AND id != p_user_id) THEN
    RAISE EXCEPTION 'Email % already exists', clean_email;
  END IF;

  UPDATE auth.users
  SET email = clean_email,
      raw_user_meta_data = jsonb_set(
        coalesce(raw_user_meta_data, '{}'::jsonb),
        '{name}',
        to_jsonb(clean_name)
      ),
      updated_at = now()
  WHERE id = p_user_id;

  UPDATE auth.identities
  SET identity_data = jsonb_set(
        coalesce(identity_data, '{}'::jsonb),
        '{email}',
        to_jsonb(clean_email)
      ),
      updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE public.users
  SET name = clean_name,
      email = clean_email,
      role = p_role::public.user_role,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Cabut izin dari publik/anon dan berikan HANYA kepada authenticated & service_role
REVOKE EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text, text) TO authenticated, service_role;

-- 7. Bersihkan policy anon berbahaya jika pernah terpasang
DROP POLICY IF EXISTS "Allow anon all calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow anon all daily_reports" ON public.daily_reports;

-- 8. Perketat Row Level Security (RLS) pada tabel public.users
DROP POLICY IF EXISTS "authenticated users can manage users" ON public.users;
DROP POLICY IF EXISTS "authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "users can update own profile or admin can update any" ON public.users;
DROP POLICY IF EXISTS "admin can insert users" ON public.users;
DROP POLICY IF EXISTS "admin can delete users" ON public.users;

-- Semua akun terotentikasi dapat melihat user (untuk delegasi task, leaderboard, presensi)
CREATE POLICY "authenticated users can read users" ON public.users 
  FOR SELECT TO authenticated USING (true);

-- User hanya boleh update profil miliknya sendiri, atau Owner/Developer dapat update siapa saja
CREATE POLICY "users can update own profile or admin can update any" ON public.users 
  FOR UPDATE TO authenticated 
  USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('owner', 'developer'))
  )
  WITH CHECK (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('owner', 'developer'))
  );

-- Insert & Delete akun hanya boleh dilakukan oleh Owner/Developer
CREATE POLICY "admin can insert users" ON public.users 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('owner', 'developer'))
  );

CREATE POLICY "admin can delete users" ON public.users 
  FOR DELETE TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('owner', 'developer'))
  );
