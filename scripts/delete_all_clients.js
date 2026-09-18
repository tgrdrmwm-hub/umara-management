import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllClients() {
  console.log("Memeriksa data klien saat ini...");
  const { data: clients, error: fetchErr } = await supabase.from('clients').select('id, name');
  if (fetchErr) {
    console.error("Gagal mengambil data klien:", fetchErr.message);
    process.exit(1);
  }

  const count = clients ? clients.length : 0;
  console.log(`Ditemukan ${count} data klien.`);

  if (count === 0) {
    console.log("Tabel clients sudah kosong.");
    return;
  }

  console.log("Menghapus semua data klien...");
  const { error: deleteErr } = await supabase
    .from('clients')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteErr) {
    console.error("Gagal menghapus data klien:", deleteErr.message);
    process.exit(1);
  }

  // Log activity
  try {
    await supabase.from('activity_logs').insert([
      {
        user_name: 'System / Admin',
        action: 'Hapus Semua Data Klien',
        details: `Menghapus seluruh ${count} data klien dari database.`,
      },
    ]);
  } catch (logErr) {
    console.warn("Gagal mencatat log aktivitas:", logErr.message);
  }

  // Verifikasi akhir
  const { count: finalCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
  console.log(`✅ Berhasil! Jumlah klien sekarang: ${finalCount}`);
}

deleteAllClients();
