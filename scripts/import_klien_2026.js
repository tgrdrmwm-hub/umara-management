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
  console.error("Supabase URL or Key missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function detectType(name) {
  const upper = name.trim().toUpperCase();
  if (
    upper.startsWith('PT ') || upper.startsWith('PT.') || 
    upper.startsWith('CV ') || upper.startsWith('CV.') || 
    upper.startsWith('UD ') || upper.startsWith('UD.') || 
    upper.startsWith('KSP ') || upper.startsWith('YAYASAN') ||
    upper.startsWith('KOPERASI') || upper.startsWith('TOKO ')
  ) {
    return 'Badan';
  }
  return 'OP';
}

async function importClients() {
  const csvPath = path.resolve(__dirname, '../LIST KLIEN 2026 - ALL KLIEN.csv');
  console.log(`Membaca file CSV dari: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error(`File tidak ditemukan: ${csvPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

  const rawRows = parsed.data;
  console.log(`Total baris dalam CSV: ${rawRows.length}`);

  const clientsToInsert = [];

  for (const row of rawRows) {
    const name = (row['NAMA WAJIB PAJAK'] || '').trim();
    if (!name) continue;

    const kontrak = (row['KONTRAK'] || '').trim() || 'Bulanan';
    const pph25 = String(row['PPH 25'] || '').trim().toUpperCase() === 'TRUE';
    const pphFinal = String(row['PPH FINAL'] || '').trim().toUpperCase() === 'TRUE';
    const ppn = String(row['PPN'] || '').trim().toUpperCase() === 'TRUE';
    const pph21 = String(row['PPH 21'] || '').trim().toUpperCase() === 'TRUE';
    const pic = (row['PIC'] || '').trim();

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

  console.log(`Jumlah klien valid siap diimpor: ${clientsToInsert.length}`);

  // Batch insert dalam kelipatan 50
  const BATCH_SIZE = 50;
  let insertedCount = 0;

  for (let i = 0; i < clientsToInsert.length; i += BATCH_SIZE) {
    const chunk = clientsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('clients').insert(chunk);

    if (error) {
      console.error(`Gagal insert batch ${i} - ${i + chunk.length}:`, error.message);
      process.exit(1);
    }
    insertedCount += chunk.length;
    console.log(`Progress: ${insertedCount}/${clientsToInsert.length} klien tersimpan...`);
  }

  // Catat activity log
  try {
    await supabase.from('activity_logs').insert([
      {
        user_name: 'Admin',
        action: 'Import Klien 2026',
        details: `Berhasil mengimpor ${insertedCount} klien dari LIST KLIEN 2026 - ALL KLIEN.csv.`,
      },
    ]);
  } catch (err) {
    console.warn("Gagal mencatat log aktivitas:", err.message);
  }

  // Verifikasi
  const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true });
  console.log(`\n✅ SUKSES! Total data klien di Supabase sekarang: ${count}`);
}

importClients();
