import { useState, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Flame,
  Printer,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function calcHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [ih = 0, im = 0] = checkIn.split(":").map(Number);
  const [oh = 0, om = 0] = checkOut.split(":").map(Number);
  return Math.max((oh * 60 + om - (ih * 60 + im)) / 60, 0);
}

export function MonitoringPage() {
  const { data } = useAppData();
  const { user: currentUser } = useAuth();

  // Role Security Check: Hanya Owner dan Developer yang dapat mengakses
  const isOwnerOrDev =
    currentUser?.role === "owner" || currentUser?.role === "developer";

  // Filter & Selection State
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // 'all' | 'staff' | 'magang'
  const [periodFilter, setPeriodFilter] = useState("month"); // 'today' | '7days' | 'month' | 'all'
  const [activeTab, setActiveTab] = useState("matrix"); // 'matrix' | 'attendance' | 'reports'

  // Modal State for Viewing Detailed Daily Report
  const [viewingReport, setViewingReport] = useState(null);

  const todayStr = getTodayString();
  const users = data?.users ?? [];
  const allAttendance = data?.attendance ?? [];
  const allDailyReports = data?.dailyReports ?? [];

  // Staff users list (Hanya menampilkan staff kantor & magang, atau bisa semua)
  const staffList = useMemo(() => {
    return users.filter((u) => {
      if (u.status !== "active") return false;
      const r = u.role?.toLowerCase();
      // Bisa memilih staff, staff magang, magang, manager, bahkan developer/owner
      if (roleFilter === "staff") return r === "staff" || r === "manager";
      if (roleFilter === "magang") return r === "magang" || r === "staff_magang";
      return ["staff", "magang", "staff_magang", "manager", "developer", "owner"].includes(r);
    });
  }, [users, roleFilter]);

  // Filtered staff list by search query
  const searchedStaffList = useMemo(() => {
    const q = staffSearch.toLowerCase().trim();
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.role?.toLowerCase().includes(q),
    );
  }, [staffList, staffSearch]);

  // Auto-select first staff if none selected or if selected staff no longer in list
  const activeStaff = useMemo(() => {
    if (selectedStaffId) {
      const found = staffList.find((s) => s.id === selectedStaffId);
      if (found) return found;
    }
    return staffList[0] || null;
  }, [selectedStaffId, staffList]);

  // Helper matcher: cocokan catatan dengan staf terpilih
  const matchesStaff = (staffUser, recordStaffName, recordUserId) => {
    if (!staffUser) return false;
    if (recordUserId && staffUser.id && recordUserId === staffUser.id) return true;
    if (!recordStaffName) return false;
    const targetName = staffUser.name?.toLowerCase().trim() || "";
    const targetEmail = staffUser.email?.toLowerCase().trim() || "";
    const recName = recordStaffName.toLowerCase().trim();
    return (
      recName === targetName ||
      recName === targetEmail ||
      recName.includes(targetName) ||
      targetName.includes(recName)
    );
  };

  // Filter Attendance records for active staff in selected period
  const staffAttendance = useMemo(() => {
    if (!activeStaff) return [];
    const now = new Date();
    const currentMonth = todayStr.slice(0, 7);

    return allAttendance
      .filter((a) => {
        if (!matchesStaff(activeStaff, a.staff, null)) return false;

        // Date period filter
        if (periodFilter === "today" && a.date !== todayStr) return false;
        if (periodFilter === "month" && !a.date?.startsWith(currentMonth)) return false;
        if (periodFilter === "7days") {
          const recDate = new Date(a.date);
          const diffDays = Math.ceil(Math.abs(now - recDate) / (1000 * 60 * 60 * 24));
          if (diffDays > 7) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [allAttendance, activeStaff, periodFilter, todayStr]);

  // Filter Daily Reports for active staff in selected period
  const staffReports = useMemo(() => {
    if (!activeStaff) return [];
    const now = new Date();
    const currentMonth = todayStr.slice(0, 7);

    return allDailyReports
      .filter((r) => {
        if (!matchesStaff(activeStaff, r.staff, r.userId)) return false;

        // Date period filter
        if (periodFilter === "today" && r.reportDate !== todayStr) return false;
        if (periodFilter === "month" && !r.reportDate?.startsWith(currentMonth)) return false;
        if (periodFilter === "7days") {
          const recDate = new Date(r.reportDate);
          const diffDays = Math.ceil(Math.abs(now - recDate) / (1000 * 60 * 60 * 24));
          if (diffDays > 7) return false;
        }
        return true;
      })
      .sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || ""));
  }, [allDailyReports, activeStaff, periodFilter, todayStr]);

  // Today's Pulse for Active Staff
  const todayAttendance = useMemo(() => {
    if (!activeStaff) return null;
    return allAttendance.find(
      (a) => a.date === todayStr && matchesStaff(activeStaff, a.staff, null),
    );
  }, [allAttendance, activeStaff, todayStr]);

  const todayReport = useMemo(() => {
    if (!activeStaff) return null;
    return allDailyReports.find(
      (r) =>
        r.reportDate === todayStr && matchesStaff(activeStaff, r.staff, r.userId),
    );
  }, [allDailyReports, activeStaff, todayStr]);

  // KPI Statistics Calculations
  const stats = useMemo(() => {
    const totalDays = staffAttendance.length;
    const hadirCount = staffAttendance.filter(
      (a) => a.status?.toLowerCase() === "hadir",
    ).length;
    const terlambatCount = staffAttendance.filter(
      (a) => a.status?.toLowerCase() === "terlambat",
    ).length;
    const izinCount = staffAttendance.filter((a) =>
      ["izin", "sakit", "remote"].includes(a.status?.toLowerCase()),
    ).length;

    let totalHours = 0;
    let completeCount = 0;
    staffAttendance.forEach((a) => {
      if (a.checkIn && a.checkOut) {
        totalHours += calcHours(a.checkIn, a.checkOut);
        completeCount++;
      }
    });
    const avgHours = completeCount > 0 ? totalHours / completeCount : 0;

    const totalReports = staffReports.length;
    const selesaiReports = staffReports.filter(
      (r) => r.status === "Selesai",
    ).length;
    const sebagianReports = staffReports.filter(
      (r) => r.status === "Sebagian Selesai",
    ).length;
    const tertundaReports = staffReports.filter(
      (r) => r.status === "Tertunda",
    ).length;
    const obstacleCount = staffReports.filter(
      (r) => r.obstacles && r.obstacles.trim().length > 0,
    ).length;

    // Tingkat kepatuhan lapor pulang (persentase hari hadir yang ada laporannya)
    const complianceRate =
      totalDays > 0 ? Math.min(100, Math.round((totalReports / totalDays) * 100)) : 0;

    const punctualityRate =
      totalDays > 0 ? Math.round((hadirCount / totalDays) * 100) : 0;

    return {
      totalDays,
      hadirCount,
      terlambatCount,
      izinCount,
      totalHours: totalHours.toFixed(1),
      avgHours: avgHours.toFixed(1),
      punctualityRate,
      totalReports,
      selesaiReports,
      sebagianReports,
      tertundaReports,
      obstacleCount,
      complianceRate,
    };
  }, [staffAttendance, staffReports]);

  // Matriks Korelasi Harian (Presensi + Laporan Harian digabung per Tanggal)
  const dailyMatrix = useMemo(() => {
    const dateMap = new Map();

    staffAttendance.forEach((a) => {
      if (!a.date) return;
      if (!dateMap.has(a.date)) {
        dateMap.set(a.date, { date: a.date, attendance: a, report: null });
      } else {
        dateMap.get(a.date).attendance = a;
      }
    });

    staffReports.forEach((r) => {
      if (!r.reportDate) return;
      if (!dateMap.has(r.reportDate)) {
        dateMap.set(r.reportDate, { date: r.reportDate, attendance: null, report: r });
      } else {
        dateMap.get(r.reportDate).report = r;
      }
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [staffAttendance, staffReports]);

  // Access Denied Screen jika bukan owner atau developer
  if (!isOwnerOrDev) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-4 ring-8 ring-rose-50 dark:ring-rose-500/5">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Akses Khusus Terbatas
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Halaman <strong>Monitoring Staff & Performa</strong> hanya dapat diakses
          oleh akun dengan peran <strong>Owner</strong> dan <strong>Developer</strong>.
        </p>
      </div>
    );
  }

  // Handle Export CSV
  const handleExportCsv = () => {
    if (!activeStaff) return;
    const headers = [
      "Tanggal",
      "Staff",
      "Jam Masuk",
      "Jam Pulang",
      "Durasi Kerja (Jam)",
      "Status Absen",
      "Jam Lapor Pulang",
      "Status Laporan",
      "Ringkasan Pekerjaan",
      "Kendala",
      "Rencana Besok",
    ];

    const rows = dailyMatrix.map((item) => {
      const a = item.attendance;
      const r = item.report;
      const hours = a && a.checkIn && a.checkOut ? calcHours(a.checkIn, a.checkOut).toFixed(1) : "-";

      return [
        item.date,
        activeStaff.name,
        a?.checkIn || "-",
        a?.checkOut || "-",
        hours,
        a?.status || "Belum Absen",
        r?.reportTime || "-",
        r?.status || "Belum Lapor",
        r?.tasksSummary || "-",
        r?.obstacles || "-",
        r?.tomorrowPlan || "-",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `monitoring-${activeStaff.name.toLowerCase().replace(/\s+/g, "-")}-${periodFilter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle Print PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Monitoring Kinerja Staff
            </h1>
            <Badge tone="purple" className="font-semibold">
              <Sparkles className="h-3 w-3 mr-1" />
              Owner & Developer
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Pantau kehadiran, jam kerja, dan laporan aktivitas harian setiap staf secara langsung.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={!activeStaff || dailyMatrix.length === 0}
            title="Download rekap data staf ini ke CSV"
          >
            <Download className="h-4 w-4 mr-1.5" />
            <span>Ekspor CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            disabled={!activeStaff}
            title="Cetak lembar laporan monitoring"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            <span>Cetak Rekap</span>
          </Button>
        </div>
      </div>

      {/* Staff Selector & Filter Bar */}
      <Card className="p-4 sm:p-5 shadow-sm border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Pilih Staff:
            </span>

            {/* Role Filter Pills */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-white/10 dark:bg-slate-800/60 text-xs">
              <button
                type="button"
                onClick={() => setRoleFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  roleFilter === "all"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Semua ({users.filter((u) => u.status === "active").length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("staff")}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  roleFilter === "staff"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Staff Kantor
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("magang")}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  roleFilter === "magang"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Magang
              </button>
            </div>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Periode:
            </span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="month">Bulan Ini ({new Date().toLocaleString("id-ID", { month: "long" })})</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="today">Hari Ini Saja</option>
              <option value="all">Semua Riwayat</option>
            </select>
          </div>
        </div>

        {/* Staff Quick Select Carousel / Badges */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5 overflow-x-auto pb-1 scrollbar-thin">
          <div className="relative min-w-[180px] max-w-[220px] shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama staf..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {searchedStaffList.map((staff) => {
              const isSelected = activeStaff?.id === staff.id;
              // Cek apakah staf ini sudah lapor hari ini
              const hasReportedToday = allDailyReports.some(
                (r) => r.reportDate === todayStr && matchesStaff(staff, r.staff, r.userId),
              );

              return (
                <button
                  key={staff.id || staff.name}
                  type="button"
                  onClick={() => setSelectedStaffId(staff.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/90 text-blue-900 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-100 shadow-xs ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300 uppercase shrink-0">
                    {staff.name ? staff.name.charAt(0) : "S"}
                  </div>
                  <span>{staff.name}</span>
                  {hasReportedToday && (
                    <span
                      title="Sudah mengisi laporan harian hari ini"
                      className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900"
                    />
                  )}
                </button>
              );
            })}
            {searchedStaffList.length === 0 && (
              <span className="text-xs text-slate-400 italic px-2">
                Tidak ada staf yang sesuai filter.
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Selected Staff Active Card */}
      {activeStaff ? (
        <div className="space-y-6">
          {/* Staff Highlight Profile & Today Pulse */}
          <Card className="p-5 sm:p-6 shadow-sm border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Profile Bio */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-2xl sm:text-3xl flex items-center justify-center shadow-md ring-4 ring-slate-100 dark:ring-white/5 shrink-0">
                  {activeStaff.avatar ? (
                    <img
                      src={activeStaff.avatar}
                      alt={activeStaff.name}
                      className="h-full w-full object-cover rounded-2xl"
                    />
                  ) : (
                    <span>{activeStaff.name ? activeStaff.name.charAt(0).toUpperCase() : "S"}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                      {activeStaff.name}
                    </h2>
                    <Badge tone={activeStaff.role?.includes("magang") ? "amber" : "blue"}>
                      {(activeStaff.role || "staff").replace("_", " ").toUpperCase()}
                    </Badge>
                    {activeStaff.points !== undefined && (
                      <Badge tone="purple" className="font-semibold">
                        <Flame className="h-3 w-3 mr-0.5 text-purple-600 fill-purple-600" />
                        {activeStaff.points} pts
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {activeStaff.email || "Tidak ada email"} {activeStaff.phone ? `• ${activeStaff.phone}` : ""}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Menampilkan performa presensi & laporan untuk periode terpilih.
                  </p>
                </div>
              </div>

              {/* Today's Pulse Status Box */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-slate-800/50 text-xs">
                {/* Status Presensi Hari Ini */}
                <div className="flex items-center gap-2.5 px-2">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      todayAttendance
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Presensi Hari Ini:</span>
                    {todayAttendance ? (
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {todayAttendance.checkIn || "08:00"} {todayAttendance.checkOut ? `- ${todayAttendance.checkOut}` : "(Belum Checkout)"}
                      </span>
                    ) : (
                      <span className="font-medium text-rose-500 dark:text-rose-400">Belum Presensi</span>
                    )}
                  </div>
                </div>

                <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-white/10" />

                {/* Status Laporan Hari Ini */}
                <div className="flex items-center gap-2.5 px-2">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      todayReport
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                        : "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                    }`}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Laporan Hari Ini:</span>
                    {todayReport ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Tuntas ({todayReport.reportTime || "17:00"})
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Belum Lapor
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 4 Scorecard KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* KPI 1: Presensi & Kehadiran */}
            <Card className="p-4 sm:p-5 shadow-xs border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold">Total Kehadiran</span>
                <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CalendarCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {stats.totalDays}
                </span>
                <span className="text-xs text-slate-400">Hari Tercatat</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.hadirCount} Hadir</span>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400">{stats.terlambatCount} Terlambat</span>
                <span>•</span>
                <span className="text-slate-500">{stats.izinCount} Izin</span>
              </p>
            </Card>

            {/* KPI 2: Total Jam Kerja */}
            <Card className="p-4 sm:p-5 shadow-xs border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold">Total Jam Kerja</span>
                <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {stats.totalHours}
                </span>
                <span className="text-xs text-slate-400">Jam Total</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Rata-rata: <strong className="text-slate-700 dark:text-slate-300">{stats.avgHours} jam</strong> per hari kerja
              </p>
            </Card>

            {/* KPI 3: Laporan Harian Terkirim */}
            <Card className="p-4 sm:p-5 shadow-xs border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold">Laporan Harian</span>
                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {stats.totalReports}
                </span>
                <span className="text-xs text-slate-400">Laporan Masuk</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.selesaiReports} Selesai</span>
                <span>•</span>
                <span className="text-amber-600">{stats.sebagianReports} Sebagian</span>
                <span>•</span>
                <span className="text-rose-500">{stats.tertundaReports} Pending</span>
              </p>
            </Card>

            {/* KPI 4: Kepatuhan Lapor Pulang */}
            <Card className="p-4 sm:p-5 shadow-xs border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold">Kepatuhan Laporan</span>
                <div className="h-7 w-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {stats.complianceRate}%
                </span>
                <span className="text-xs text-slate-400">Kepatuhan</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {stats.obstacleCount > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ Ada {stats.obstacleCount} laporan dengan kendala
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Tidak ada kendala tercatat
                  </span>
                )}
              </p>
            </Card>
          </div>

          {/* Tab Navigation Section */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("matrix")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  activeTab === "matrix"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <Activity className="h-4 w-4" />
                <span>Korelasi Harian (Presensi + Laporan)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("attendance")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  activeTab === "attendance"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <CalendarCheck className="h-4 w-4" />
                <span>Riwayat Presensi ({staffAttendance.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("reports")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  activeTab === "reports"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <ClipboardCheck className="h-4 w-4" />
                <span>Laporan Harian ({staffReports.length})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: KORELASI HARIAN (PRESENSI & LAPORAN) */}
          {activeTab === "matrix" && (
            <Card className="overflow-hidden border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Matriks Aktivitas & Presensi Harian: {activeStaff.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Menghubungkan jam datang, jam pulang, dan apakah staf mengisi laporan harian sebelum meninggalkan kantor.
                  </p>
                </div>
                <Badge tone="blue">{dailyMatrix.length} Hari Tercatat</Badge>
              </div>

              {dailyMatrix.length === 0 ? (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Belum Ada Catatan untuk Periode Ini</p>
                  <p className="text-xs mt-1">Staf ini belum memiliki riwayat presensi maupun laporan pada periode ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Tanggal</th>
                        <th className="py-3 px-4 font-semibold">Presensi Masuk - Pulang</th>
                        <th className="py-3 px-4 font-semibold">Status Presensi</th>
                        <th className="py-3 px-4 font-semibold">Status Laporan Harian</th>
                        <th className="py-3 px-4 font-semibold">Aktivitas / Ringkasan Kerja</th>
                        <th className="py-3 px-4 font-semibold text-right">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                      {dailyMatrix.map((item) => {
                        const a = item.attendance;
                        const r = item.report;
                        const hasCheckedOut = Boolean(a?.checkOut);
                        const missedReport = hasCheckedOut && !r;

                        return (
                          <tr
                            key={item.date}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                              {item.date}
                              {item.date === todayStr && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                  Hari Ini
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {a ? (
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                                    {a.checkIn || "--:--"} → {a.checkOut || "(Belum Checkout)"}
                                  </div>
                                  {a.checkIn && a.checkOut && (
                                    <div className="text-[11px] text-slate-400">
                                      Durasi: {calcHours(a.checkIn, a.checkOut).toFixed(1)} jam
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Tidak ada absensi</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {a ? (
                                <Badge
                                  tone={
                                    a.status === "Hadir"
                                      ? "green"
                                      : a.status === "Terlambat"
                                        ? "amber"
                                        : "slate"
                                  }
                                >
                                  {a.status}
                                </Badge>
                              ) : (
                                <span className="text-xs text-rose-500 font-medium">Alpa / Libur</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {r ? (
                                <div className="space-y-1">
                                  <Badge
                                    tone={
                                      r.status === "Selesai"
                                        ? "green"
                                        : r.status === "Sebagian Selesai"
                                          ? "amber"
                                          : "red"
                                    }
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                    {r.status}
                                  </Badge>
                                  <div className="text-[10px] text-slate-400">
                                    Pukul {r.reportTime || "17:00"}
                                  </div>
                                </div>
                              ) : missedReport ? (
                                <Badge tone="red" className="font-semibold">
                                  <AlertTriangle className="h-3 w-3 mr-0.5" />
                                  Pulang Tanpa Lapor
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Belum Mengisi</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                              {r ? (
                                <div className="space-y-1">
                                  <p className="line-clamp-2 text-xs text-slate-700 dark:text-slate-300">
                                    {r.tasksSummary || "-"}
                                  </p>
                                  {r.obstacles && (
                                    <p className="line-clamp-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                      <span className="font-semibold">Kendala:</span> {r.obstacles}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs">-</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {r ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setViewingReport(r)}
                                  className="text-xs h-7 px-2.5"
                                  title="Buka laporan lengkap"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  Lihat Detail
                                </Button>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 2: DETAIL PRESENSI */}
          {activeTab === "attendance" && (
            <Card className="overflow-hidden border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Riwayat Presensi Staf: {activeStaff.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Data kedatangan dan kepulangan kantor yang tercatat di sistem.
                  </p>
                </div>
                <Badge tone="green">{staffAttendance.length} Presensi Tercatat</Badge>
              </div>

              {staffAttendance.length === 0 ? (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                  <CalendarCheck className="h-10 w-10 mx-auto mb-2 opacity-40 text-emerald-500" />
                  <p className="text-sm font-semibold">Belum Ada Data Presensi</p>
                  <p className="text-xs mt-1">Staf ini belum memiliki catatan kehadiran pada periode terpilih.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-100/75 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Tanggal</th>
                        <th className="py-3 px-4 font-semibold">Jam Masuk (Check-In)</th>
                        <th className="py-3 px-4 font-semibold">Jam Pulang (Check-Out)</th>
                        <th className="py-3 px-4 font-semibold">Durasi Kerja</th>
                        <th className="py-3 px-4 font-semibold">Status Presensi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                      {staffAttendance.map((a) => {
                        const duration = a.checkIn && a.checkOut ? calcHours(a.checkIn, a.checkOut).toFixed(1) : null;
                        return (
                          <tr key={a.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                              {a.date}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {a.checkIn || "--:--"}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {a.checkOut || <span className="text-amber-500 font-normal italic">Belum checkout</span>}
                            </td>
                            <td className="py-3 px-4">
                              {duration ? (
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {duration} jam
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                tone={
                                  a.status === "Hadir"
                                    ? "green"
                                    : a.status === "Terlambat"
                                      ? "amber"
                                      : "slate"
                                }
                              >
                                {a.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 3: DETAIL LAPORAN HARIAN */}
          {activeTab === "reports" && (
            <Card className="overflow-hidden border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Laporan Harian Staff: {activeStaff.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Daftar laporan pekerjaan yang dikirim staf sebelum meninggalkan kantor.
                  </p>
                </div>
                <Badge tone="indigo">{staffReports.length} Laporan Masuk</Badge>
              </div>

              {staffReports.length === 0 ? (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                  <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40 text-blue-500" />
                  <p className="text-sm font-semibold">Belum Ada Laporan Harian</p>
                  <p className="text-xs mt-1">Staf ini belum mengirimkan laporan harian pada periode terpilih.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {staffReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {report.reportDate}
                          </span>
                          <span className="text-xs text-slate-400">
                            pukul {report.reportTime || "17:00"}
                          </span>
                          <Badge
                            tone={
                              report.status === "Selesai"
                                ? "green"
                                : report.status === "Sebagian Selesai"
                                  ? "amber"
                                  : "red"
                            }
                          >
                            {report.status}
                          </Badge>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setViewingReport(report)}
                          className="self-start sm:self-auto text-xs h-7"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Baca Lengkap
                        </Button>
                      </div>

                      {/* Content */}
                      <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                        <div className="font-semibold text-slate-500 dark:text-slate-400 text-xs mb-1">
                          Aktivitas / Pekerjaan yang Dilakukan:
                        </div>
                        {report.tasksSummary || "-"}
                      </div>

                      {/* Obstacles & Next day */}
                      {(report.obstacles || report.tomorrowPlan) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {report.obstacles && (
                            <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200">
                              <span className="font-semibold block mb-0.5">⚠️ Kendala:</span>
                              <span className="text-amber-800 dark:text-amber-300">{report.obstacles}</span>
                            </div>
                          )}
                          {report.tomorrowPlan && (
                            <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/70 dark:border-blue-500/20 dark:bg-blue-500/10 text-blue-900 dark:text-blue-200">
                              <span className="font-semibold block mb-0.5">📌 Rencana Besok:</span>
                              <span className="text-blue-800 dark:text-blue-300">{report.tomorrowPlan}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      ) : (
        <Card className="py-20 text-center text-slate-400 dark:text-slate-500">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            Tidak Ada Staf Terpilih
          </h3>
          <p className="text-xs mt-1">
            Pilih staf pada daftar di atas untuk mulai melihat rekap monitoring kinerja.
          </p>
        </Card>
      )}

      {/* MODAL: DETAIL LAPORAN HARIAN LENGKAP */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Laporan Harian: {viewingReport.staff}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tanggal: {viewingReport.reportDate} (Pukul {viewingReport.reportTime || "17:00"})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Status Pekerjaan:</span>
                  <Badge
                    tone={
                      viewingReport.status === "Selesai"
                        ? "green"
                        : viewingReport.status === "Sebagian Selesai"
                          ? "amber"
                          : "red"
                    }
                    className="mt-0.5 text-xs font-semibold"
                  >
                    {viewingReport.status}
                  </Badge>
                </div>
                {viewingReport.clientName && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Klien Terkait:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {viewingReport.clientName}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Aktivitas & Pekerjaan yang Dilakukan:
                </label>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {viewingReport.tasksSummary || "-"}
                </div>
              </div>

              {viewingReport.obstacles && (
                <div>
                  <label className="text-xs font-bold text-amber-700 dark:text-amber-400 block mb-1">
                    Kendala / Hambatan yang Dialami:
                  </label>
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200 leading-relaxed">
                    {viewingReport.obstacles}
                  </div>
                </div>
              )}

              {viewingReport.tomorrowPlan && (
                <div>
                  <label className="text-xs font-bold text-blue-700 dark:text-blue-400 block mb-1">
                    Rencana Kerja Besok:
                  </label>
                  <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/80 dark:border-blue-500/20 dark:bg-blue-500/10 text-blue-900 dark:text-blue-200 leading-relaxed">
                    {viewingReport.tomorrowPlan}
                  </div>
                </div>
              )}

              {viewingReport.notes && (
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Catatan Tambahan:
                  </label>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300">
                    {viewingReport.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-white/10 flex justify-end">
              <Button size="sm" onClick={() => setViewingReport(null)}>
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
