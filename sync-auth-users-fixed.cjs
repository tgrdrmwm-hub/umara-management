#!/usr/bin/env node

/**
 * Fixed script to synchronize users from auth.users to public.users table
 * This version uses anon key for most operations and service key only for admin operations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function syncAuthUsers() {
  try {
    console.log('🔄 Memulai sinkronisasi user...');

    // Get environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ Error: Environment variables tidak ditemukan!");
      console.error("Pastikan file .env berisi:");
      console.error("VITE_SUPABASE_URL=https://your-project.supabase.co");
      console.error("VITE_SUPABASE_ANON_KEY=your-anon-key");
      console.error("SUPABASE_SERVICE_ROLE_KEY=your-service-role-key");
      process.exit(1);
    }

    // Create clients
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Test connection with anon key
    console.log('🔍 Memeriksa koneksi ke Supabase...');
    const { error: testError } = await supabase.from('users').select('id').limit(1);
    if (testError && testError.code !== 'PGRST116') {
      console.error("❌ Error: Tidak bisa terhubung ke Supabase!");
      console.error(`Detail: ${testError.message}`);
      process.exit(1);
    }
    console.log('✅ Koneksi ke Supabase berhasil!');

    // Get all users from auth.users using admin client
    console.log('🔍 Mengambil daftar user dari auth.users...');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("❌ Error mengambil user dari auth.users:");
      console.error(`Detail: ${authError.message}`);
      console.error("Mungkin service role key tidak valid atau tidak memiliki permission");
      process.exit(1);
    }

    console.log(`✅ Ditemukan ${authUsers.users.length} user di auth.users`);

    // Get existing users from public.users using anon client
    console.log('🔍 Memeriksa user yang sudah ada di public.users...');
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('email');
    if (publicError) {
      console.error("❌ Error mengambil user dari public.users:");
      console.error(`Detail: ${publicError.message}`);
      process.exit(1);
    }

    const publicEmails = new Set(publicUsers.map(u => u.email));
    let createdCount = 0;

    console.log('🔄 Memproses user...');
    // Process each auth user
    for (const authUser of authUsers.users) {
      if (!authUser.email) {
        console.log('⚠️  User tanpa email ditemukan, dilewati...');
        continue;
      }

      // Skip if user already exists in public.users
      if (publicEmails.has(authUser.email)) {
        console.log(`⏭️  User ${authUser.email} sudah ada di public.users, dilewati...`);
        continue;
      }

      // Create user in public.users using admin client
      console.log(`🆕 Membuat user ${authUser.email} di public.users...`);

      const { error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.id,
          name: authUser.email.split('@')[0],
          email: authUser.email,
          role: 'staff',
          status: 'active',
          is_first_login: true,
          points: 0,
          attendance_rate: 0
        });

      if (createError) {
        console.error(`❌ Error membuat user ${authUser.email}:`, createError.message);
      } else {
        console.log(`✅ Berhasil membuat user ${authUser.email} di public.users`);
        createdCount++;
      }
    }

    console.log(`\n🎉 Sinkronisasi selesai!`);
    console.log(`📊 User baru yang dibuat: ${createdCount}`);
    console.log(`\n💡 Sekarang coba login kembali dengan akun Anda.`);
  } catch (error) {
    console.error("❌ Error tak terduga selama sinkronisasi:");
    console.error(error);
    process.exit(1);
  }
}

syncAuthUsers();