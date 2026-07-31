import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

/**
 * Script to synchronize users from auth.users to public.users table
 * This fixes the "Profil user belum ada di tabel users" login error
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function syncAuthUsers() {
  try {
    console.log('🔄 Memulai sinkronisasi user...');

    // Test Supabase connection
    console.log('🔍 Memeriksa koneksi ke Supabase...');
    const { error: testError } = await supabase.from('users').select('id').limit(1);
    if (testError && testError.code !== 'PGRST116') { // PGRST116 = no rows found, which is fine
      console.error("❌ Error: Tidak bisa terhubung ke Supabase!");
      console.error(`Detail: ${testError.message}`);
      console.error("Pastikan:");
      console.error("- VITE_SUPABASE_URL benar");
      console.error("- SUPABASE_SERVICE_ROLE_KEY valid");
      console.error("- Koneksi internet stabil");
      process.exit(1);
    }
    console.log('✅ Koneksi ke Supabase berhasil!');

    // Get all users from auth.users
    console.log('🔍 Mengambil daftar user dari auth.users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error("❌ Error mengambil user dari auth.users:");
      console.error(`Detail: ${authError.message}`);
      console.error("Mungkin service role key tidak memiliki permission yang cukup");
      process.exit(1);
    }

    console.log(`✅ Ditemukan ${authUsers.users.length} user di auth.users`);

    // Get all existing users from public.users
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

      // Create user in public.users
      console.log(`🆕 Membuat user ${authUser.email} di public.users...`);

      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          name: authUser.email.split('@')[0], // Default name from email
          email: authUser.email,
          role: 'staff', // Default role
          status: 'active', // Default status
          is_first_login: true, // Mark as first login
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