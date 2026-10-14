-- Script untuk menambahkan user Staff Magang
-- Anda dapat menjalankan script ini di Supabase SQL Editor atau lewat CLI

DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
    default_password text := 'magang123'; -- Password sementara
BEGIN
    -- 1. Insert ke auth.users (Supabase Authentication)
    INSERT INTO auth.users (
        id, 
        instance_id, 
        email, 
        encrypted_password, 
        email_confirmed_at,
        raw_app_meta_data, 
        raw_user_meta_data, 
        created_at, 
        updated_at,
        role, 
        aud, 
        confirmation_token
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'magang@umaratax.com',
        crypt(default_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"name":"Staff Magang"}',
        now(),
        now(),
        'authenticated',
        'authenticated',
        ''
    );

    -- 2. Insert ke auth.identities
    INSERT INTO auth.identities (
        id, 
        user_id, 
        provider_id, 
        identity_data, 
        provider, 
        created_at, 
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        new_user_id::text,
        jsonb_build_object('sub', new_user_id, 'email', 'magang@umaratax.com'),
        'email',
        now(),
        now()
    );

    -- 3. Insert ke public.users (Tabel Profil Aplikasi)
    INSERT INTO public.users (
        id, 
        name, 
        email, 
        role, 
        status, 
        points, 
        attendance_rate, 
        is_first_login
    ) VALUES (
        new_user_id,
        'Staff Magang',
        'magang@umaratax.com',
        'staff_magang',
        'active',
        0,
        0,
        true
    );

    RAISE NOTICE 'Berhasil membuat user magang@umaratax.com dengan password: %', default_password;
END $$;
