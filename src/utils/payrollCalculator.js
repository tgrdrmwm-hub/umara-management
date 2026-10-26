/**
 * Payroll Calculation Engine for UMARA TAX CONSULTANT
 * Menghitung gaji, tunjangan, dan lembur berdasarkan presensi & skenario
 */

export const WORK_DAYS_PER_MONTH = 26;

// Skenario Penggajian
export const PAYROLL_SCENARIOS = {
  tahap_1: {
    id: "tahap_1",
    name: "Tahap Pertama",
    baseSalary: 2500000,
    dailyRate: 96154, // Rp 2.500.000 / 26 = 96.153,8 => 96.154
    mealRate: 25000, // x 26 = 650.000 (hangus jika terlambat per hari)
    transportRate: 15000, // x 26 = 390.000 (potong 50% jika terlambat = 7.500)
    orderlyAllowance: 260000, // uang tertib (hangus jika telat >= 1x)
    color: "emerald",
  },
  tahap_2: {
    id: "tahap_2",
    name: "Tahap Kedua",
    baseSalary: 1500000,
    dailyRate: 57690, // Rp 1.500.000 / 26 = 57.692,3 => 57.690
    mealRate: 20000, // x 26 = 520.000 (hangus jika terlambat per hari)
    transportRate: 10000, // x 26 = 260.000 (potong 50% jika terlambat = 5.000)
    orderlyAllowance: 260000, // uang tertib (hangus jika telat >= 1x)
    color: "blue",
  },
  training: {
    id: "training",
    name: "Training",
    baseSalary: 1000000,
    dailyRate: 38462, // Rp 1.000.000 / 26 = 38.461,5 => 38.462
    mealRate: 15000, // x 26 = 390.000 (hangus jika terlambat per hari)
    transportRate: 7500, // x 26 = 195.000 (potong 50% jika terlambat = 3.750)
    orderlyAllowance: 260000, // uang tertib (hangus jika telat >= 1x)
    color: "amber",
  },
};

