#!/usr/bin/env node

/**
 * Complete script to:
 * 1. Create users in auth.users with default password
 * 2. Sync them to public.users table
 * This fixes the login error by ensuring users exist in both tables
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// User list from USER_CREDENTIALS.md
const usersToCreate = [
  { name: 'Aulia', email: 'aulia@umaratax.com', role: 'staff' },
  { name: 'Anna', email: 'anna@umaratax.com', role: 'staff' },
  { name: 'Septi', email: 'septi@umaratax.com', role: 'staff' },
  { name: 'Nita', email: 'nita@umaratax.com', role: 'staff' },
  { name: 'Anggun', email: 'anggun@umaratax.com', role: 'staff' },
  { name: 'Azizah', email: 'azizah@umaratax.com', role: 'staff' },
  { name: 'Intan', email: 'intan@umaratax.com', role: 'staff' },
];

const DEFAULT_PASSWORD = '12345678';

async function createUsersAndSync() {
  try {
    console.log('🔄 Memulai pembuatan user dan sinkronisasi...');

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Error: Environment variables tidak ditemukan!");
      console.error("Pastikan file .env berisi VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY");
      process.exit(1);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('✅ Koneksi ke Supabase admin berhasil!');

    // Step 1: Get existing auth users
    console.log('🔍 Memeriksa user yang sudah ada di auth.users...');
    const { data: existingAuthUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("❌ Error mengambil user dari auth.users:", authError.message);
      process.exit(1);
    }

    const existingEmails = new Set(existingAuthUsers.users.map(u => u.email));
    console.log(`✅ Ditemukan ${existingAuthUsers.users.length} user di auth.users`);

    // Step 2: Create missing users in auth.users
    let createdAuthCount = 0;
    console.log('🔄 Membuat user di auth.users...');

    for (const user of usersToCreate) {
      if (existingEmails.has(user.email)) {
        console.log(`⏭️  User ${user.email} sudah ada di auth.users, dilewati...`);
        continue;
      }

      console.log(`🆕 Membuat user ${user.email} di auth.users...`);
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true
      });

      if (error) {
        console.error(`❌ Error membuat user ${user.email}:`, error.message);
      } else {
        console.log(`✅ Berhasil membuat user ${user.email} di auth.users`);
        createdAuthCount++;
      }
    }

    console.log(`📊 User baru di auth.users: ${createdAuthCount}`);

    // Step 3: Sync all auth users to public.users
    console.log('🔄 Menyinkronkan user ke public.users...');

    // Get all auth users again (including newly created)
    const { data: allAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUsers = allAuthUsers.users;

    // Get existing public users - use anon key for this
    const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: publicUsers, error: publicError } = await supabaseAnon
      .from('users')
      .select('email');

    if (publicError && publicError.code !== 'PGRST116') {
      console.error("❌ Error mengambil user dari public.users:", publicError.message);
      process.exit(1);
    }

    const publicEmails = new Set(publicUsers.map(u => u.email));
    let createdPublicCount = 0;

    for (const authUser of authUsers) {
      if (!authUser.email) continue;

      if (publicEmails.has(authUser.email)) {
        console.log(`⏭️  User ${authUser.email} sudah ada di public.users, dilewati...`);
        continue;
      }

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
        console.error(`❌ Error membuat user ${authUser.email} di public.users:`, createError.message);
      } else {
        console.log(`✅ Berhasil membuat user ${authUser.email} di public.users`);
        createdPublicCount++;
      }
    }

    console.log(`\n🎉 Proses selesai!`);
    console.log(`📊 User baru di auth.users: ${createdAuthCount}`);
    console.log(`📊 User baru di public.users: ${createdPublicCount}`);
    console.log(`\n💡 Sekarang coba login dengan:`);
    console.log(`   Email: salah satu dari ${usersToCreate.map(u => u.email).join(', ')}`);
    console.log(`   Password: ${DEFAULT_PASSWORD}`);
    console.log(`\n⚠️  Catatan: User akan diminta mengganti password pada login pertama`);

  } catch (error) {
    console.error("❌ Error tak terduga:", error);
    process.exit(1);
  }
}

createUsersAndSync();