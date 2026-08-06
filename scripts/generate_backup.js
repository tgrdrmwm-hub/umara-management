import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TABLES_TO_BACKUP = [
  'users',
  'clients',
  'tasks',
  'intern_tasks',
  'attendance',
  'tax'
];

function escapeSqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'string') {
    // Escape single quotes for SQL by doubling them
    const escaped = v.replace(/'/g, "''");
    return `'${escaped}'`;
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') {
      // For JSON objects
      return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  }
  return v;
}

async function generateBackup() {
  console.log('Memulai proses backup data...');
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `backup_umaratax_${dateStr}.sql`;
  const filePath = path.resolve(__dirname, '../', fileName);
  
  let sqlDump = `-- Backup Database Umara Tax\n-- Tanggal: ${new Date().toLocaleString('id-ID')}\n\n`;

  for (const table of TABLES_TO_BACKUP) {
    console.log(`Mengambil data dari tabel: ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`Gagal mengambil data dari ${table}:`, error.message);
      continue;
    }

    if (data.length === 0) {
        sqlDump += `-- Tabel ${table} kosong\n\n`;
        continue;
    }

    sqlDump += `-- ==========================================\n`;
    sqlDump += `-- Data untuk tabel: ${table} (${data.length} baris)\n`;
    sqlDump += `-- ==========================================\n`;
    
    for (const row of data) {
      const columns = Object.keys(row).map(c => `"${c}"`).join(', ');
      const values = Object.values(row).map(escapeSqlValue).join(', ');
      sqlDump += `INSERT INTO public.${table} (${columns}) VALUES (${values});\n`;
    }
    
    sqlDump += '\n';
  }

  fs.writeFileSync(filePath, sqlDump, 'utf8');
  console.log(`\n✅ Backup berhasil dibuat! File tersimpan di:`);
  console.log(`   ${filePath}`);
  console.log(`\nSilakan kirim file ini ke Telegram Anda.`);
}

generateBackup();
