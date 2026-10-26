import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Calendar,
  Search,
  Printer,
  Download,
  Info,
  SlidersHorizontal,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Award,
  FileSpreadsheet,
  Users,
  Building,
  HelpCircle,
  Pencil,
  Eye,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import {
  PAYROLL_SCENARIOS,
  POSITION_SYMBOLS,
  DEFAULT_STAFF_ASSIGNMENTS,
  WORK_DAYS_PER_MONTH,
  formatRupiah,
  filterStaffAttendance,
  calculateStaffSalary,
} from "../utils/payrollCalculator";
import {
  fetchSalarySettings,
  updateStaffSalarySetting,
  fetchMonthlyPayrollRecords,
  saveMonthlyAdjustment,
} from "../services/payrollService";
import { PayslipModal } from "../components/payroll/PayslipModal";
import { AuditFormulaModal } from "../components/payroll/AuditFormulaModal";
import { AdjustPayrollModal } from "../components/payroll/AdjustPayrollModal";
import { StaffProfileModal } from "../components/StaffProfileModal";

function getInitialYearMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function PayrollPage() {
  const { data } = useAppData();
  const { user: currentUser } = useAuth();
  const canEditPayroll = currentUser?.role === "owner" || currentUser?.role === "developer";

  const [selectedMonth, setSelectedMonth] = useState(getInitialYearMonth());
  const [searchTerm, setSearchTerm] = useState("");
  const [scenarioFilter, setScenarioFilter] = useState("all");

  const [staffSettings, setStaffSettings] = useState({});
  const [monthlyAdjustments, setMonthlyAdjustments] = useState({});
  const [loading, setLoading] = useState(true);

  // Modals state
  const [activePayslipItem, setActivePayslipItem] = useState(null);
  const [activeAuditItem, setActiveAuditItem] = useState(null);
  const [activeAdjustItem, setActiveAdjustItem] = useState(null);
  const [showFormulaGuide, setShowFormulaGuide] = useState(false);
  const [profileModalStaff, setProfileModalStaff] = useState(null);

  const allAttendance = data?.attendance ?? [];
  const dbUsers = data?.users ?? [];

  // Load Settings & Monthly Records
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [settings, monthlyRecords] = await Promise.all([
          fetchSalarySettings(),
          fetchMonthlyPayrollRecords(selectedMonth),
        ]);
        if (mounted) {
          setStaffSettings(settings);
          setMonthlyAdjustments(monthlyRecords);
        }
      } catch (err) {
        console.error("Gagal memuat data penggajian:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [selectedMonth]);

  // Gabungkan daftar staf unik dari DB + default profil yang diminta pengguna
  const staffList = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. Masukkan default staff yang ditentukan
    Object.entries(DEFAULT_STAFF_ASSIGNMENTS).forEach(([key, def]) => {
      seen.add(key.toLowerCase());
      // Cari jika ada user DB yang cocok
      const matchedUser = dbUsers.find(
        (u) =>
          u.name?.toLowerCase().includes(key) ||
          key.includes(u.name?.toLowerCase() || "") ||
          u.email?.toLowerCase().includes(key),
      );

      list.push({
        key,
        name: def.name,
        email: matchedUser?.email || `${key}@umaratax.com`,
        dbUser: matchedUser || null,
        defaultJobTitle: def.jobTitle,
        defaultSymbol: def.symbol,
        defaultScenario: def.scenario,
      });
    });

    // 2. Masukkan staf dari database yang belum masuk (kecuali owner / magang tertentu jika ada)
    dbUsers.forEach((u) => {
      const uName = (u.name || "").trim();
      const uKey = uName.toLowerCase();
      // Skip Bu Uma (Owner) dari daftar penerima gaji staff
      if (
        u.role === "owner" ||
        uKey.includes("owner") ||
        uKey.includes("umatun")
      ) {
        return;
      }
      if (!seen.has(uKey)) {
        seen.add(uKey);
        list.push({
          key: uKey,
          name: uName || u.email?.split("@")[0] || "Staff",
          email: u.email,
          dbUser: u,
          defaultJobTitle: u.role === "developer" ? "Developer IT" : "Tax Staff",
          defaultSymbol: u.role === "developer" ? "D" : "B",
          defaultScenario: "tahap_1",
        });
      }
    });

    return list;
  }, [dbUsers]);

  // Hitung Penggajian untuk seluruh staf
  const payrollCalculations = useMemo(() => {
    return staffList.map((staff) => {
      const setting = staffSettings[staff.key] || {};
      const adjustment = monthlyAdjustments[staff.key] || {};

      const joinDate = staff.dbUser?.joinDate || setting.joinDate || "";
      const scenarioId = setting.scenario || null; // auto-detect dari joinDate jika belum dipilih manual
      const positionSymbol = setting.symbol || staff.defaultSymbol || "A";
      const jobTitle = setting.jobTitle || staff.defaultJobTitle;

      // Filter presensi untuk staf ini pada bulan terpilih (mencocokkan nama, key, dbUser name, dan email)
      const staffAtt = filterStaffAttendance(
        allAttendance,
        [staff.name, staff.key, staff.dbUser?.name, staff.email],
        selectedMonth,
      );

      const calculated = calculateStaffSalary({
        staffKey: staff.key,
        staffName: staff.name,
        jobTitle,
        scenarioId,
        positionSymbol,
        customPositionAmount: setting.customPositionAmount,
        joinDate,
        targetYearMonth: selectedMonth,
        staffAttendance: staffAtt,
        manualOvertimeHours: adjustment.manualOvertimeHours !== undefined ? adjustment.manualOvertimeHours : null,
        bonus: adjustment.bonus || 0,
        deductions: adjustment.deductions || 0,
        notes: adjustment.notes || "",
      });

      return {
        ...calculated,
        staffEmail: staff.email,
        dbUser: staff.dbUser,
      };
    });
  }, [staffList, staffSettings, monthlyAdjustments, allAttendance, selectedMonth]);

  // Filter hasil pencarian dan skenario
  const filteredPayroll = useMemo(() => {
    return payrollCalculations.filter((item) => {
      const matchSearch =
        item.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchScenario =
        scenarioFilter === "all" || item.scenarioId === scenarioFilter;
      return matchSearch && matchScenario;
    });
  }, [payrollCalculations, searchTerm, scenarioFilter]);

  // Statistik KPI Card
  const stats = useMemo(() => {
    const totalGaji = payrollCalculations.reduce((sum, i) => sum + i.totalGaji, 0);
    const totalStaff = payrollCalculations.length;
    const totalLemburJam = payrollCalculations.reduce((sum, i) => sum + i.jamLembur, 0);
    const staffTertib = payrollCalculations.filter((i) => !i.isOrderlyForfeited && i.hariMasuk > 0).length;
    const persenTertib = totalStaff > 0 ? Math.round((staffTertib / totalStaff) * 100) : 0;

    return {
      totalGaji,
      totalStaff,
      totalLemburJam,
      staffTertib,
      persenTertib,
    };
  }, [payrollCalculations]);

  // Ubah Skenario Gaji Staf
  const handleScenarioChange = async (staffKey, newScenario) => {
    if (!canEditPayroll) {
      return toast.error("Akses ditolak: Hanya Owner dan Developer yang dapat mengubah skenario gaji.");
    }
    try {
      const updated = await updateStaffSalarySetting(staffKey, {
        scenario: newScenario,
      });
      setStaffSettings((prev) => ({ ...prev, [staffKey]: updated }));
      toast.success(`Skenario gaji berhasil diperbarui`);
    } catch (err) {
      toast.error("Gagal memperbarui skenario gaji");
    }
  };

  // Ubah Simbol Jabatan Staf (Bu Uma tinggal milih simbol)
  const handleSymbolChange = async (staffKey, newSymbol) => {
    if (!canEditPayroll) {
      return toast.error("Akses ditolak: Hanya Owner dan Developer yang dapat mengubah simbol jabatan.");
    }
    try {
      const updated = await updateStaffSalarySetting(staffKey, {
        symbol: newSymbol,
      });
      setStaffSettings((prev) => ({ ...prev, [staffKey]: updated }));
      const symInfo = POSITION_SYMBOLS[newSymbol];
      toast.success(`Simbol jabatan ${newSymbol} (${formatRupiah(symInfo?.amount || 0)}) disimpan`);
    } catch (err) {
      toast.error("Gagal memperbarui simbol jabatan");
    }
  };

  // Simpan Penyesuaian (Lembur, Bonus, Potongan)
  const handleSaveAdjustment = async (values) => {
    if (!canEditPayroll) {
      return toast.error("Akses ditolak: Hanya Owner dan Developer yang dapat mengubah penyesuaian gaji.");
    }
    if (!activeAdjustItem) return;
    try {
      await saveMonthlyAdjustment(
        selectedMonth,
        activeAdjustItem.staffKey,
        activeAdjustItem.staffName,
        values
      );
      setMonthlyAdjustments((prev) => ({
        ...prev,
        [activeAdjustItem.staffKey]: {
          ...prev[activeAdjustItem.staffKey],
          ...values,
        },
      }));
      toast.success(`Penyesuaian gaji ${activeAdjustItem.staffName} berhasil disimpan`);
    } catch (err) {
      toast.error("Gagal menyimpan penyesuaian gaji");
    }
  };

  // Ekspor Rekap Penggajian ke format CSV / Excel
  const handleExportCSV = () => {
    const headers = [
      "Nama Staff",
      "Jabatan",
      "Skenario Gaji",
      "Simbol Jabatan",
      "Hari Masuk",
      "Hari Tepat Waktu",
      "Hari Terlambat",
      "Gaji Pokok",
      "Uang Makan",
      "Uang Transport",
      "Uang Tertib",
      "Uang Jabatan",
      "Jam Lembur",
      "Uang Lembur",
      "Bonus",
      "Potongan",
      "Total Gaji Bersih",
      "Catatan",
    ];

    const rows = filteredPayroll.map((item) => [
      `"${item.staffName}"`,
      `"${item.jobTitle}"`,
      `"${item.scenarioName}"`,
      `"${item.positionSymbol}"`,
      item.hariMasuk,
      item.hariTepatWaktu,
      item.hariTerlambat,
      item.gajiPokok,
      item.uangMakan,
      item.uangTransport,
      item.uangTertib,
      item.uangJabatan,
      item.jamLembur,
      item.uangLembur,
      item.bonus,
      item.deductions,
      item.totalGaji,
      `"${item.notes || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Gaji_Umara_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Rekap gaji berhasil diekspor ke CSV");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Title */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <Wallet className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Gaji & Penggajian Staff
              </h1>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                canEditPayroll
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              }`}>
                {canEditPayroll ? "Akses Edit: Owner & Developer" : "Mode Hanya Baca"}
              </span>
            </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Kalkulasi otomatis terintegrasi presensi, 3 skenario bertahap, dan simbol jabatan Bu Uma.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 shadow-2xs">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-slate-500">Periode:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent outline-none cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFormulaGuide(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <HelpCircle className="h-4 w-4 text-slate-500" />
            <span>Panduan Rumus</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Ekspor Excel/CSV</span>
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pengeluaran Gaji */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Penggajian Bulan Ini
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {formatRupiah(stats.totalGaji)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Estimasi total take home pay seluruh staf
          </div>
        </Card>

        {/* Total Staf Aktif */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Staff Dalam Rekap
            </span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {stats.totalStaff} Orang
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Mencakup konsultan, assistant & support
          </div>
        </Card>

        {/* Tingkat Disiplin (Uang Tertib) */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Staff Bebas Keterlambatan
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1.5">
            <span>{stats.staffTertib} Staf</span>
            <span className="text-xs font-medium text-slate-400">({stats.persenTertib}%)</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Menerima Uang Tertib Rp 260.000 penuh
          </div>
        </Card>

        {/* Akumulasi Lembur */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Lembur Terakumulasi
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {stats.totalLemburJam} Jam
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Formula ketenagakerjaan: 1/173 x Upah
          </div>
        </Card>
      </div>

      {/* Filter & Controls Bar */}
      <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama staff atau jabatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:bg-slate-800"
            />
          </div>

          {/* Skenario Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">
              Filter Skenario:
            </span>
            {[
              { id: "all", label: "Semua" },
              { id: "tahap_1", label: "Tahap 1 (2.5jt)" },
              { id: "tahap_2", label: "Tahap 2 (1.5jt)" },
              { id: "training", label: "Training (1.0jt)" },
            ].map((sc) => (
              <button
                key={sc.id}
                onClick={() => setScenarioFilter(sc.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                  scenarioFilter === sc.id
                    ? "border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-100 font-bold"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Main Payroll Table */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                <th className="py-3 px-4 min-w-[180px]">Staff & Jabatan</th>
                <th className="py-3 px-3 min-w-[140px]">Skenario Gaji</th>
                <th className="py-3 px-3 min-w-[130px]">Simbol Jabatan</th>
                <th className="py-2.5 px-3 text-center min-w-[125px]">
                  <div>Presensi Bulan Ini</div>
                  <div className="text-[10px] font-normal text-slate-400 dark:text-slate-400">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">H</span>: Hadir • <span className="text-rose-600 dark:text-rose-400 font-semibold">T</span>: Telat • <span className="font-semibold">d</span>: Hari
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Gaji Pokok</th>
                <th className="py-3 px-3 text-right">Uang Makan</th>
                <th className="py-3 px-3 text-right">Transport</th>
                <th className="py-3 px-3 text-center min-w-[95px]">Uang Tertib</th>
                <th className="py-3 px-3 text-right">Lembur</th>
                <th className="py-3 px-4 text-right min-w-[120px]">Take Home Pay</th>
                <th className="py-3 px-4 text-center min-w-[120px]">Aksi</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Tidak ada data staff yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredPayroll.map((item, idx) => {
                  const symInfo = POSITION_SYMBOLS[item.positionSymbol] || POSITION_SYMBOLS["-"];

                  return (
                    <tr
                      key={item.staffKey}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* No */}
                      <td className="py-3.5 px-3.5 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* Staff & Jabatan */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setProfileModalStaff(item.dbUser || { id: item.staffKey, name: item.staffName, role: "staff", joinDate: item.joinDate })}
                          className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-blue-600 transition text-left cursor-pointer flex items-center gap-1.5"
                          title="Klik untuk membuka / mengedit profil staf ini"
                        >
                          <span>{item.staffName}</span>
                          <Pencil className="h-3 w-3 text-slate-400 opacity-60" />
                        </button>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {item.jobTitle}
                        </div>
                        {/* Status Tanggal Bergabung & Masa Kerja */}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {item.tenure?.hasJoined ? (
                            <button
                              type="button"
                              onClick={() => setProfileModalStaff(item.dbUser || { id: item.staffKey, name: item.staffName, role: "staff", joinDate: item.joinDate })}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 cursor-pointer transition border border-slate-200 dark:border-white/10"
                              title={`Bergabung: ${item.tenure.formattedJoinDate}`}
                            >
                              <Calendar className="h-3 w-3 text-blue-500" />
                              <span>{item.tenure.formattedJoinDate} ({item.tenure.tenureText})</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setProfileModalStaff(item.dbUser || { id: item.staffKey, name: item.staffName, role: "staff" })}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100 transition border border-amber-200 dark:border-amber-900 cursor-pointer"
                              title="Klik untuk mengisi tanggal bergabung di profil staf"
                            >
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              <span>Set Tgl Gabung</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Skenario Dropdown */}
                      <td className="py-3.5 px-3">
                        <select
                          value={item.scenarioId}
                          disabled={!canEditPayroll}
                          onChange={(e) => handleScenarioChange(item.staffKey, e.target.value)}
                          className={`w-full text-xs font-semibold py-1 px-2 rounded-lg border border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 outline-none ${
                            canEditPayroll
                              ? "cursor-pointer hover:border-slate-400 focus:border-blue-500"
                              : "cursor-not-allowed opacity-80 bg-slate-50 dark:bg-slate-800/50"
                          }`}
                          title={!canEditPayroll ? "Hanya Owner dan Developer yang dapat mengubah skenario gaji" : undefined}
                        >
                          <option value="tahap_1">Tahap 1 (2.5jt)</option>
                          <option value="tahap_2">Tahap 2 (1.5jt)</option>
                          <option value="training">Training (1.0jt)</option>
                        </select>
                        {item.autoScenario?.badgeText && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>{item.autoScenario.badgeText}</span>
                          </div>
                        )}
                      </td>

                      {/* Simbol Jabatan (Bu Uma tinggal milih simbol) */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={item.positionSymbol}
                            disabled={!canEditPayroll}
                            onChange={(e) => handleSymbolChange(item.staffKey, e.target.value)}
                            className={`text-xs font-black py-1 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 outline-none ${
                              canEditPayroll
                                ? "cursor-pointer hover:border-slate-400 focus:border-blue-500"
                                : "cursor-not-allowed opacity-80 bg-slate-50 dark:bg-slate-800/50"
                            }`}
                            title={!canEditPayroll ? "Hanya Owner dan Developer yang dapat mengubah simbol jabatan" : undefined}
                          >
                            <option value="A">Simbol A (250rb)</option>
                            <option value="B">Simbol B (400rb)</option>
                            <option value="C">Simbol C (550rb)</option>
                            <option value="D">Simbol D (800rb)</option>
                            <option value="-">Tanpa Jabatan (0)</option>
                          </select>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                          +{formatRupiah(item.uangJabatan)}
                        </span>
                      </td>

                      {/* Presensi Bulan Ini */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                          <span
                            className="text-emerald-700 dark:text-emerald-400 font-bold"
                            title="Hadir Tepat Waktu"
                          >
                            {item.hariTepatWaktu}H
                          </span>
                          <span className="text-slate-300">/</span>
                          <span
                            className={`font-bold ${item.hariTerlambat > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}
                            title={
                              item.hariTerlambat > 0
                                ? `Terlambat ${item.hariTerlambat} kali`
                                : "Tidak pernah terlambat"
                            }
                          >
                            {item.hariTerlambat}T
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="text-slate-500" title="Total Masuk">
                            {item.hariMasuk}d
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.hariMasuk >= 26 ? "Penuh 26 hr" : `${item.hariMasuk}/26 hari`}
                        </div>
                      </td>

                      {/* Gaji Pokok */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatRupiah(item.gajiPokok)}
                        </div>
                        {item.hariMasuk < 26 && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                            {item.hariMasuk}x {formatRupiah(item.dailyRate)}
                          </div>
                        )}
                      </td>

                      {/* Uang Makan */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatRupiah(item.uangMakan)}
                        </div>
                        {item.hariTerlambat > 0 && (
                          <div className="text-[10px] text-rose-500 font-mono" title="Hangus saat telat">
                            -{formatRupiah(item.uangMakanHangus)}
                          </div>
                        )}
                      </td>

                      {/* Transport */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatRupiah(item.uangTransport)}
                        </div>
                        {item.hariTerlambat > 0 && (
                          <div className="text-[10px] text-amber-500 font-mono" title="Potong 50% saat telat">
                            -{formatRupiah(item.uangTransportDipotong)}
                          </div>
                        )}
                      </td>

                      {/* Uang Tertib */}
                      <td className="py-3.5 px-3 text-center">
                        {item.isOrderlyForfeited ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                            title="Hangus karena terlambat >= 1 kali"
                          >
                            Rp 0 (Hangus)
                          </span>
                        ) : (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                            title="Tertib tanpa keterlambatan"
                          >
                            Rp 260.000
                          </span>
                        )}
                      </td>

                      {/* Lembur */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatRupiah(item.uangLembur)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.jamLembur} jam
                        </div>
                      </td>

                      {/* Total Take Home Pay */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(item.totalGaji)}
                        </div>
                        {(item.bonus > 0 || item.deductions > 0) && (
                          <div className="text-[10px] text-slate-400">
                            {item.bonus > 0 && `+${formatRupiah(item.bonus)} `}
                            {item.deductions > 0 && `-${formatRupiah(item.deductions)}`}
                          </div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          {/* Cetak Slip */}
                          <button
                            type="button"
                            onClick={() => setActivePayslipItem(item)}
                            title="Lihat / Cetak Slip Gaji"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          {/* Audit Rumus */}
                          <button
                            type="button"
                            onClick={() => setActiveAuditItem(item)}
                            title="Audit Transparansi Rumus"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Edit Penyesuaian (Hanya Owner & Developer) */}
                          {canEditPayroll && (
                            <button
                              type="button"
                              onClick={() => setActiveAdjustItem(item)}
                              title="Edit Jam Lembur & Bonus"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Cetak Slip Gaji */}
      <PayslipModal
        isOpen={Boolean(activePayslipItem)}
        onClose={() => setActivePayslipItem(null)}
        payrollItem={activePayslipItem}
        monthStr={selectedMonth}
      />

      {/* Modal Audit Rumus */}
      <AuditFormulaModal
        isOpen={Boolean(activeAuditItem)}
        onClose={() => setActiveAuditItem(null)}
        payrollItem={activeAuditItem}
        monthStr={selectedMonth}
      />

      {/* Modal Penyesuaian Gaji */}
      <AdjustPayrollModal
        isOpen={Boolean(activeAdjustItem)}
        onClose={() => setActiveAdjustItem(null)}
        payrollItem={activeAdjustItem}
        monthStr={selectedMonth}
        onSave={handleSaveAdjustment}
      />

      {/* Modal Panduan Rumus & Skenario */}
      {showFormulaGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-white/10 overflow-hidden my-auto max-h-[90vh] flex flex-col text-xs">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-blue-500" />
                Panduan Skenario & Rumus Penggajian Umara
              </h3>
              <button
                onClick={() => setShowFormulaGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4 text-slate-700 dark:text-slate-300">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900">
                <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-1">
                  1. Skenario Tahap Pertama
                </h4>
                <p>
                  • Gaji Pokok: Rp 2.500.000 (jika masuk &lt; 26 hari dihitung Rp 96.154/hari).
                  <br />
                  • Uang Makan: Rp 25.000 x 26 hari (<strong>jika terlambat: uang makan hangus per hari</strong>).
                  <br />
                  • Uang Transport: Rp 15.000 x 26 hari (<strong>jika terlambat: dipotong 50% = Rp 7.500/hari</strong>).
                  <br />
                  • Uang Tertib: Rp 260.000 (<strong>jika terlambat 1x saja: uang tertib HANGUS jadi Rp 0</strong>).
                  <br />
                  • Uang Lembur: 1/173 x (Gaji Pokok + Total Tunjangan Tetap) per jam.
                </p>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                  2. Skenario Tahap Kedua
                </h4>
                <p>
                  • Gaji Pokok: Rp 1.500.000 (jika masuk &lt; 26 hari dihitung Rp 57.690/hari).
                  <br />
                  • Uang Makan: Rp 20.000 x 26 hari (jika terlambat: uang makan hangus per hari).
                  <br />
                  • Uang Transport: Rp 10.000 x 26 hari (jika terlambat: dipotong 50% = Rp 5.000/hari).
                  <br />
                  • Uang Tertib: Rp 260.000 (jika terlambat 1x saja: uang tertib HANGUS).
                  <br />
                  • Uang Lembur: 1/173 x (Gaji Pokok + Total Tunjangan Tetap) per jam.
                </p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900">
                <h4 className="font-bold text-amber-900 dark:text-amber-300 mb-1">
                  3. Skenario Training
                </h4>
                <p>
                  • Gaji Pokok: Rp 1.000.000 (jika masuk &lt; 26 hari dihitung Rp 38.462/hari).
                  <br />
                  • Uang Makan: Rp 15.000 x 26 hari (jika terlambat: uang makan hangus per hari).
                  <br />
                  • Uang Transport: Rp 7.500 x 26 hari (jika terlambat: dipotong 50% = Rp 3.750/hari).
                  <br />
                  • Uang Tertib: Rp 260.000 (jika terlambat 1x saja: uang tertib HANGUS).
                  <br />
                  • Uang Lembur: 1/173 x (Gaji Pokok + Total Tunjangan Tetap) per jam.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900">
                <h4 className="font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                  Aturan Penentuan Skenario Berdasarkan Tanggal Bergabung
                </h4>
                <p>
                  • <strong>Masa Kerja &lt; 3 Bulan:</strong> Otomatis masuk <strong>Skenario Training</strong> (Gaji Pokok Rp 1.000.000).
                  <br />
                  • <strong>Masa Kerja 3 s/d 6 Bulan:</strong> Otomatis masuk <strong>Skenario Tahap Kedua</strong> (Gaji Pokok Rp 1.500.000).
                  <br />
                  • <strong>Masa Kerja &ge; 6 Bulan:</strong> Otomatis masuk <strong>Skenario Tahap Pertama</strong> (Gaji Pokok Rp 2.500.000).
                  <br />
                  <span className="italic text-slate-500">
                    *Catatan: Bu Uma tetap memiliki hak penuh untuk memilih atau mengubah skenario secara manual di tabel kapan saja.
                  </span>
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Simbol Uang Jabatan (Pilihan Bu Uma)
                </h4>
                <p>
                  • <strong>Simbol A</strong> (Staff Admin / Administrative Assistant): Rp 250.000
                  <br />
                  • <strong>Simbol B</strong> (Tax Assistant / Tax Junior): Rp 400.000
                  <br />
                  • <strong>Simbol C</strong> (Tax Associate / Junior Consultant / HRD): Rp 550.000
                  <br />
                  • <strong>Simbol D</strong> (Tax Senior / Senior Consultant): Rp 800.000
                </p>
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <Button size="sm" onClick={() => setShowFormulaGuide(false)}>
                Mengerti
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Profil & Tanggal Bergabung Staf (Hanya Owner & Developer) */}
      <StaffProfileModal
        user={profileModalStaff}
        isOpen={Boolean(profileModalStaff)}
        onClose={() => setProfileModalStaff(null)}
        canEdit={canEditPayroll}
      />
    </div>
  );
}
