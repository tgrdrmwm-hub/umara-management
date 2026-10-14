-- Script untuk menambahkan user Owner untuk monitoring
-- Anda dapat menjalankan script ini di Supabase SQL Editor

DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
    default_password text := 'owner123'; -- Password sementara
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
        'owner@umaratax.com',
        crypt(default_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"name":"Owner"}',
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
        jsonb_build_object('sub', new_user_id, 'email', 'owner@umaratax.com'),
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
        'Owner',
        'owner@umaratax.com',
        'owner',
        'active',
        0,
        0,
        true
    );

    RAISE NOTICE 'Berhasil membuat user owner@umaratax.com dengan password: %', default_password;
END $$;
