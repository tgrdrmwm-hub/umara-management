import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";
import {
  createDailyReport,
  deleteDailyReport,
  syncLocalDailyReportsToSupabase,
  updateDailyReport,
} from "../services/database";

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTimeString() {
  return new Date().toTimeString().slice(0, 5);
}

function getEmptyReport(staffName = "", userId = null) {
  return {
    staff: staffName,
    userId: userId,
    reportDate: getTodayString(),
    reportTime: getCurrentTimeString(),
    tasksSummary: "",
    clientName: "",
    status: "Selesai",
    obstacles: "",
    tomorrowPlan: "",
    attachmentUrl: "",
    notes: "",
  };
}

const TEMPLATE_TASKS = `1. Mengerjakan rekap & e-Bupot PPh 21/26 bulan berjalan.
2. Memeriksa faktur pajak masukan & keluaran untuk SPT Masa PPN.
3. Melakukan follow up kelengkapan dokumen pendukung kepada klien.
4. Arsip berkas pelaporan pajak dan update status di sistem.`;

export function DailyReportsPage() {
  const { data } = useAppData();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = ["owner", "developer", "manager", "admin"].includes(
    user?.role,
  );
  const isDevOrOwner = ["developer", "owner"].includes(user?.role);
  const isMagang = user?.role === "magang" || user?.role === "staff_magang";

  const dailyReports = data?.dailyReports ?? [];
  const users = data?.users ?? [];

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [form, setForm] = useState(() =>
    getEmptyReport(user?.name || user?.email || "", user?.id),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingReport, setDeletingReport] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("today"); // 'today' | '7days' | 'month' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState(getTodayString());
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  const todayStr = getTodayString();

  // Check if current user has submitted today
  const myTodayReport = useMemo(() => {
    const currentName = (user?.name || user?.email || "").toLowerCase();
    return dailyReports.find(
      (r) =>
        r.reportDate === todayStr &&
        (r.staff?.toLowerCase() === currentName ||
          (r.userId && user?.id && r.userId === user.id)),
    );
  }, [dailyReports, todayStr, user]);

  // Unsynced reports (temporarily kept in localStorage)
  const unsyncedReports = useMemo(() => {
    return dailyReports.filter((r) => r.id && String(r.id).startsWith("local-"));
  }, [dailyReports]);
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleManualSync() {
    setIsSyncing(true);
    try {
      const res = await syncLocalDailyReportsToSupabase();
      await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
      if (res.synced > 0) {
        toast.success(`Berhasil menyinkronkan ${res.synced} laporan ke database Supabase!`);
      } else if (res.failed > 0) {
        toast.error("Belum dapat tersimpan ke Supabase. Pastikan query SQL sudah dijalankan di Supabase SQL Editor.");
      } else {
        toast.info("Semua laporan sudah tersimpan di database.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyinkronkan data");
    } finally {
      setIsSyncing(false);
    }
  }

  // Active staff list for attendance & report monitoring
  const activeStaffList = useMemo(() => {
    return users.filter(
      (u) =>
        u.status === "active" &&
        ["staff", "magang", "staff_magang", "manager"].includes(u.role),
    );
  }, [users]);

  // Today's statistics
  const todayReports = useMemo(() => {
    return dailyReports.filter((r) => r.reportDate === todayStr);
  }, [dailyReports, todayStr]);

  const staffReportedToday = useMemo(() => {
    const set = new Set();
    todayReports.forEach((r) => {
      if (r.staff) set.add(r.staff.toLowerCase().trim());
    });
    return set;
  }, [todayReports]);

  const unsubmittedStaff = useMemo(() => {
    return activeStaffList.filter(
      (u) =>
        !staffReportedToday.has(u.name?.toLowerCase().trim()) &&
        !staffReportedToday.has(u.email?.toLowerCase().trim()),
    );
  }, [activeStaffList, staffReportedToday]);

  // Filtered reports list
  const filteredReports = useMemo(() => {
    const now = new Date();
    const q = search.toLowerCase().trim();

    return dailyReports.filter((r) => {
      // Date filter
      if (dateFilter === "today" && r.reportDate !== todayStr) return false;
      if (dateFilter === "custom" && r.reportDate !== customDate) return false;
      if (dateFilter === "7days") {
        const reportDate = new Date(r.reportDate);
        const diffTime = Math.abs(now.getTime() - reportDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      }
      if (dateFilter === "month") {
        const currentMonth = todayStr.slice(0, 7); // YYYY-MM
        if (!r.reportDate?.startsWith(currentMonth)) return false;
      }

      // Staff filter
      if (
        selectedStaff !== "all" &&
        r.staff?.toLowerCase() !== selectedStaff.toLowerCase()
      ) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all" && r.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (q) {
        const matchStaff = r.staff?.toLowerCase().includes(q);
        const matchTasks = r.tasksSummary?.toLowerCase().includes(q);
        const matchObstacles = r.obstacles?.toLowerCase().includes(q);
        const matchPlan = r.tomorrowPlan?.toLowerCase().includes(q);
        if (
          !matchStaff &&
          !matchTasks &&
          !matchObstacles &&
          !matchPlan
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    dailyReports,
    search,
    dateFilter,
    todayStr,
    customDate,
    selectedStaff,
    selectedStatus,
  ]);

  async function refresh(msg) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(msg);
  }

  function openCreateModal() {
    setEditingReport(null);
    setForm(getEmptyReport(user?.name || user?.email || "", user?.id));
    setShowModal(true);
  }

  function openEditModal(report) {
    setEditingReport(report);
    setForm({
      staff: report.staff,
      userId: report.userId || user?.id,
      reportDate: report.reportDate,
      reportTime: report.reportTime || getCurrentTimeString(),
      tasksSummary: report.tasksSummary,
      clientName: report.clientName || "",
      status: report.status || "Selesai",
      obstacles: report.obstacles || "",
      tomorrowPlan: report.tomorrowPlan || "",
      attachmentUrl: report.attachmentUrl || "",
      notes: report.notes || "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingReport(null);
    setForm(getEmptyReport(user?.name || user?.email || "", user?.id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    const activeStaffName = isDevOrOwner
      ? form.staff?.trim() || user?.name || user?.email || ""
      : editingReport
        ? editingReport.staff || form.staff
        : user?.name || user?.email || form.staff;

    if (!activeStaffName?.trim()) {
      return toast.error("Nama staff wajib diisi");
    }
    if (!form.tasksSummary.trim()) {
      return toast.error("Rincian pekerjaan yang dilakukan wajib diisi");
    }

    try {
      setIsSubmitting(true);
      const currentTime = getCurrentTimeString();
      const matchedUser = users.find(
        (u) =>
          u.name?.toLowerCase().trim() === activeStaffName.toLowerCase().trim(),
      );
      const payload = {
        ...form,
        staff: activeStaffName.trim(),
        userId: editingReport
          ? editingReport.userId
          : matchedUser?.id || user?.id || form.userId,
        reportTime: editingReport
          ? editingReport.reportTime || currentTime
          : currentTime,
      };

      if (editingReport) {
        await updateDailyReport(editingReport.id, payload);
        await refresh("Laporan harian berhasil diperbarui");
      } else {
        await createDailyReport(payload);
        await refresh(`Laporan harian berhasil dikirim (pukul ${currentTime})! Selamat pulang.`);
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan laporan");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDelete(report) {
    setDeletingReport(report);
  }

  async function handleConfirmDelete() {
    if (!deletingReport) return;
    try {
      setIsDeleting(true);
      await deleteDailyReport(deletingReport.id, deletingReport.staff);
      await refresh("Laporan berhasil dihapus");
      setDeletingReport(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setIsDeleting(false);
    }
  }

  function canManageReport(report) {
    if (isAdmin) return true;
    const currentName = (user?.name || user?.email || "").toLowerCase();
    return (
      report.staff?.toLowerCase() === currentName ||
      (report.userId && user?.id && report.userId === user.id)
    );
  }

  // Export CSV
  function handleExportCsv() {
    if (filteredReports.length === 0) {
      toast.error("Tidak ada data laporan untuk diekspor");
      return;
    }

    const headers = [
      "Tanggal",
      "Jam",
      "Staff",
      "Status",
      "Ringkasan Pekerjaan",
      "Kendala",
      "Rencana Besok",
      "Catatan",
    ];

    const rows = filteredReports.map((r) => [
      r.reportDate,
      r.reportTime || "-",
      r.staff,
      r.status,
      r.tasksSummary,
      r.obstacles || "-",
      r.tomorrowPlan || "-",
      r.notes || "-",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((c) => `"${String(c || "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-harian-staff-${dateFilter}-${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("File CSV laporan harian berhasil diunduh");
  }

  // Print PDF
  function handlePrintReports(singleReport = null) {
    const listToPrint = singleReport ? [singleReport] : filteredReports;
    if (listToPrint.length === 0) {
      toast.error("Tidak ada data laporan untuk dicetak");
      return;
    }

    const title = singleReport
      ? `Laporan Harian - ${singleReport.staff} (${singleReport.reportDate})`
      : `Rekap Laporan Harian Staff - ${todayStr}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - UMARA TAX</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; line-height: 1.5; font-size: 13px; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .company { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
            .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
            .meta { font-size: 11px; text-align: right; color: #64748b; }
            .report-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 14px; page-break-inside: avoid; }
            .report-card-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #0f172a; }
            .badge { display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: 600; border-radius: 4px; background: #f1f5f9; color: #334155; }
            .badge-success { background: #dcfce7; color: #166534; }
            .badge-warn { background: #fef3c7; color: #92400e; }
            .badge-danger { background: #fee2e2; color: #991b1b; }
            .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 8px; margin-bottom: 3px; }
            .content { white-space: pre-wrap; font-size: 12px; color: #334155; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 20px; font-size: 11px; color: #64748b; }
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">UMARA TAX CONSULTANT</div>
              <div class="sub">Laporan Aktivitas Harian Staff Kantor</div>
            </div>
            <div class="meta">
              <div>Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              <div>Total Dokumen: ${listToPrint.length} Laporan</div>
            </div>
          </div>

          ${listToPrint
            .map(
              (r) => `
            <div class="report-card">
              <div class="report-card-header">
                <div>
                  <strong>${r.staff}</strong>
                </div>
                <div>
                  <span style="font-size: 11px; color: #64748b; margin-right: 8px;">${r.reportDate} ${r.reportTime ? `(${r.reportTime})` : ""}</span>
                  <span class="badge ${r.status === "Selesai" ? "badge-success" : r.status === "Sebagian Selesai" ? "badge-warn" : "badge-danger"}">${r.status}</span>
                </div>
              </div>

              <div class="section-title">Aktivitas & Pekerjaan yang Dilakukan:</div>
              <div class="content">${r.tasksSummary || "-"}</div>

              ${
                r.obstacles
                  ? `
                <div class="section-title" style="color: #b45309;">Kendala / Hambatan:</div>
                <div class="content" style="color: #92400e;">${r.obstacles}</div>
              `
                  : ""
              }

              ${
                r.tomorrowPlan
                  ? `
                <div class="section-title" style="color: #2563eb;">Rencana Kerja Besok:</div>
                <div class="content" style="color: #1e40af;">${r.tomorrowPlan}</div>
              `
                  : ""
              }
            </div>
          `,
            )
            .join("")}

          <div class="footer">
            <div>Dokumen Resmi Internal Management Umara Tax</div>
            <div>Halaman 1 / 1</div>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); window.close(); }, 300);
            }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=750");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      toast.error("Gagal membuka jendela cetak. Mohon izinkan popup di browser Anda.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Laporan Harian Staff
            </h1>
            <Badge tone="blue">Aktivitas Pulang</Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Form dan rekap pekerjaan yang diselesaikan staff sebelum pulang kantor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            title="Download laporan dalam format CSV"
          >
            <Download className="h-4 w-4 mr-1.5 shrink-0" />
            <span>CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePrintReports()}
            title="Cetak atau simpan sebagai PDF"
          >
            <Printer className="h-4 w-4 mr-1.5 shrink-0" />
            <span>Cetak PDF</span>
          </Button>

          <Button size="sm" onClick={openCreateModal} className="shadow-sm">
            <Plus className="h-4 w-4 mr-1.5 shrink-0" />
            <span>Tulis Laporan</span>
          </Button>
        </div>
      </div>

      {/* Unsynced Reports Alert Banner */}
      {unsyncedReports.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {unsyncedReports.length} Laporan Tersimpan di Memori Browser (Belum Masuk Database Supabase)
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                Tabel di database Supabase belum memiliki izin akses (Permission Denied). Jalankan script SQL fix di Supabase SQL Editor, lalu klik tombol sinkronkan.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-sm"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan ke Database"}</span>
          </Button>
        </div>
      )}

      {/* Staff Daily Status Alert Banner */}
      {myTodayReport ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Laporan Harian Anda Hari Ini Sudah Terkirim!
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Dicatat pukul {myTodayReport.reportTime || "17:00"} &bull; Status:{" "}
                <span className="font-semibold">{myTodayReport.status}</span>
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openEditModal(myTodayReport)}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:text-emerald-200 text-xs shrink-0"
          >
            <Pencil className="h-3.5 w-3.5 mr-1 shrink-0" />
            Perbarui Laporan
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/90 dark:border-amber-500/20 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Anda Belum Mengisi Laporan Harian Hari Ini ({todayStr})
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Sebelum jam pulang atau check out, mohon mengisi ringkasan apa saja yang telah Anda kerjakan hari ini.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={openCreateModal}
            className="bg-amber-600 hover:bg-amber-700 text-white border-none text-xs shrink-0 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 mr-1 shrink-0" />
            Tulis Laporan Sekarang
          </Button>
        </div>
      )}

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Laporan Hari Ini
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {todayReports.length}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
              / {activeStaffList.length} staff
            </span>
          </p>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${activeStaffList.length ? Math.min(100, Math.round((todayReports.length / activeStaffList.length) * 100)) : 0}%`,
              }}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Tuntas 100%
            </span>
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {todayReports.filter((r) => r.status === "Selesai").length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Pekerjaan selesai hari ini
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Lanjut Besok / Pending
            </span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {todayReports.filter((r) => r.status !== "Selesai").length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Perlu tindak lanjut berikutnya
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Belum Lapor Hari Ini
            </span>
            <span className="h-2 w-2 rounded-full bg-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {unsubmittedStaff.length}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
              orang
            </span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {unsubmittedStaff.length > 0
              ? unsubmittedStaff.map((u) => u.name).slice(0, 2).join(", ") +
                (unsubmittedStaff.length > 2
                  ? ` +${unsubmittedStaff.length - 2}`
                  : "")
              : "Semua sudah lapor! 🎉"}
          </p>
        </Card>
      </div>

      {/* Unsubmitted Staff Pills (Admin/Manager visibility) */}
      {isAdmin && unsubmittedStaff.length > 0 && (
        <Card className="p-3.5 bg-slate-50/70 dark:bg-white/5 border-dashed">
          <div className="flex items-center gap-2 mb-2">
            <UserX className="h-4 w-4 text-rose-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Staff yang Belum Mengisi Laporan Hari Ini:
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unsubmittedStaff.map((u) => (
              <span
                key={u.id || u.email}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50"
              >
                <span>{u.name}</span>
                <span className="text-[10px] opacity-75 capitalize">
                  ({u.role})
                </span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-3.5 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari staff, pekerjaan, klien, atau kendala..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date filter dropdown */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs sm:text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="month">Bulan Ini</option>
              <option value="custom">Pilih Tanggal</option>
              <option value="all">Semua Tanggal</option>
            </select>

            {dateFilter === "custom" && (
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="h-9 text-xs w-36"
              />
            )}

            {/* Staff filter */}
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs sm:text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 max-w-[150px]"
            >
              <option value="all">Semua Staff</option>
              {activeStaffList.map((u) => (
                <option key={u.id || u.name} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs sm:text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Status</option>
              <option value="Selesai">Selesai</option>
              <option value="Sebagian Selesai">Sebagian Selesai</option>
              <option value="Tertunda">Tertunda</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Tampilan Grid Card"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Tampilan Tabel"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-400">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Belum ada laporan harian ditemukan
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {search || dateFilter !== "all" || selectedStaff !== "all"
              ? "Coba ubah filter atau kata kunci pencarian Anda."
              : "Staff dapat mengisi laporan harian sebelum jam pulang dengan menekan tombol 'Tulis Laporan'."}
          </p>
          <div className="mt-5">
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-1 shrink-0" />
              Tulis Laporan Pertama
            </Button>
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredReports.map((report) => {
            const isOwner = canManageReport(report);
            const initials = report.staff
              ? report.staff
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "ST";

            const statusTone =
              report.status === "Selesai"
                ? "green"
                : report.status === "Sebagian Selesai"
                  ? "amber"
                  : "slate";

            return (
              <Card
                key={report.id}
                className="p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all duration-200"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {report.staff}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <Calendar className="h-3 w-3" />
                          <span>{report.reportDate}</span>
                          {report.reportTime && (
                            <>
                              <span>&bull;</span>
                              <Clock className="h-3 w-3" />
                              <span>{report.reportTime}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <Badge tone={statusTone} className="shrink-0 text-[11px]">
                      {report.status}
                    </Badge>
                  </div>

                  {/* Tasks Summary */}
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Pekerjaan Hari Ini:
                    </p>
                    <div className="mt-1 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6 bg-slate-50/50 dark:bg-white/5 p-2.5 rounded-lg border border-slate-100 dark:border-white/5 font-sans">
                      {report.tasksSummary}
                    </div>
                  </div>

                  {/* Obstacles / Kendala */}
                  {report.obstacles && (
                    <div className="mt-2.5 text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 p-2.5 rounded-lg text-amber-900 dark:text-amber-200">
                      <div className="flex items-center gap-1 font-semibold text-[11px] mb-0.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Kendala / Hambatan:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {report.obstacles}
                      </p>
                    </div>
                  )}

                  {/* Tomorrow Plan */}
                  {report.tomorrowPlan && (
                    <div className="mt-2 text-xs bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 p-2.5 rounded-lg text-blue-900 dark:text-blue-200">
                      <div className="flex items-center gap-1 font-semibold text-[11px] mb-0.5">
                        <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>Rencana Besok:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {report.tomorrowPlan}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-slate-500 hover:text-slate-800"
                    onClick={() => handlePrintReports(report)}
                    title="Cetak lembar laporan ini"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    Cetak
                  </Button>

                  {isOwner && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditModal(report)}
                        title="Edit laporan"
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(report)}
                        title="Hapus laporan"
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-white/5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-3 px-4">Tanggal & Jam</th>
                  <th className="py-3 px-4">Staff</th>
                  <th className="py-3 px-4 min-w-[280px]">Pekerjaan Hari Ini</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Kendala / Rencana Besok</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredReports.map((report) => {
                  const isOwner = canManageReport(report);
                  const statusTone =
                    report.status === "Selesai"
                      ? "green"
                      : report.status === "Sebagian Selesai"
                        ? "amber"
                        : "slate";

                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {report.reportDate}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {report.reportTime || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {report.staff}
                      </td>
                      <td className="py-3 px-4">
                        <p className="line-clamp-3 whitespace-pre-wrap leading-relaxed">
                          {report.tasksSummary}
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge tone={statusTone}>{report.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-[11px] max-w-xs">
                        {report.obstacles && (
                          <p className="text-amber-700 dark:text-amber-400 truncate">
                            ⚠️ {report.obstacles}
                          </p>
                        )}
                        {report.tomorrowPlan && (
                          <p className="text-blue-700 dark:text-blue-400 truncate mt-0.5">
                            ➔ {report.tomorrowPlan}
                          </p>
                        )}
                        {!report.obstacles && !report.tomorrowPlan && (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handlePrintReports(report)}
                            title="Cetak lembar laporan"
                          >
                            <Printer className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                          {isOwner && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEditModal(report)}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDelete(report)}
                                title="Hapus"
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {editingReport
                      ? "Perbarui Laporan Harian"
                      : "Form Laporan Harian Staff"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingReport
                      ? "Edit laporan pekerjaan Anda"
                      : "Isi aktivitas dan progres kerja Anda sebelum pulang kantor."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleSubmit}
              className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm"
            >
              {/* Row 1: Staff, Tanggal, & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Staff {isDevOrOwner && <span className="text-rose-500">*</span>}
                  </label>
                  {isDevOrOwner ? (
                    <select
                      value={form.staff}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, staff: e.target.value }))
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">Pilih Staff</option>
                      {activeStaffList.map((u) => (
                        <option key={u.id || u.name} value={u.name}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={form.staff || user?.name || user?.email || ""}
                      disabled
                      readOnly
                      title="Nama staff otomatis mengikuti akun yang sedang login"
                      className="h-9 text-xs sm:text-sm bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 cursor-not-allowed border-slate-200 dark:border-white/10"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Laporan <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.reportDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, reportDate: e.target.value }))
                    }
                    className="h-9 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Pekerjaan Hari Ini
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Selesai">✅ Selesai (Tuntas)</option>
                    <option value="Sebagian Selesai">
                      ⏳ Sebagian (Lanjut besok)
                    </option>
                    <option value="Tertunda">
                      ⏸️ Tertunda (Menunggu data)
                    </option>
                  </select>
                </div>
              </div>

              {/* Row 3: Tasks Summary with Quick Template */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Aktivitas / Pekerjaan yang Dilakukan{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        tasksSummary: prev.tasksSummary
                          ? `${prev.tasksSummary}\n${TEMPLATE_TASKS}`
                          : TEMPLATE_TASKS,
                      }))
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    <Sparkles className="h-3 w-3" />
                    Sisipkan Contoh Format
                  </button>
                </div>
                <textarea
                  rows={5}
                  required
                  placeholder="Tuliskan poin-poin pekerjaan yang telah Anda selesaikan hari ini, contoh:&#10;1. Mengerjakan pelaporan SPT Masa PPN CV Keemasan Abadi&#10;2. Rekap bukti potong PPh 21 PT ABC&#10;3. Follow up aktivasi akun Coretax..."
                  value={form.tasksSummary}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      tasksSummary: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 font-sans leading-relaxed"
                />
              </div>

              {/* Row 4: Obstacles & Tomorrow Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kendala / Hambatan (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Server DJP error saat upload Faktur Pajak, menunggu konfirmasi rekening koran..."
                    value={form.obstacles}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        obstacles: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rencana Kerja Besok (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Melanjutkan validasi SPT Tahunan Badan PT Solo Abadi..."
                    value={form.tomorrowPlan}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tomorrowPlan: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 font-sans"
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isSubmitting}
                  className="px-5"
                >
                  {editingReport ? "Simpan Perubahan" : "Kirim Laporan"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingReport)}
        onClose={() => !isDeleting && setDeletingReport(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Hapus Laporan Harian"
        message={
          deletingReport ? (
            <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <p>
                Apakah Anda yakin ingin menghapus laporan dari{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {deletingReport.staff}
                </span>{" "}
                tanggal{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {deletingReport.reportDate}
                </span>
                ?
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-400">
                Tindakan ini tidak dapat dibatalkan dan data akan dihapus permanen.
              </p>
            </div>
          ) : null
        }
        confirmText="Ya, Hapus Laporan"
        cancelText="Batal"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
