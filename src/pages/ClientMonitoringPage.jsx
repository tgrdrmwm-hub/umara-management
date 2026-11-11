import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FolderOpen,
  Layers,
  Mail,
  MapPin,
  MonitorCheck,
  Phone,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";
import {
  HEALTH_META,
  buildClientMonitoringRows,
  formatDeadlineRelative,
  getTodayLocalDate,
  isPicMatched,
  isSafeHttpUrl,
  isTaskDone,
  isTaskInProgress,
  isTaskOverdue,
  normalizeText,
  stripApprovalComment,
} from "../utils/clientMonitoring";

const selectClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100";

const OBLIGATION_STATUS_STYLE = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  overdue:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40",
  progress:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
  todo: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
  none: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-white/10",
};

const OBLIGATION_STATUS_LABEL = {
  done: "Selesai",
  overdue: "Terlambat",
  progress: "In Progress",
  todo: "To Do",
  none: "Belum Ada Task",
};

function getTaskBadgeMeta(task, todayStr) {
  if (isTaskDone(task)) {
    return { label: "Selesai", tone: "green" };
  }
  if (isTaskOverdue(task, todayStr)) {
    return { label: "Terlambat", tone: "red" };
  }
  if (isTaskInProgress(task)) {
    return { label: "In Progress", tone: "blue" };
  }
  return { label: "To Do", tone: "amber" };
}

