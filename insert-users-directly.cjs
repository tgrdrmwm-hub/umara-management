#!/usr/bin/env node

/**
 * Script to insert users directly into public.users table
 * Using the auth user IDs that already exist
 * This bypasses the RLS permission issue by using service role key
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function insertUsersDirectly() {
  try {
    console.log('🔄 Memulai insert user langsung ke public.users...');

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Error: Environment variables tidak ditemukan!");
      process.exit(1);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('✅ Koneksi ke Supabase admin berhasil!');

    // Get all auth users
    console.log('🔍 Mengambil daftar user dari auth.users...');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("❌ Error:", authError.message);
      process.exit(1);
    }

    console.log(`✅ Ditemukan ${authUsers.users.length} user di auth.users`);

    // Get existing public users
    console.log('🔍 Memeriksa user yang sudah ada di public.users...');
    const { data: publicUsers, error: publicError } = await supabaseAdmin
      .from('users')
      .select('id, email');

    let existingEmails = new Set();
    if (!publicError) {
      existingEmails = new Set(publicUsers.map(u => u.email));
      console.log(`✅ Ditemukan ${publicUsers.length} user di public.users`);
    } else {
      console.log('ℹ️  public.users kosong atau error, akan membuat semua user');
    }

    let insertedCount = 0;
    let skippedCount = 0;

    console.log('🔄 Memproses user...');

    for (const authUser of authUsers.users) {
      if (!authUser.email) {
        console.log('⚠️  User tanpa email ditemukan, dilewati...');
        continue;
      }

      if (existingEmails.has(authUser.email)) {
        console.log(`⏭️  User ${authUser.email} sudah ada di public.users, dilewati...`);
        skippedCount++;
        continue;
      }

      console.log(`🆕 Membuat user ${authUser.email} di public.users...`);

      // Extract name from email (before @)
      const name = authUser.email.split('@')[0];

      const { error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.id,
          name: name,
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
        insertedCount++;
      }
    }

    console.log(`\n🎉 Proses selesai!`);
    console.log(`📊 User yang diinsert: ${insertedCount}`);
    console.log(`📊 User yang dilewati: ${skippedCount}`);

    // List all users in public.users
    console.log('\n📋 Daftar user di public.users:');
    const { data: finalUsers } = await supabaseAdmin.from('users').select('id, email, name, role, status');
    if (finalUsers) {
      finalUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.name}) - ${user.role} - ${user.status}`);
      });
    }

    console.log(`\n💡 Sekarang coba login dengan password: 12345678`);

  } catch (error) {
    console.error("❌ Error tak terduga:", error);
    process.exit(1);
  }
}

insertUsersDirectly();