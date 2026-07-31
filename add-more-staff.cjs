#!/usr/bin/env node

/**
 * Script to add more staff users to auth.users
 * Requested: Aulia, Anna, Septi, Nita, Anggun, Azizah (already exist)
 * This script adds them if they don't exist
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const DEFAULT_PASSWORD = '12345678';

// List of staff to ensure exist
const staffList = [
  { name: 'Aulia', email: 'aulia@umaratax.com' },
  { name: 'Anna', email: 'anna@umaratax.com' },
  { name: 'Septi', email: 'septi@umaratax.com' },
  { name: 'Nita', email: 'nita@umaratax.com' },
  { name: 'Anggun', email: 'anggun@umaratax.com' },
  { name: 'Azizah', email: 'azizah@umaratax.com' },
];

async function addStaffUsers() {
  try {
    console.log('🔄 Memeriksa dan menambahkan staff user...');

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

    // Get existing auth users
    console.log('🔍 Memeriksa user yang sudah ada di auth.users...');
    const { data: existingAuthUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("❌ Error:", authError.message);
      process.exit(1);
    }

    const existingEmails = new Set(existingAuthUsers.users.map(u => u.email));
    console.log(`✅ Ditemukan ${existingAuthUsers.users.length} user di auth.users`);

    let createdCount = 0;
    let skippedCount = 0;

    console.log('🔄 Memproses staff list...');

    for (const staff of staffList) {
      if (existingEmails.has(staff.email)) {
        console.log(`⏭️  Staff ${staff.email} sudah ada di auth.users, dilewati...`);
        skippedCount++;
        continue;
      }

      console.log(`🆕 Membuat staff ${staff.email} di auth.users...`);
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: staff.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true
      });

      if (error) {
        console.error(`❌ Error membuat staff ${staff.email}:`, error.message);
      } else {
        console.log(`✅ Berhasil membuat staff ${staff.email} di auth.users`);
        createdCount++;
      }
    }

    console.log(`\n🎉 Proses selesai!`);
    console.log(`📊 Staff baru yang dibuat: ${createdCount}`);
    console.log(`📊 Staff yang dilewati (sudah ada): ${skippedCount}`);

    // List all staff in auth.users
    console.log('\n📋 Daftar semua user di auth.users:');
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    if (allUsers) {
      allUsers.users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.id})`);
      });
    }

    console.log(`\n💡 Sekarang coba login dengan password: ${DEFAULT_PASSWORD}`);

  } catch (error) {
    console.error("❌ Error tak terduga:", error);
    process.exit(1);
  }
}

addStaffUsers();