// Simbol Uang Jabatan (Bu Uma tinggal milih simbol)
export const POSITION_SYMBOLS = {
  A: {
    symbol: "A",
    title: "Staff Admin / Administrative Assistant",
    amount: 250000,
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
  },
  B: {
    symbol: "B",
    title: "Tax Assistant / Tax Junior",
    amount: 400000,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  },
  C: {
    symbol: "C",
    title: "Tax Associate / Junior Consultant / HRD",
    amount: 550000,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  },
  D: {
    symbol: "D",
    title: "Tax Senior / Senior Consultant",
    amount: 800000,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
  },
  "-": {
    symbol: "-",
    title: "Tanpa Uang Jabatan",
    amount: 0,
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
};

// Data Profil Awal Staff dari Spesifikasi
export const DEFAULT_STAFF_ASSIGNMENTS = {
  anna: {
    key: "anna",
    name: "Bu Anna",
    jobTitle: "HRD & Tax Senior Staff",
    symbol: "D", // 800.000 (Tax Senior / HRD)
    scenario: "tahap_1",
  },
  aulia: {
    key: "aulia",
    name: "Aulia",
    jobTitle: "Tax Senior Staff",
    symbol: "D", // 800.000
    scenario: "tahap_1",
  },
  intan: {
    key: "intan",
    name: "Intan",
    jobTitle: "Tax Senior Staff",
    symbol: "D", // 800.000
    scenario: "tahap_1",
  },
  nita: {
    key: "nita",
    name: "Nita",
    jobTitle: "Tax Associate / Junior Consultant",
    symbol: "C", // 550.000
    scenario: "tahap_1",
  },
  septi: {
    key: "septi",
    name: "Septi",
    jobTitle: "Tax Assistant",
    symbol: "B", // 400.000
    scenario: "tahap_1",
  },
  baiti: {
    key: "baiti",
    name: "Baiti",
    jobTitle: "Tax Administrative Staff",
    symbol: "A", // 250.000
    scenario: "tahap_1",
  },
  aini: {
    key: "aini",
    name: "Aini",
    jobTitle: "Tax Administrative Staff",
    symbol: "A", // 250.000
    scenario: "tahap_1",
  },
  azizah: {
    key: "azizah",
    name: "Azizah",
    jobTitle: "Tax Assistant",
    symbol: "B", // 400.000
    scenario: "tahap_1",
  },
  tegar: {
    key: "tegar",
    name: "Tegar",
    jobTitle: "Developer IT",
    symbol: "D", // 800.000
    scenario: "tahap_1",
  },
  mario: {
    key: "mario",
    name: "Mario",
    jobTitle: "Tax Support Staff",
    symbol: "A", // 250.000
    scenario: "tahap_1",
  },
  anggun: {
    key: "anggun",
    name: "Anggun",
    jobTitle: "Tax Staff",
    symbol: "B", // 400.000
    scenario: "tahap_1",
  },
};

/**
 * Format angka ke format Rupiah standar
 */
export function formatRupiah(val) {
  const num = Math.round(Number(val) || 0);
  return `Rp ${num.toLocaleString("id-ID")}`;
}

/**
 * Konversi angka ke kalimat terbilang Bahasa Indonesia
 */
export function terbilang(angka) {
  const bilangan = Math.floor(Math.abs(Number(angka) || 0));
  const kata = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  function convert(n) {
    if (n < 12) return kata[n];
    if (n < 20) return convert(n - 10) + " Belas";
    if (n < 100) return convert(Math.floor(n / 10)) + " Puluh " + convert(n % 10);
    if (n < 200) return "Seratus " + convert(n - 100);
    if (n < 1000) return convert(Math.floor(n / 100)) + " Ratus " + convert(n % 100);
    if (n < 2000) return "Seribu " + convert(n - 1000);
    if (n < 1000000) return convert(Math.floor(n / 1000)) + " Ribu " + convert(n % 1000);
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + " Juta " + convert(n % 1000000);
    if (n < 1000000000000) return convert(Math.floor(n / 1000000000)) + " Milyar " + convert(n % 1000000000);
    return convert(Math.floor(n / 1000000000000)) + " Triliun " + convert(n % 1000000000000);
  }

  if (bilangan === 0) return "Nol Rupiah";
  const hasil = convert(bilangan).replace(/\s+/g, " ").trim();
  return `${hasil} Rupiah`;
}

/**
 * Filter data presensi untuk staf tertentu pada bulan yang dipilih
 * @param {Array} attendanceList - seluruh riwayat attendance
 * @param {string} staffIdentifier - nama atau id staf
 * @param {string} yearMonth - format 'YYYY-MM' (contoh: '2026-10')
 */
export function filterStaffAttendance(attendanceList = [], staffIdentifier = "", yearMonth = "") {
  const identifiers = (Array.isArray(staffIdentifier) ? staffIdentifier : [staffIdentifier])
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim());

  // Expand with stripped prefixes like "bu ", "pak "
  const variants = new Set();
  identifiers.forEach((id) => {
    variants.add(id);
    const withoutTitle = id.replace(/^(bu|pak)\s+/i, "").trim();
    if (withoutTitle) variants.add(withoutTitle);
  });

  return attendanceList.filter((att) => {
    if (!att.date) return false;
    if (yearMonth && !att.date.startsWith(yearMonth)) return false;

    const attStaff = String(att.staff || "").toLowerCase().trim();
    if (!attStaff) return false;

    const attWithoutTitle = attStaff.replace(/^(bu|pak)\s+/i, "").trim();

    for (const v of variants) {
      if (
        attStaff === v ||
        attWithoutTitle === v ||
        attStaff.includes(v) ||
        v.includes(attStaff) ||
        (attWithoutTitle && (attWithoutTitle.includes(v) || v.includes(attWithoutTitle)))
      ) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Menghitung jam lembur otomatis dari jam pulang presensi jika melebihi jam 17:00
 */
export function estimateOvertimeFromAttendance(staffAttendance = []) {
  let overtimeHours = 0;
  staffAttendance.forEach((att) => {
    if (!att.checkOut) return;
    const parts = att.checkOut.split(":");
    if (parts.length >= 2) {
      const outHour = parseInt(parts[0], 10);
      const outMin = parseInt(parts[1], 10);
      const totalMinutes = outHour * 60 + outMin;
      // Normal checkout is 17:00 (1020 mins). Jeda 30 menit toleransi (17:30 = 1050 mins)
      if (totalMinutes > 1050) {
        const extraHours = (totalMinutes - 1020) / 60;
        overtimeHours += Math.floor(extraHours * 2) / 2; // kelipatan 0.5 jam
      }
    }
  });
  return overtimeHours;
}

/**
 * Menghitung masa kerja (tenure) staf berdasarkan tanggal bergabung sampai bulan target
 */
export function calculateTenure(joinDateStr, targetYearMonth) {
  if (!joinDateStr) {
    return {
      hasJoined: false,
      monthsWorked: 0,
      totalDays: 0,
      tenureText: "Belum diisi",
      formattedJoinDate: "-",
    };
  }

  const joinDate = new Date(joinDateStr);
  if (isNaN(joinDate.getTime())) {
    return {
      hasJoined: false,
      monthsWorked: 0,
      totalDays: 0,
      tenureText: "Format tidak valid",
      formattedJoinDate: "-",
    };
  }

  const formattedJoinDate = joinDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Target akhir bulan dari targetYearMonth (contoh: 2026-10 -> hari terakhir bulan itu)
  let targetDate;
  if (targetYearMonth) {
    const [y, m] = targetYearMonth.split("-");
    targetDate = new Date(parseInt(y, 10), parseInt(m, 10), 0);
  } else {
    targetDate = new Date();
  }

  const diffTime = targetDate.getTime() - joinDate.getTime();
  const totalDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  let months = (targetDate.getFullYear() - joinDate.getFullYear()) * 12 + (targetDate.getMonth() - joinDate.getMonth());
  if (targetDate.getDate() < joinDate.getDate()) {
    months = Math.max(0, months - 1);
  }

  let tenureText = "";
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    tenureText = remMonths > 0 ? `${years} Thn ${remMonths} Bln` : `${years} Tahun`;
  } else if (months > 0) {
    tenureText = `${months} Bulan`;
  } else {
    tenureText = `${totalDays} Hari`;
  }

  return {
    hasJoined: true,
    totalDays,
    monthsWorked: months,
    tenureText,
    formattedJoinDate,
  };
}

/**
 * Otomatis menentukan Skenario Penggajian berdasarkan Masa Kerja / Tanggal Bergabung:
 * - < 3 Bulan: Skenario Training (0 - 3 bulan)
 * - 3 s/d 6 Bulan: Skenario Tahap Kedua (3 - 6 bulan)
 * - >= 6 Bulan: Skenario Tahap Pertama (Staf Tetap / Senior)
 */
export function determineScenarioFromJoinDate(joinDateStr, targetYearMonth) {
  const tenure = calculateTenure(joinDateStr, targetYearMonth);
  if (!tenure.hasJoined) {
    return {
      scenarioId: null,
      tenure,
      badgeText: "Manual",
      reason: "Tanggal bergabung belum diisi staf di profil pribadi",
    };
  }

  if (tenure.monthsWorked < 3) {
    return {
      scenarioId: "training",
      tenure,
      badgeText: "Auto Training",
      reason: `Masa kerja ${tenure.tenureText} (< 3 bln) → Skenario Training`,
    };
  }

  if (tenure.monthsWorked < 6) {
    return {
      scenarioId: "tahap_2",
      tenure,
      badgeText: "Auto Tahap 2",
      reason: `Masa kerja ${tenure.tenureText} (3-6 bln) → Skenario Tahap Kedua`,
    };
  }

  return {
    scenarioId: "tahap_1",
    tenure,
    badgeText: "Auto Tahap 1",
    reason: `Masa kerja ${tenure.tenureText} (≥ 6 bln) → Skenario Tahap Pertama`,
  };
}

/**
 * Hitung Penggajian Lengkap untuk Staf
 * 
 * Aturan Perhitungan:
 * 1. Gaji Pokok:
 *    - Jika masuk >= 26 hari: Gaji Pokok Penuh.
 *    - Jika masuk < 26 hari: hariMasuk * dailyRate.
 * 2. Uang Makan:
 *    - Tepat waktu: Rp tarif / hari.
 *    - Terlambat: HANGUS (Rp 0 / hari terlambat).
 *    - Total = hariTepatWaktu * mealRate.
 * 3. Uang Transport:
 *    - Tepat waktu: Rp tarif / hari.
 *    - Terlambat: DIPOTONG 50% (Rp tarif * 0.5 / hari terlambat).
 *    - Total = (hariTepatWaktu * transportRate) + (hariTerlambat * (transportRate * 0.5)).
 * 4. Uang Tertib:
 *    - Standar Rp 260.000.
 *    - Jika hariTerlambat >= 1: HANGUS = Rp 0.
 *    - Jika hariTerlambat === 0 & hariMasuk > 0: Rp 260.000.
 * 5. Uang Jabatan:
 *    - Sesuai simbol A (250k), B (400k), C (550k), D (800k), - (0).
 * 6. Uang Lembur:
 *    - Rumus: 1/173 x (Gaji Pokok + Total Tunjangan) per jam.
 *    - Rate per jam: Math.round((baseSalary + standardAllowances) / 173).
 *    - Total = jamLembur * rateLemburPerJam.
 * 7. Total Bersih:
 *    - Gaji Pokok + Uang Makan + Uang Transport + Uang Tertib + Uang Jabatan + Uang Lembur + Bonus - Potongan.
 */
export function calculateStaffSalary({
  staffKey = "",
  staffName = "",
  jobTitle = "",
  scenarioId = null,
  positionSymbol = "A",
  customPositionAmount = null,
  joinDate = "",
  targetYearMonth = "",
  staffAttendance = [],
  manualOvertimeHours = null,
  bonus = 0,
  deductions = 0,
  notes = "",
}) {
  // Hitung masa kerja dan auto scenario dari join date
  const autoDetect = determineScenarioFromJoinDate(joinDate, targetYearMonth);
  const resolvedScenarioId = scenarioId || autoDetect.scenarioId || "tahap_1";
  const scenario = PAYROLL_SCENARIOS[resolvedScenarioId] || PAYROLL_SCENARIOS.tahap_1;
  const position = POSITION_SYMBOLS[positionSymbol] || POSITION_SYMBOLS["-"];

  // Hitung hari masuk dan status kehadiran dari presensi
  let hariTepatWaktu = 0;
  let hariTerlambat = 0;
  let hariIzin = 0;
  const lateDates = [];

  staffAttendance.forEach((att) => {
    const rawStatus = (att.status || "").toLowerCase().trim();
    // Aturan kantor Umara: check-in setelah jam 08:00 terhitung terlambat
    const checkInStr = (att.checkIn || "").trim();
    const isLateByCheckIn = Boolean(checkInStr && checkInStr.slice(0, 5) > "08:00");
    const isLate = rawStatus === "terlambat" || (rawStatus === "hadir" && isLateByCheckIn);

    if (isLate) {
      hariTerlambat++;
      lateDates.push({ date: att.date, checkIn: att.checkIn });
    } else if (rawStatus === "hadir") {
      hariTepatWaktu++;
    } else if (["izin", "sakit", "remote"].includes(rawStatus)) {
      hariIzin++;
    }
  });

  const hariMasuk = hariTepatWaktu + hariTerlambat;

  // 1. Gaji Pokok
  let gajiPokok = 0;
  if (hariMasuk >= WORK_DAYS_PER_MONTH) {
    gajiPokok = scenario.baseSalary;
  } else {
    gajiPokok = hariMasuk * scenario.dailyRate;
  }

  // 2. Uang Makan (hangus saat terlambat)
  const uangMakanPerHari = scenario.mealRate;
  const uangMakan = hariTepatWaktu * uangMakanPerHari;
  const uangMakanHangus = hariTerlambat * uangMakanPerHari;
  const uangMakanPotensial = WORK_DAYS_PER_MONTH * uangMakanPerHari;

  // 3. Uang Transport (potong 50% saat terlambat)
  const transportPerHari = scenario.transportRate;
  const transportPotonganPerHari = transportPerHari * 0.5;
  const uangTransportTepat = hariTepatWaktu * transportPerHari;
  const uangTransportTerlambat = hariTerlambat * transportPotonganPerHari;
  const uangTransport = uangTransportTepat + uangTransportTerlambat;
  const uangTransportDipotong = hariTerlambat * (transportPerHari * 0.5);
  const uangTransportPotensial = WORK_DAYS_PER_MONTH * transportPerHari;

  // 4. Uang Tertib (Rp 260.000, hangus jika terlambat >= 1 kali)
  const uangTertibStandar = scenario.orderlyAllowance;
  const isOrderlyForfeited = hariTerlambat > 0;
  const uangTertib = (!isOrderlyForfeited && hariMasuk > 0) ? uangTertibStandar : 0;

  // 5. Uang Jabatan
  const uangJabatan = customPositionAmount !== null && customPositionAmount !== undefined
    ? Number(customPositionAmount)
    : position.amount;

  // 6. Uang Lembur
  // Formula Depnaker: 1/173 x (Gaji Pokok + Tunjangan Tetap)
  // Tunjangan tetap: Uang Makan Penuh (26 hari) + Uang Transport Penuh (26 hari) + Uang Jabatan + Uang Tertib
  const totalTunjanganStandar = uangMakanPotensial + uangTransportPotensial + uangJabatan + uangTertibStandar;
  const upahDasarLembur = scenario.baseSalary + totalTunjanganStandar;
  const rateLemburPerJam = Math.round(upahDasarLembur / 173);

  // Jam lembur
  const jamLembur = manualOvertimeHours !== null && manualOvertimeHours !== undefined
    ? Number(manualOvertimeHours)
    : estimateOvertimeFromAttendance(staffAttendance);

  const uangLembur = Math.round(jamLembur * rateLemburPerJam);

  // 7. Bonus & Potongan Tambahan
  const bonusVal = Number(bonus) || 0;
  const deductionsVal = Number(deductions) || 0;

  // 8. Total Gaji Bersih (Take Home Pay)
  const totalGaji = Math.max(
    0,
    gajiPokok + uangMakan + uangTransport + uangTertib + uangJabatan + uangLembur + bonusVal - deductionsVal
  );

  return {
    staffKey,
    staffName,
    jobTitle: jobTitle || position.title,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    positionSymbol: position.symbol,
    positionTitle: position.title,
    positionAmount: position.amount,

    // Rekap Kehadiran
    hariMasuk,
    hariTepatWaktu,
    hariTerlambat,
    hariIzin,
    targetHari: WORK_DAYS_PER_MONTH,
    lateDates,

    // Rincian Komponen Gaji
    gajiPokok,
    gajiPokokStandar: scenario.baseSalary,
    dailyRate: scenario.dailyRate,

    uangMakan,
    uangMakanPerHari,
    uangMakanHangus,
    uangMakanPotensial,

    uangTransport,
    transportPerHari,
    uangTransportDipotong,
    uangTransportPotensial,

    uangTertib,
    uangTertibStandar,
    isOrderlyForfeited,

    uangJabatan,

    jamLembur,
    rateLemburPerJam,
    uangLembur,
    upahDasarLembur,

    bonus: bonusVal,
    deductions: deductionsVal,
    totalGaji,
    totalGajiTerbilang: terbilang(totalGaji),
    notes,

    // Informasi Tanggal Bergabung & Masa Kerja
    joinDate,
    tenure: autoDetect.tenure,
    autoScenario: autoDetect,
  };
}
