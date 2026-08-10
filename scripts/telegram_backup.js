import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables directly if needed, or rely on .env
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TELEGRAM_BOT_TOKEN = "8751933599:AAENfa7JLcx2GCapToU1uZ6GBsatt2MDS9w";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "6941346720";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function exportAllData() {
  const tables = [
    "users",
    "clients",
    "tasks",
    "tax",
    "attendance",
    "activity_logs",
  ];
  const backupData = {
    timestamp: new Date().toISOString(),
    data: {},
  };

  console.log("Memulai backup data...");

  for (const table of tables) {
    console.log(`Mengambil data dari tabel ${table}...`);
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`Gagal mengambil data dari ${table}:`, error.message);
      backupData.data[table] = { error: error.message };
    } else {
      backupData.data[table] = data;
    }
  }

  const backupFilePath = path.join(process.cwd(), "backup.json");
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
  console.log(`Backup berhasil disimpan ke ${backupFilePath}`);
  return backupFilePath;
}

async function sendToTelegram(filePath) {
  if (!TELEGRAM_CHAT_ID) {
    console.error("TELEGRAM_CHAT_ID belum diatur.");
    return;
  }

  console.log("Mengirim backup ke Telegram...");
  const form = new FormData();
  form.append("chat_id", TELEGRAM_CHAT_ID);
  
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: "application/json" });
  form.append("document", blob, `Umaratax_Backup_${new Date().toISOString().split("T")[0]}.json`);
  
  form.append("caption", "📦 Backup mingguan data Umaratax berhasil dibuat.");

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
    {
      method: "POST",
      body: form,
    }
  );

  const result = await response.json();
  if (result.ok) {
    console.log("✅ Backup berhasil dikirim ke Telegram!");
  } else {
    console.error("❌ Gagal mengirim ke Telegram:", result);
  }
}

async function main() {
  try {
    const backupFile = await exportAllData();
    await sendToTelegram(backupFile);
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  }
}

main();
