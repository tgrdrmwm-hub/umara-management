import { supabase } from "./supabase";
import { DEFAULT_STAFF_ASSIGNMENTS } from "../utils/payrollCalculator";

const STORAGE_SETTINGS_KEY = "umara_payroll_staff_settings_v1";
const STORAGE_RECORDS_KEY = "umara_payroll_monthly_records_v1";

/**
 * Ambil pengaturan gaji staf (skenario dan simbol jabatan) dari localStorage
 */
export function getLocalSalarySettings() {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_STAFF_ASSIGNMENTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STAFF_ASSIGNMENTS, ...parsed };
  } catch (err) {
    console.warn("Gagal membaca salary settings lokal:", err);
    return { ...DEFAULT_STAFF_ASSIGNMENTS };
  }
}

/**
 * Simpan pengaturan gaji staf ke localStorage
 */
export function saveLocalSalarySettings(settings) {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Gagal menyimpan salary settings lokal:", err);
  }
}

/**
 * Ambil catatan penyesuaian gaji bulanan (jam lembur manual, bonus, potongan)
 */
export function getLocalPayrollRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_RECORDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn("Gagal membaca payroll records lokal:", err);
    return {};
  }
}

/**
 * Simpan catatan penyesuaian gaji bulanan
 */
export function saveLocalPayrollRecords(records) {
  try {
    localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn("Gagal menyimpan payroll records lokal:", err);
  }
}

/**
 * Mengambil seluruh konfigurasi gaji staf (Supabase dengan fallback localStorage)
 */
export async function fetchSalarySettings() {
  const localSettings = getLocalSalarySettings();

  if (!supabase) return localSettings;

  try {
    const { data, error } = await supabase
      .from("staff_salary_settings")
      .select("*");

    if (error) {
      // Jika tabel belum ada di Supabase, gunakan local
      return localSettings;
    }

    if (data && data.length > 0) {
      const merged = { ...localSettings };
      data.forEach((row) => {
        const key = String(row.staff_name).toLowerCase();
        merged[key] = {
          key,
          name: row.staff_name,
          jobTitle: row.job_title || merged[key]?.jobTitle || "",
          scenario: row.scenario || "tahap_1",
          symbol: row.position_symbol || "A",
          customPositionAmount: row.custom_position_allowance,
        };
      });
      saveLocalSalarySettings(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Fetch salary settings notice:", err);
  }

  return localSettings;
}

/**
 * Simpan/Update konfigurasi gaji staf untuk satu staf
 */
export async function updateStaffSalarySetting(staffKey, values) {
  const localSettings = getLocalSalarySettings();
  const current = localSettings[staffKey] || { key: staffKey, name: values.name || staffKey };
  
  const updated = {
    ...current,
    ...values,
    key: staffKey,
  };

  localSettings[staffKey] = updated;
  saveLocalSalarySettings(localSettings);

  if (supabase) {
    try {
      const payload = {
        staff_name: updated.name || staffKey,
        job_title: updated.jobTitle || null,
        scenario: updated.scenario || "tahap_1",
        position_symbol: updated.symbol || "A",
        custom_position_allowance: updated.customPositionAmount || null,
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from("staff_salary_settings")
        .upsert(payload, { onConflict: "staff_name" });
    } catch (err) {
      console.warn("Sync to Supabase staff_salary_settings warning:", err);
    }
  }

  return updated;
}

/**
 * Ambil penyesuaian gaji per bulan
 * Format key record: `${month}_${staffKey}` (contoh: '2026-10_anna')
 */
export async function fetchMonthlyPayrollRecords(month) {
  const allRecords = getLocalPayrollRecords();
  const monthRecords = {};

  Object.entries(allRecords).forEach(([k, v]) => {
    if (k.startsWith(`${month}_`)) {
      const staffKey = k.replace(`${month}_`, "");
      monthRecords[staffKey] = v;
    }
  });

  if (!supabase) return monthRecords;

  try {
    const { data, error } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("month", month);

    if (!error && data && data.length > 0) {
      data.forEach((row) => {
        const staffKey = String(row.staff_name).toLowerCase();
        monthRecords[staffKey] = {
          manualOvertimeHours: row.jam_lembur,
          bonus: row.bonus,
          deductions: row.potongan,
          notes: row.notes,
          status: row.status,
          scenario: row.scenario,
          symbol: row.position_symbol,
        };
      });
    }
  } catch (err) {
    console.warn("Fetch monthly payroll records notice:", err);
  }

  return monthRecords;
}

/**
 * Simpan penyesuaian gaji bulanan untuk staf tertentu
 */
export async function saveMonthlyAdjustment(month, staffKey, staffName, adjustments) {
  const allRecords = getLocalPayrollRecords();
  const recordKey = `${month}_${staffKey}`;

  const current = allRecords[recordKey] || {};
  const merged = { ...current, ...adjustments };
  allRecords[recordKey] = merged;
  saveLocalPayrollRecords(allRecords);

  if (supabase) {
    try {
      const payload = {
        month,
        staff_name: staffName || staffKey,
        scenario: merged.scenario || "tahap_1",
        position_symbol: merged.symbol || "A",
        jam_lembur: Number(merged.manualOvertimeHours || 0),
        bonus: Number(merged.bonus || 0),
        potongan: Number(merged.deductions || 0),
        notes: merged.notes || null,
        status: merged.status || "Draft",
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from("payroll_records")
        .upsert(payload, { onConflict: "month,staff_name" });
    } catch (err) {
      console.warn("Sync to Supabase payroll_records warning:", err);
    }
  }

  return merged;
}