function downloadMonitoringCsv(filename, rows) {
  const headers = [
    "No",
    "Nama Wajib Pajak",
    "Tipe",
    "Kontrak",
    "Status Klien",
    "NPWP",
    "PIC",
    "Kewajiban Pajak",
    "To Do",
    "In Progress",
    "Selesai",
    "Total Task",
    "Progres (%)",
    "Terlambat",
    "Deadline Terdekat",
    "Laporan Harian",
    "Aktivitas Terakhir",
    "Status Task Board",
    "Catatan",
  ];

  const csvRows = [
    headers,
    ...rows.map((row, idx) => [
      idx + 1,
      row.client.name,
      row.client.type || "Badan",
      row.client.kontrak || "Bulanan",
      row.client.status || "Aktif",
      row.client.npwp || "-",
      row.resolvedPic || "Belum ada PIC",
      row.obligationsWithStatus.map((o) => o.label).join(", ") || "-",
      row.todoWork,
      row.inProgressWork,
      row.doneWork,
      row.totalWork,
      `${row.completionRate}%`,
      row.overdueWork,
      row.nearestDeadline || "-",
      row.dailyReports.length,
      row.lastReportDate || "-",
      HEALTH_META[row.healthStatus]?.label || row.healthStatus,
      row.healthReasons.join("; ") || "-",
    ]),
  ];

  const csv = csvRows
    .map((line) =>
      line.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ClientMonitoringPage() {
  const { data } = useAppData();
  const todayStr = getTodayLocalDate();

  const [search, setSearch] = useState("");
  const [contractFilter, setContractFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [picFilter, setPicFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedClientId, setSelectedClientId] = useState(null);

  const clients = data?.clients ?? [];
  const tasks = data?.tasks ?? [];
  const dailyReports = data?.dailyReports ?? [];
  const users = data?.users ?? [];

  const picOptions = useMemo(() => {
    return users
      .filter(
        (u) =>
          u.status === "active" &&
          !["owner", "magang"].includes(normalizeText(u.role)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const allRows = useMemo(
    () =>
      buildClientMonitoringRows({
        clients,
        tasks,
        dailyReports,
        users,
        periodFilter,
        todayStr,
      }),
    [clients, tasks, dailyReports, users, periodFilter, todayStr],
  );

  const selectedRow = useMemo(
    () =>
      selectedClientId
        ? allRows.find((r) => r.client.id === selectedClientId) || null
        : null,
    [allRows, selectedClientId],
  );

  const summary = useMemo(() => {
    let activeClients = 0;
    let bulananCount = 0;
    let tahunanCount = 0;
    let totalWorks = 0;
    let doneWorks = 0;
    let overdueClients = 0;
    let inProgressClients = 0;
    let todoClients = 0;
    let idleClients = 0;
    let warningClients = 0;
    let noPicClients = 0;

    for (const row of allRows) {
      if (row.isActiveClient) activeClients++;
      const kontrak = normalizeText(row.client.kontrak);
      if (kontrak.includes("bulan")) bulananCount++;
      else if (kontrak.includes("tahun")) tahunanCount++;

      totalWorks += row.totalWork;
      doneWorks += row.doneWork;

      if (row.healthStatus === "overdue") overdueClients++;
      else if (row.healthStatus === "progress") inProgressClients++;
      else if (row.healthStatus === "todo") todoClients++;
      else if (row.healthStatus === "idle") idleClients++;

      if (row.hasWarning) warningClients++;
      if (row.isActiveClient && !row.resolvedPic) noPicClients++;
    }

    const overallCompletion =
      totalWorks > 0 ? Math.round((doneWorks / totalWorks) * 100) : 0;

    return {
      totalClients: allRows.length,
      activeClients,
      bulananCount,
      tahunanCount,
      totalWorks,
      doneWorks,
      overallCompletion,
      overdueClients,
      inProgressClients,
      todoClients,
      idleClients,
      warningClients,
      noPicClients,
    };
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const q = normalizeText(search);

    const matched = allRows.filter((row) => {
      const kontrak = normalizeText(row.client.kontrak);
      if (contractFilter === "Bulanan" && !kontrak.includes("bulan")) return false;
      if (contractFilter === "Tahunan" && !kontrak.includes("tahun")) return false;

      if (statusFilter === "warning") {
        if (!row.hasWarning) return false;
      } else if (statusFilter !== "all" && row.healthStatus !== statusFilter) {
        return false;
      }

      if (picFilter === "unassigned") {
        if (row.resolvedPic) return false;
      } else if (picFilter !== "all") {
        if (!isPicMatched(row.client.pic, picFilter)) return false;
      }

      if (q) {
        const haystack = normalizeText(
          `${row.client.name} ${row.client.npwp} ${row.client.pic} ${row.resolvedPic} ${row.client.email}`,
        );
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return [...matched].sort((a, b) => {
      if (sortBy === "name") {
        return a.client.name.localeCompare(b.client.name);
      }
      if (sortBy === "deadline") {
        return (a.nearestDeadline || "9999-99-99").localeCompare(
          b.nearestDeadline || "9999-99-99",
        );
      }
      if (sortBy === "progress_asc") {
        if (a.completionRate !== b.completionRate) {
          return a.completionRate - b.completionRate;
        }
        return a.client.name.localeCompare(b.client.name);
      }
      if (sortBy === "progress_desc") {
        if (a.completionRate !== b.completionRate) {
          return b.completionRate - a.completionRate;
        }
        return a.client.name.localeCompare(b.client.name);
      }

      const pa = HEALTH_META[a.healthStatus]?.priority ?? 99;
      const pb = HEALTH_META[b.healthStatus]?.priority ?? 99;
      if (pa !== pb) return pa - pb;
      if (a.overdueWork !== b.overdueWork) return b.overdueWork - a.overdueWork;
      const da = a.nearestDeadline || "9999-99-99";
      const db = b.nearestDeadline || "9999-99-99";
      if (da !== db) return da.localeCompare(db);
      return a.client.name.localeCompare(b.client.name);
    });
  }, [allRows, contractFilter, statusFilter, picFilter, search, sortBy]);

  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    if (pageSize === "all") return filteredRows;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safeCurrentPage, pageSize]);

  const hasActiveFilter =
    Boolean(search.trim()) ||
    contractFilter !== "all" ||
    statusFilter !== "all" ||
    picFilter !== "all" ||
    periodFilter !== "all";

  function resetFilters() {
    setSearch("");
    setContractFilter("all");
    setStatusFilter("all");
    setPicFilter("all");
    setPeriodFilter("all");
    setSortBy("priority");
    setCurrentPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MonitorCheck className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Monitoring Client</span>
            </h1>
            <Badge tone="blue" className="font-semibold">
              {summary.totalClients} Klien
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Pantau status task klien langsung sesuai Task Board, kewajiban pajak, deadline, PIC, dan laporan harian.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadMonitoringCsv(
                `monitoring-client-${periodFilter}-${todayStr}.csv`,
                filteredRows,
              )
            }
            disabled={filteredRows.length === 0}
            title="Ekspor daftar monitoring klien ke CSV"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            disabled={filteredRows.length === 0}
            title="Cetak laporan monitoring klien"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Rekap</span>
          </Button>

          <Link
            to="/clients"
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-slate-900 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <span>Kelola Data Client</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <Card
          onClick={() => {
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className="p-4 sm:p-5 cursor-pointer transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-white/20"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Klien</span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {summary.totalClients}
            </span>
            <span className="text-xs text-slate-400">
              ({summary.activeClients} Aktif)
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {summary.bulananCount} Bulanan
            </span>
            <span className="mx-1">•</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {summary.tahunanCount} Tahunan
            </span>
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Progres Task Board</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {summary.overallCompletion}%
            </span>
            <span className="text-xs text-slate-400">Done</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <strong className="text-slate-700 dark:text-slate-300">
              {summary.doneWorks}
            </strong>{" "}
            dari {summary.totalWorks} task klien selesai
          </p>
        </Card>

        <Card
          onClick={() => {
            setStatusFilter((prev) => (prev === "overdue" ? "all" : "overdue"));
            setCurrentPage(1);
          }}
          className={`p-4 sm:p-5 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "overdue"
              ? "ring-2 ring-rose-500/40 border-rose-300 dark:border-rose-500/50"
              : "hover:border-slate-300 dark:hover:border-white/20"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Task Terlambat</span>
            <div className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {summary.overdueClients}
            </span>
            <span className="text-xs text-slate-400">Klien</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {summary.inProgressClients} In Progress
            </span>
            <span className="mx-1">•</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {summary.todoClients} To Do
            </span>
          </p>
        </Card>

        <Card
          onClick={() => {
            setStatusFilter((prev) => (prev === "idle" ? "all" : "idle"));
            setCurrentPage(1);
          }}
          className={`p-4 sm:p-5 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "idle"
              ? "ring-2 ring-slate-500/40 border-slate-400 dark:border-white/30"
              : "hover:border-slate-300 dark:hover:border-white/20"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Belum Ada Task</span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {summary.idleClients}
            </span>
            <span className="text-xs text-slate-400">Klien</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {summary.noPicClients > 0 ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {summary.noPicClients} klien aktif belum ada PIC
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Semua klien aktif punya PIC
              </span>
            )}
          </p>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search + Contract Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9 pr-8 h-9 text-xs sm:text-sm"
                placeholder="Cari nama klien, NPWP, atau PIC..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 self-start">
              {[
                { key: "all", label: "Semua", icon: Layers },
                { key: "Bulanan", label: "Bulanan", icon: Calendar },
                { key: "Tahunan", label: "Tahunan", icon: Calendar },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setContractFilter(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                    contractFilter === tab.key
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={selectClass}
              aria-label="Filter status Task Board"
            >
              <option value="all">Semua Status Task</option>
              <option value="overdue">Terlambat (Deadline Lewat)</option>
              <option value="progress">In Progress</option>
              <option value="todo">To Do</option>
              <option value="done">Selesai (Done)</option>
              <option value="idle">Belum Ada Task</option>
              <option value="warning">Peringatan (PIC/Kontrak/Kendala)</option>
            </select>

            <select
              value={picFilter}
              onChange={(e) => {
                setPicFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={selectClass}
              aria-label="Filter PIC"
            >
              <option value="all">Semua PIC</option>
              <option value="unassigned">Belum Ada PIC</option>
              {picOptions.map((staff) => (
                <option key={staff.id} value={staff.name}>
                  PIC: {staff.name}
                </option>
              ))}
            </select>

            <select
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={selectClass}
              aria-label="Filter periode"
            >
              <option value="all">Semua Periode</option>
              <option value="month">
                Bulan Ini ({new Date().toLocaleString("id-ID", { month: "long" })})
              </option>
              <option value="30days">30 Hari (± Deadline)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={selectClass}
              aria-label="Urutkan klien"
            >
              <option value="priority">Urut: Prioritas</option>
              <option value="deadline">Urut: Deadline Terdekat</option>
              <option value="progress_asc">Urut: Progres Terendah</option>
              <option value="progress_desc">Urut: Progres Tertinggi</option>
              <option value="name">Urut: Nama (A–Z)</option>
            </select>

            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-slate-600 dark:text-slate-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Monitoring Client Table */}
      <Card className="overflow-hidden border-slate-200 dark:border-white/10">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Matriks Monitoring Klien
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Progres, kolom To Do / In Progress / Done, dan status terlambat dibaca langsung dari Task Board.
            </p>
          </div>
          <Badge tone="slate">{filteredRows.length} Klien Ditampilkan</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-3 px-3.5 font-semibold w-12 text-center">No</th>
                <th className="py-3 px-4 font-semibold min-w-[220px]">Klien</th>
                <th className="py-3 px-4 font-semibold min-w-[140px]">PIC</th>
                <th className="py-3 px-4 font-semibold min-w-[180px]">Kewajiban Pajak</th>
                <th className="py-3 px-4 font-semibold min-w-[180px]">Progres Task Board</th>
                <th className="py-3 px-4 font-semibold min-w-[140px]">Deadline Terdekat</th>
                <th className="py-3 px-4 font-semibold min-w-[130px]">Laporan Harian</th>
                <th className="py-3 px-4 font-semibold min-w-[155px]">Status Task Board</th>
                <th className="py-3 px-4 font-semibold text-right print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-16 px-4 text-center text-slate-400 dark:text-slate-500"
                  >
                    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      Tidak ada klien yang cocok dengan filter
                    </p>
                    <p className="text-xs mt-1">
                      Coba ubah kata kunci pencarian atau reset filter di atas.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const seqNumber =
                    pageSize === "all"
                      ? idx + 1
                      : (safeCurrentPage - 1) * pageSize + idx + 1;
                  const healthMeta = HEALTH_META[row.healthStatus] || HEALTH_META.idle;
                  const isBulanan = normalizeText(row.client.kontrak).includes("bulan");

                  return (
                    <tr
                      key={row.client.id}
                      onClick={() => setSelectedClientId(row.client.id)}
                      className="group cursor-pointer hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3.5 text-center font-mono text-xs text-slate-400">
                        {seqNumber}
                      </td>

                      {/* Client Identity */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {row.client.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold ${
                              isBulanan
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                            }`}
                          >
                            {row.client.kontrak || "Bulanan"}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {row.client.type || "Badan"}
                          </span>
                          {!row.isActiveClient && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              {row.client.status}
                            </span>
                          )}
                          {row.client.npwp && (
                            <span className="font-mono text-slate-400 dark:text-slate-500">
                              {row.client.npwp}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PIC */}
                      <td className="py-3 px-4">
                        {row.resolvedPic ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-white/10">
                            <User className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {row.resolvedPic}
                            </span>
                          </span>
                        ) : (
                          <Badge tone="amber">Belum ada PIC</Badge>
                        )}
                      </td>

                      {/* Obligations */}
                      <td className="py-3 px-4">
                        {row.obligationsWithStatus.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">
                            Belum diset
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {row.obligationsWithStatus.map((ob) => (
                              <span
                                key={ob.key}
                                title={`${ob.label}: ${OBLIGATION_STATUS_LABEL[ob.status]}`}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
                                  OBLIGATION_STATUS_STYLE[ob.status]
                                }`}
                              >
                                {ob.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Task Board Progress */}
                      <td className="py-3 px-4">
                        {row.totalWork === 0 ? (
                          <span className="text-xs text-slate-400 italic">
                            0 task
                          </span>
                        ) : (
                          <div className="space-y-1.5 min-w-[155px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {row.doneWork}/{row.totalWork} Done
                              </span>
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {row.completionRate}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  row.overdueWork > 0
                                    ? "bg-rose-500"
                                    : row.completionRate === 100
                                      ? "bg-emerald-500"
                                      : "bg-blue-500"
                                }`}
                                style={{ width: `${row.completionRate}%` }}
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                              {row.todoWork > 0 && <span>{row.todoWork} To Do</span>}
                              {row.inProgressWork > 0 && (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  {row.inProgressWork} Progress
                                </span>
                              )}
                              {row.overdueWork > 0 && (
                                <span className="font-semibold text-rose-600 dark:text-rose-400">
                                  • {row.overdueWork} Terlambat
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Nearest Deadline */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {row.nearestDeadline ? (
                          <div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {row.nearestDeadline}
                            </div>
                            <div
                              className={`text-[11px] font-medium ${
                                row.nearestDeadlineDiff < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : row.nearestDeadlineDiff <= 3
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-slate-400"
                              }`}
                            >
                              {formatDeadlineRelative(row.nearestDeadlineDiff)}
                            </div>
                          </div>
                        ) : row.totalWork > 0 && row.doneWork === row.totalWork ? (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            Semua selesai
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Daily Reports */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {row.dailyReports.length} laporan
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {row.lastReportDate
                            ? `Terakhir: ${row.lastReportDate}`
                            : "Belum ada laporan"}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <Badge tone={healthMeta.tone} className="font-semibold">
                          {row.healthStatus === "overdue" && (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {row.healthStatus === "todo" && (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {row.healthStatus === "done" && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {row.healthStatus === "progress" && (
                            <Clock className="h-3 w-3" />
                          )}
                          <span>{healthMeta.label}</span>
                        </Badge>
                        {row.healthReasons.length > 0 && (
                          <p
                            title={row.healthReasons.join(" • ")}
                            className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 max-w-[190px]"
                          >
                            {row.healthReasons[0]}
                          </p>
                        )}
                      </td>

                      {/* Action */}
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap print:hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedClientId(row.client.id)}
                          className="h-7 px-2.5 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Detail</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              Menampilkan{" "}
              <strong className="font-semibold text-slate-900 dark:text-slate-200">
                {filteredRows.length === 0
                  ? 0
                  : (safeCurrentPage - 1) * (pageSize === "all" ? 0 : pageSize) + 1}
              </strong>{" "}
              –{" "}
              <strong className="font-semibold text-slate-900 dark:text-slate-200">
                {pageSize === "all"
                  ? filteredRows.length
                  : Math.min(safeCurrentPage * pageSize, filteredRows.length)}
              </strong>{" "}
              dari{" "}
              <strong className="font-semibold text-slate-900 dark:text-slate-200">
                {filteredRows.length}
              </strong>{" "}
              klien
            </span>

            <div className="flex items-center gap-1.5">
              <span>Per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageSize(val === "all" ? "all" : Number(val));
                  setCurrentPage(1);
                }}
                className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">Semua</option>
              </select>
            </div>
          </div>

          {pageSize !== "all" && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Button>
              <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
                Hal {safeCurrentPage} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Client Monitoring Detail Modal */}
      {selectedRow && (
        <ClientMonitoringDetailModal
          row={selectedRow}
          todayStr={todayStr}
          onClose={() => setSelectedClientId(null)}
        />
      )}
    </div>
  );
}

function ClientMonitoringDetailModal({ row, todayStr, onClose }) {
  const [activeTab, setActiveTab] = useState("tasks");
  const { client } = row;
  const healthMeta = HEALTH_META[row.healthStatus] || HEALTH_META.idle;
  const hasDriveLink = isSafeHttpUrl(client.link_gdrive);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-slate-200 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {client.name}
              </h2>
              <Badge tone={healthMeta.tone} className="font-semibold">
                {healthMeta.label}
              </Badge>
              <Badge tone="blue">{client.kontrak || "Bulanan"}</Badge>
              <Badge tone="slate">{client.type || "Badan"}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Status: <strong>{client.status || "Aktif"}</strong>
              {client.npwp ? ` • NPWP: ${client.npwp}` : ""}
              {row.resolvedPic ? ` • PIC: ${row.resolvedPic}` : " • Belum ada PIC"}
            </p>
            {row.healthReasons.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.healthReasons.map((reason) => (
                  <span
                    key={reason}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasDriveLink && (
              <a
                href={client.link_gdrive.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-white/10 dark:bg-slate-800 dark:text-blue-400"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">GDrive</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/8"
              aria-label="Tutup modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Mini KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 p-3">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Progres Task Board
              </div>
              <div className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                {row.completionRate}%
              </div>
              <div className="text-[11px] text-slate-500">
                {row.todoWork} To Do • {row.inProgressWork} Progress • {row.doneWork} Done
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 p-3">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Task Terlambat
              </div>
              <div
                className={`mt-0.5 text-lg font-bold ${
                  row.overdueWork > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {row.overdueWork}
              </div>
              <div className="text-[11px] text-slate-500">
                {row.nearestDeadline
                  ? `Terdekat: ${row.nearestDeadline}`
                  : "Tidak ada antrian deadline"}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 p-3">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Laporan Harian
              </div>
              <div className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                {row.dailyReports.length}
              </div>
              <div className="text-[11px] text-slate-500">
                {row.obstacleReportsCount > 0
                  ? `${row.obstacleReportsCount} laporan ada kendala`
                  : "Tidak ada kendala"}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 p-3">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Masa Kontrak
              </div>
              <div className="mt-0.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                {client.tanggal_mulai_kontrak || client.tanggal_akhir_kontrak
                  ? `${client.tanggal_mulai_kontrak || "?"} s/d ${client.tanggal_akhir_kontrak || "?"}`
                  : "Belum diisi"}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {row.contractDaysLeft !== null
                  ? formatDeadlineRelative(row.contractDaysLeft)
                  : client.kontrak || "Bulanan"}
              </div>
            </div>
          </div>

          {/* Kewajiban Pajak Status Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              Kewajiban Perpajakan Aktif
            </h3>
            {row.obligationsWithStatus.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Belum ada kewajiban pajak yang diaktifkan pada profil klien ini.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {row.obligationsWithStatus.map((ob) => (
                  <div
                    key={ob.key}
                    className={`rounded-lg border px-3 py-2 ${OBLIGATION_STATUS_STYLE[ob.status]}`}
                  >
                    <div className="text-xs font-bold">{ob.label}</div>
                    <div className="text-[11px] opacity-90 mt-0.5">
                      {OBLIGATION_STATUS_LABEL[ob.status]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Tabs */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-white/10 pb-2.5">
              {[
                {
                  key: "tasks",
                  label: `Task Board (${row.tasks.length})`,
                  icon: ClipboardList,
                },
                {
                  key: "reports",
                  label: `Laporan Harian (${row.dailyReports.length})`,
                  icon: ClipboardCheck,
                },
                {
                  key: "info",
                  label: "Info & Kontak",
                  icon: Building2,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-3">
              {activeTab === "tasks" && (
                <div className="space-y-2">
                  {row.tasks.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">
                      Belum ada task di Task Board untuk klien ini pada periode terpilih.
                    </p>
                  ) : (
                    row.tasks.map((task) => {
                      const badge = getTaskBadgeMeta(task, todayStr);
                      const cleanNotes = stripApprovalComment(task.notes);
                      const hasInvoice = isSafeHttpUrl(task.invoice_url);
                      return (
                        <div
                          key={task.id}
                          className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white dark:bg-slate-900/50 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                              {task.title}
                            </div>
                            <Badge tone={badge.tone}>{badge.label}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>PIC: {task.pic || "-"}</span>
                            <span>Deadline: {task.deadline || "-"}</span>
                            <span>Poin: {task.points ?? 0} pt</span>
                            {hasInvoice && (
                              <a
                                href={task.invoice_url.trim()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Bukti/Invoice <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          {cleanNotes && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                              {cleanNotes}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "reports" && (
                <div className="space-y-2.5">
                  {row.dailyReports.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">
                      Belum ada laporan harian staff yang mencatat klien ini.
                    </p>
                  ) : (
                    row.dailyReports.map((report) => (
                      <div
                        key={report.id}
                        className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white dark:bg-slate-900/50 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {report.staff} •{" "}
                            <span className="font-normal text-slate-500">
                              {report.reportDate} {report.reportTime ? `(${report.reportTime})` : ""}
                            </span>
                          </div>
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
                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {report.tasksSummary || "-"}
                        </p>
                        {report.obstacles && (
                          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-2 text-xs text-amber-800 dark:text-amber-300">
                            <strong>Kendala:</strong> {report.obstacles}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "info" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-200/80 dark:border-white/10 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      Kontak & Alamat
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{client.email || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{client.no_telepon || "-"}</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{client.alamat || "-"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 dark:border-white/10 p-3 space-y-1.5 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      Administrasi & Aktivasi
                    </div>
                    <div>
                      <span className="text-slate-500">Konfirmasi:</span>{" "}
                      <span className="text-slate-800 dark:text-slate-200">
                        {client.konfirmasi || client.keterangan_konfirmasi || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Aktivasi:</span>{" "}
                      <span className="text-slate-800 dark:text-slate-200">
                        {client.keterangan_aktivasi || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">SPT Tahunan 2024:</span>{" "}
                      <span className="text-slate-800 dark:text-slate-200">
                        {client.spt_tahunan_2024 || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Keterangan:</span>{" "}
                      <span className="text-slate-800 dark:text-slate-200">
                        {client.keterangan || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <Link
              to="/clients"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>Buka di Data Client</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/tasks"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>Buka Task Board</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Button size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </Card>
    </div>
  );
}
