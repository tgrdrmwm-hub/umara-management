import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase URL atau Key tidak ditemukan di file .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function detectType(name) {
  const upper = name.trim().toUpperCase();
  if (
    upper.startsWith('PT ') || upper.startsWith('PT.') || upper.startsWith('PT') ||
    upper.startsWith('CV ') || upper.startsWith('CV.') || upper.startsWith('CV') ||
    upper.startsWith('UD ') || upper.startsWith('UD.') || upper.startsWith('UD') ||
    upper.startsWith('KSP ') || upper.startsWith('YAYASAN') ||
    upper.startsWith('KOPERASI') || upper.startsWith('TOKO ')
  ) {
    return 'Badan';
  }
  return 'OP';
}

async function cleanAndImport() {
  console.log("==================================================");
  console.log("   BERSIHKAN DATABASE & IMPORT ULANG LENGKAP      ");
  console.log("==================================================\n");

  // 1. Bersihkan Tabel Tasks
  console.log("1. Membersihkan tabel 'tasks'...");
  const { error: taskErr } = await supabase
    .from('tasks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (taskErr) {
    console.warn("   ⚠️ Peringatan saat hapus tasks:", taskErr.message);
  } else {
    console.log("   ✓ Tabel tasks berhasil dibersihkan (0 tugas).");
  }

  // 2. Bersihkan Tabel Activity Logs
  console.log("2. Membersihkan tabel 'activity_logs'...");
  const { error: logErr } = await supabase
    .from('activity_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (logErr) {
    console.warn("   ⚠️ Peringatan saat hapus activity_logs:", logErr.message);
  } else {
    console.log("   ✓ Tabel activity_logs berhasil dibersihkan.");
  }

  // 3. Reset Poin Staf ke 0
  console.log("3. Mereset perolehan poin seluruh staf ke 0...");
  const { error: userErr } = await supabase
    .from('users')
    .update({ points: 0, updated_at: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (userErr) {
    console.warn("   ⚠️ Peringatan saat reset poin users:", userErr.message);
  } else {
    console.log("   ✓ Poin seluruh staf berhasil direset menjadi 0.");
  }

  // 4. Bersihkan Tabel Clients
  console.log("4. Menghapus seluruh data klien lama di tabel 'clients'...");
  const { error: clientDelErr } = await supabase
    .from('clients')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (clientDelErr) {
    console.error("   ❌ Gagal menghapus klien lama:", clientDelErr.message);
    process.exit(1);
  }
  console.log("   ✓ Seluruh data klien lama berhasil dihapus.");

  // 5. Baca dan Parse File CSV
  const csvPath = path.resolve(__dirname, '../LIST KLIEN 2026 - ALL KLIEN.csv');
  console.log(`\n5. Membaca file CSV dari:\n   ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error(`   ❌ File CSV tidak ditemukan!`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

  const rawRows = parsed.data;
  console.log(`   Total baris dalam CSV: ${rawRows.length}`);

  const clientsToInsert = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const name = (row['NAMA WAJIB PAJAK'] || '').trim();
    if (!name) continue;

    const kontrak = (row['KONTRAK'] || '').trim() || 'Bulanan';
    const pph25 = String(row['PPH 25'] || '').trim().toUpperCase() === 'TRUE';
    const pphFinal = String(row['PPH FINAL'] || '').trim().toUpperCase() === 'TRUE';
    const ppn = String(row['PPN'] || '').trim().toUpperCase() === 'TRUE';
    const pph21 = String(row['PPH 21'] || '').trim().toUpperCase() === 'TRUE';
    const pic = (row['PIC'] || '').replace(/\s+/g, ' ').trim();

    const keteranganJson = JSON.stringify({
      pph_25: pph25,
      pph_final: pphFinal,
      ppn: ppn,
      pph_21: pph21,
      notes: '',
    });

    clientsToInsert.push({
      name,
      kontrak,
      type: detectType(name),
      status: 'Aktif',
      pic,
      keterangan: keteranganJson,
    });
  }

  console.log(`   Jumlah data klien valid yang siap diimpor: ${clientsToInsert.length}`);

  // 6. Batch Insert ke Supabase
  console.log("\n6. Mengimpor data ke database Supabase...");
  const BATCH_SIZE = 50;
  let insertedCount = 0;

  for (let i = 0; i < clientsToInsert.length; i += BATCH_SIZE) {
    const chunk = clientsToInsert.slice(i, i + BATCH_SIZE);
    const { error: insertErr } = await supabase.from('clients').insert(chunk);

    if (insertErr) {
      console.error(`   ❌ Gagal insert batch ${i + 1} - ${i + chunk.length}:`, insertErr.message);
      process.exit(1);
    }
    insertedCount += chunk.length;
    console.log(`   Progress: ${insertedCount}/${clientsToInsert.length} klien tersimpan...`);
  }

  // 7. Catat Log Aktivitas
  console.log("\n7. Mencatat log aktivitas sistem...");
  try {
    await supabase.from('activity_logs').insert([
      {
        user_name: 'Admin / System',
        action: 'Reset Database & Import Ulang Lengkap',
        details: `Database dibersihkan dan ${insertedCount} klien berhasil diimpor lengkap dari LIST KLIEN 2026 - ALL KLIEN.csv.`,
      },
    ]);
    console.log("   ✓ Log aktivitas tercatat.");
  } catch (logErr) {
    console.warn("   ⚠️ Gagal mencatat log aktivitas:", logErr.message);
  }

  // 8. Verifikasi Akhir
  console.log("\n8. Verifikasi Hasil Akhir:");
  const { count: finalClients } = await supabase.from('clients').select('*', { count: 'exact', head: true });
  const { count: finalTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
  const { data: usersData } = await supabase.from('users').select('name, points');

  console.log(`   • Total Klien di Database: ${finalClients} (Target: ${clientsToInsert.length})`);
  console.log(`   • Total Task di Board: ${finalTasks} (Harus 0)`);
  console.log(`   • Status Poin Staf:`, usersData.map(u => `${u.name}: ${u.points} pt`).join(', '));

  console.log("\n==================================================");
  console.log("   ✅ DATABASE BERHASIL DIBERSIHKAN & DIIMPOR!     ");
  console.log("==================================================");
}

cleanAndImport();
