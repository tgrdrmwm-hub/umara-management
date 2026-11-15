import {
  CalendarDays,
  Clock,
  Plus,
  X,
  Pencil,
  Trash2,
  ClipboardCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  CalendarRange,
  Check,
  CheckCircle2,
  RotateCcw,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import {
  PALETTE,
  CustomTooltip,
  axisTick,
  gridStyle,
  animationProps,
} from "../components/ui/ChartWrapper";
import { useAppData } from "../hooks/useAppData";
import {
  createAttendance,
  deleteAttendance,
  updateAttendance,
  bulkSaveAttendance,
} from "../services/database";
import { useAuth } from "../hooks/useAuth";

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getEmptyAttendance(staff = "") {
  return {
    staff,
    date: getToday(),
    checkIn: "08:00",
    checkOut: "17:00",
    status: "Hadir",
  };
}

const STATUS_COLOR = {
  Hadir: "#059669", // emerald-600
  Terlambat: "#d97706", // amber-600
  Izin: "#4f46e5", // indigo-600
  Remote: "#0d9488", // teal-600
};

const INDO_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const INDO_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMondayOfDate(dateStr) {
  const [y, m, d] = (dateStr || getToday()).split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const day = dateObj.getDay(); // 0: Sun, 1: Mon
  const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(dateObj.setDate(diff));
  return toISODate(monday);
}

function addDaysToDate(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + days);
  return toISODate(dateObj);
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    const dayName = INDO_DAYS[dateObj.getDay()];
    const monthName = INDO_MONTHS_SHORT[m - 1];
    return `${dayName}, ${d} ${monthName} ${y}`;
  } catch (e) {
    return dateStr;
  }
}

function generateWeekDays(mondayStr, includeSat, currentStaff, existingAttendanceList) {
  const count = includeSat ? 6 : 5;
  const days = [];
  for (let i = 0; i < count; i++) {
    const curDate = addDaysToDate(mondayStr, i);
    const [y, m, d] = curDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = INDO_DAYS[dateObj.getDay()];

    const found = existingAttendanceList?.find(
      (r) => r.staff === currentStaff && r.date === curDate
    );

    days.push({
      date: curDate,
      dayName,
      enabled: true,
      checkIn: found?.checkIn || "08:00",
      checkOut: found?.checkOut || "17:00",
      status: found?.status || "Hadir",
      isExisting: !!found,
      existingId: found?.id,
    });
  }
  return days;
}

export function AttendancePage() {
  const navigate = useNavigate();
  const { data } = useAppData();
  const { user } = useAuth();
  const isAdmin = ["owner", "developer", "manager", "admin"].includes(
    user?.role,
  );
  const isMagangRole = user?.role === "magang" || user?.role === "staff_magang";
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(getEmptyAttendance());
  const [activeTab, setActiveTab] = useState(isMagangRole ? "magang" : "staff");
  const [internPrompt, setInternPrompt] = useState({ show: false, type: null, name: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStaff, setFilterStaff] = useState("ALL");
  const [filterPeriod, setFilterPeriod] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("desc"); // 'desc' | 'asc'

  // Weekly Bulk Modal States
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyStaff, setWeeklyStaff] = useState("");
  const [selectedWeekMonday, setSelectedWeekMonday] = useState(getMondayOfDate(getToday()));
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const [weeklyDays, setWeeklyDays] = useState([]);
  const [isSubmittingWeekly, setIsSubmittingWeekly] = useState(false);
  const [quickFill, setQuickFill] = useState({
    checkIn: "08:00",
    checkOut: "17:00",
    status: "Hadir",
  });

  const allAttendance = data?.attendance ?? [];
  const users = data?.users ?? [];

  const isMagang = (staffName) => {
    if (staffName.toLowerCase().includes("(magang)")) return true;
    const foundUser = users.find(
      (u) => u.name === staffName || u.email === staffName,
    );
    return (
      foundUser &&
      (foundUser.role === "magang" || foundUser.role === "staff_magang")
    );
  };

  const staffList = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      if (u.name) set.add(u.name);
      else if (u.email) set.add(u.email);
    });
    allAttendance.forEach((r) => {
      if (r.staff) set.add(r.staff);
    });
    return Array.from(set).sort();
  }, [users, allAttendance]);

  const currentTabStaffList = useMemo(() => {
    return staffList.filter((s) => (activeTab === "magang" ? isMagang(s) : !isMagang(s)));
  }, [staffList, activeTab]);

  const attendance = allAttendance.filter((r) =>
    activeTab === "magang" ? isMagang(r.staff) : !isMagang(r.staff),
  );

  const processedAttendance = useMemo(() => {
    let list = [...attendance];

    // Filter search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => r.staff?.toLowerCase().includes(q) || r.date?.includes(q));
    }

    // Filter staff
    if (filterStaff && filterStaff !== "ALL") {
      list = list.filter((r) => r.staff === filterStaff);
    }

    // Filter period
    if (filterPeriod && filterPeriod !== "ALL") {
      const todayStr = getToday();
      const [tYear, tMonth] = todayStr.split("-").map(Number);
      const thisMonthPrefix = `${tYear}-${String(tMonth).padStart(2, "0")}`;

      if (filterPeriod === "TODAY") {
        list = list.filter((r) => r.date === todayStr);
      } else if (filterPeriod === "THIS_MONTH") {
        list = list.filter((r) => r.date?.startsWith(thisMonthPrefix));
      } else if (filterPeriod === "LAST_MONTH") {
        const lastMonthDate = new Date(tYear, tMonth - 2, 1);
        const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
        list = list.filter((r) => r.date?.startsWith(lastMonthPrefix));
      } else if (filterPeriod === "THIS_WEEK") {
        const monday = getMondayOfDate(todayStr);
        const sunday = addDaysToDate(monday, 6);
        list = list.filter((r) => r.date >= monday && r.date <= sunday);
      }
    }

    // Sort by date
    list.sort((a, b) => {
      const dateComp = (a.date || "").localeCompare(b.date || "");
      if (dateComp !== 0) {
        return sortOrder === "asc" ? dateComp : -dateComp;
      }
      return (a.checkIn || "").localeCompare(b.checkIn || "");
    });

    return list;
  }, [attendance, searchQuery, filterStaff, filterPeriod, sortOrder]);

  function openWeeklyModal() {
    const defaultStaff = user?.name || user?.email || currentTabStaffList[0] || "";
    const monday = getMondayOfDate(getToday());
    setWeeklyStaff(defaultStaff);
    setSelectedWeekMonday(monday);
    setIncludeSaturday(false);
    setWeeklyDays(generateWeekDays(monday, false, defaultStaff, allAttendance));
    setShowWeeklyModal(true);
  }

  function handleStaffChange(newStaff) {
    setWeeklyStaff(newStaff);
    setWeeklyDays(generateWeekDays(selectedWeekMonday, includeSaturday, newStaff, allAttendance));
  }

  function handleMondayChange(newDate) {
    const newMonday = getMondayOfDate(newDate);
    setSelectedWeekMonday(newMonday);
    setWeeklyDays(generateWeekDays(newMonday, includeSaturday, weeklyStaff, allAttendance));
  }

  function handleIncludeSaturdayToggle(checked) {
    setIncludeSaturday(checked);
    setWeeklyDays(generateWeekDays(selectedWeekMonday, checked, weeklyStaff, allAttendance));
  }

  function handlePrevWeek() {
    const prevMonday = addDaysToDate(selectedWeekMonday, -7);
    setSelectedWeekMonday(prevMonday);
    setWeeklyDays(generateWeekDays(prevMonday, includeSaturday, weeklyStaff, allAttendance));
  }

  function handleNextWeek() {
    const nextMonday = addDaysToDate(selectedWeekMonday, 7);
    setSelectedWeekMonday(nextMonday);
    setWeeklyDays(generateWeekDays(nextMonday, includeSaturday, weeklyStaff, allAttendance));
  }

  function updateDayField(index, field, value) {
    setWeeklyDays((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function applyQuickFillToAll() {
    setWeeklyDays((prev) =>
      prev.map((d) => ({
        ...d,
        status: quickFill.status,
        checkIn: quickFill.checkIn,
        checkOut: quickFill.checkOut,
        enabled: true,
      }))
    );
    toast.info("Jam dan status diterapkan ke semua hari.");
  }

  async function submitWeeklyAttendance() {
    if (isSubmittingWeekly) return;
    if (!weeklyStaff.trim()) {
      return toast.error("Nama staff wajib diisi.");
    }

    const activeDays = weeklyDays.filter((d) => d.enabled);
    if (activeDays.length === 0) {
      return toast.error("Pilih minimal satu hari yang akan disimpan.");
    }

    for (const d of activeDays) {
      if (d.status !== "Izin" && !d.checkIn) {
        return toast.error(`Jam masuk untuk hari ${d.dayName} (${d.date}) belum diisi.`);
      }
    }

    try {
      setIsSubmittingWeekly(true);
      let finalStaff = weeklyStaff.trim();
      const isSharedMagang = user?.role === "magang" || user?.role === "staff_magang";
      if (isSharedMagang && !finalStaff.toLowerCase().includes("(magang)")) {
        finalStaff = `${finalStaff} (Magang)`;
      }

      const records = activeDays.map((d) => ({
        staff: finalStaff,
        date: d.date,
        checkIn: d.checkIn || "",
        checkOut: d.checkOut || "",
        status: d.status,
      }));

      await bulkSaveAttendance(records);
      await refresh(`Berhasil menyimpan presensi seminggu (${records.length} hari) untuk ${finalStaff}`);
      setShowWeeklyModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan presensi seminggu");
    } finally {
      setIsSubmittingWeekly(false);
    }
  }
  const completeAttendance = attendance.filter((r) => r.checkIn && r.checkOut);
  const attendanceChart = completeAttendance.map((r) => ({
    staff: r.staff,
    jam: calcHours(r.checkIn, r.checkOut),
    status: r.status,
  }));
  const totalHours = attendanceChart.reduce((t, r) => t + r.jam, 0);
  const avgHours = attendanceChart.length
    ? totalHours / attendanceChart.length
    : 0;
  const nonHadir = attendance.filter((r) => r.status !== "Hadir").length;

  async function refresh(msg) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(msg);
  }

  async function submit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    try {
      if (!form.staff.trim()) return toast.error("Nama staff wajib diisi");
      if (!form.date) return toast.error("Tanggal wajib diisi");
      if (!form.checkIn) return toast.error("Jam masuk wajib diisi");

      setIsSubmitting(true);
      const isSharedMagang =
        user?.role === "magang" || user?.role === "staff_magang";
      let finalStaff = form.staff.trim();
      if (isSharedMagang && !finalStaff.toLowerCase().includes("(magang)")) {
        finalStaff = `${finalStaff} (Magang)`;
      }

      const payload = { ...form, staff: finalStaff };

      if (editing) {
        await updateAttendance(editing.id, payload, editing.status);
        setEditing(null);
        await refresh("Presensi diperbarui");
      } else {
        await createAttendance(payload);
        await refresh("Presensi ditambahkan");
      }
      setForm(getEmptyAttendance());
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(row) {
    setEditing(row);
    setForm({
      staff: row.staff,
      date: row.date,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      status: row.status,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(getEmptyAttendance());
  }

  async function processAttendance(type, staff) {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    const today = getToday();

    try {
      if (!staff) {
        toast.error("Profil staff belum terbaca.");
        return;
      }
      const existing = allAttendance.find(
        (r) => r.staff === staff && r.date === today,
      );
      if (type === "in") {
        if (existing) {
          const newStatus =
            (existing.checkIn || time) > "08:00" ? "Terlambat" : "Hadir";
          await updateAttendance(
            existing.id,
            {
              ...existing,
              checkIn: existing.checkIn || time,
              status: newStatus,
            },
            existing.status,
          );
          await refresh("Check in tercatat");
          return;
        }
        await createAttendance({
          staff,
          date: today,
          checkIn: time,
          checkOut: "",
          status: time > "08:00" ? "Terlambat" : "Hadir",
        });
        await refresh("Check in berhasil");
        return;
      }
      if (!existing) {
        toast.error("Belum ada check in hari ini");
        return;
      }
      await updateAttendance(
        existing.id,
        { ...existing, checkOut: time },
        existing.status,
      );
      await refresh("Check out tercatat");
      toast.info("Sudah mengisi Laporan Harian pekerjaan sebelum pulang?", {
        action: {
          label: "Isi Laporan",
          onClick: () => navigate("/daily-reports"),
        },
        duration: 8000,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses");
    }
  }

  async function quickAttendance(type) {
    const isSharedMagang = user?.role === "magang" || user?.role === "staff_magang";

    if (isSharedMagang) {
      setInternPrompt({ show: true, type, name: "" });
      return;
    }

    const staff = user?.name || user?.email || "";
    await processAttendance(type, staff);
  }

  async function submitInternAttendance() {
    if (!internPrompt.name || !internPrompt.name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    const staff = `${internPrompt.name.trim()} (Magang)`;
    await processAttendance(internPrompt.type, staff);
    setInternPrompt({ show: false, type: null, name: "" });
  }

  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const monthName = now.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Presensi
            </h1>
            <Badge tone="green">Realtime</Badge>
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Jam masuk, pulang, durasi kerja, dan status kehadiran staff.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => void quickAttendance("in")}
            className="flex-1 sm:flex-initial px-3 sm:px-4 text-xs sm:text-sm"
          >
            <Clock className="h-4 w-4 mr-1.5 shrink-0" />
            <span>Check In</span>
          </Button>
          <Button
            variant="secondary"
            className="flex-1 sm:flex-initial px-3 sm:px-4 text-xs sm:text-sm"
            onClick={() => void quickAttendance("out")}
          >
            <Clock className="h-4 w-4 mr-1.5 shrink-0" />
            <span>Check Out</span>
          </Button>
          <Button
            variant="secondary"
            className="flex-1 sm:flex-initial px-3 sm:px-4 text-xs sm:text-sm border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/80 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
            onClick={openWeeklyModal}
            title="Isi presensi manual satu minggu kerja sekaligus"
          >
            <CalendarRange className="h-4 w-4 mr-1.5 shrink-0" />
            <span>Input Seminggu</span>
          </Button>
          <Button
            variant="secondary"
            className="w-full sm:w-auto px-3 sm:px-4 text-xs sm:text-sm"
            onClick={() => {
              if (showForm && !editing) {
                closeForm();
              } else {
                setEditing(null);
                setForm(getEmptyAttendance(user?.name || ""));
                setShowForm(true);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-1.5 shrink-0" />
            <span>Tambah</span>
          </Button>
        </div>
      </div>

      {/* Reminder Banner Laporan Harian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/70 dark:border-blue-900/40 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
              Laporan Harian Sebelum Pulang
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Staff diharapkan mengisi ringkasan pekerjaan apa saja yang dilakukan hari ini sebelum jam kepulangan kantor.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate("/daily-reports")}
          className="text-xs h-8 shrink-0 self-start sm:self-auto shadow-xs border-blue-200 hover:bg-white dark:border-blue-900/50"
        >
          <span>Isi Laporan Harian</span>
          <span className="ml-1 text-slate-400">→</span>
        </Button>
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-4 border-b border-slate-200 dark:border-white/10">
          <button
            onClick={() => setActiveTab("staff")}
            className={`px-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "staff"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Staff & Karyawan
          </button>
          <button
            onClick={() => setActiveTab("magang")}
            className={`px-1 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "magang"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Anak Magang
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {editing ? "Edit Presensi" : "Input Presensi Manual"}
            </h2>
            <button
              onClick={closeForm}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(e) => void submit(e)}
          >
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Nama Staff *
              </label>
              <Input
                placeholder="Nama lengkap"
                value={form.staff}
                onChange={(e) => setForm({ ...form, staff: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Tanggal *
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Jam Masuk
              </label>
              <Input
                type="time"
                value={form.checkIn}
                onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Jam Pulang
              </label>
              <Input
                type="time"
                value={form.checkOut}
                onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Status
              </label>
              <select
                className={selectClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="Hadir">Hadir</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Izin">Izin</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={isSubmitting} loading={isSubmitting} className="flex-1">
                {isSubmitting ? "Menyimpan..." : (editing ? "Simpan" : "Tambah")}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Jam Tercatat
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totalHours.toFixed(1)}
            <span className="ml-1 text-sm font-normal text-slate-500">jam</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Rata-rata / Staff
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {avgHours.toFixed(1)}
            <span className="ml-1 text-sm font-normal text-slate-500">jam</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Tidak Hadir / Terlambat
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {nonHadir}
            <span className="ml-1 text-sm font-normal text-slate-500">
              kali
            </span>
          </p>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="p-3 sm:p-6 relative overflow-hidden bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-inner dark:bg-indigo-500/10 dark:text-indigo-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {monthName} {now.getFullYear()}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Log presensi bulan ini</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-md bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-white/5">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-indigo-500"></span>
              </span>
              Hari ini
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-md bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-white/5">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              Ada presensi
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-y-2 sm:gap-y-4 gap-x-1 sm:gap-x-2 relative z-10">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <div
              key={d}
              className="pb-1 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              {d}
            </div>
          ))}
          
          {(() => {
            const year = now.getFullYear();
            const month = now.getMonth();
            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInPrevMonth = new Date(year, month, 0).getDate();
            const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
            
            const days = [];
            for (let i = 0; i < firstDayIndex; i++) {
              days.push({ type: 'prev', date: daysInPrevMonth - firstDayIndex + i + 1 });
            }
            for (let i = 1; i <= daysInMonth; i++) {
              days.push({ type: 'current', date: i });
            }
            const remainingDays = 42 - days.length;
            for (let i = 1; i <= remainingDays; i++) {
              days.push({ type: 'next', date: i });
            }
            
            return days.map((day, idx) => {
              const isToday = day.type === 'current' && day.date === now.getDate();
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day.date).padStart(2, "0")}`;
              const hasAttendance = day.type === 'current' && attendance.some((r) => r.date === dateStr);
              
              return (
                <div key={idx} className="flex justify-center">
                  <div
                    className={`relative flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                      day.type !== 'current'
                        ? 'text-slate-300 dark:text-slate-700'
                        : isToday
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105 sm:scale-110 z-10'
                          : hasAttendance
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 hover:scale-105 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-500/30'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105'
                    } cursor-default group`}
                  >
                    {day.date}
                    {hasAttendance && !isToday && (
                      <span className="absolute bottom-1 h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-500 transition-transform group-hover:scale-150"></span>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Jam Kerja Staff
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Durasi jam kerja per sesi presensi
          </p>
        </div>
        {attendanceChart.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">
            Belum ada data jam kerja tercatat
          </div>
        ) : (
          <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={attendanceChart}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis
                  dataKey="staff"
                  tick={{
                    ...axisTick,
                    angle: -45,
                    textAnchor: "end",
                    height: 40,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  unit=" jam"
                />
                <Tooltip
                  content={<CustomTooltip />} cursor={{ fill: "var(--tw-colors-slate-500)", opacity: 0.05, rx: 4 }}
                  formatter={(v) => [`${v.toFixed(1)} jam`, "Durasi"]}
                />
                <Bar
                  dataKey="jam"
                  name="Jam Kerja"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={56}
                  {...animationProps}
                >
                  {attendanceChart.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={STATUS_COLOR[entry.status] ?? PALETTE[0]}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3">
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <span
              key={status}
              className="flex items-center gap-1.5 text-xs text-slate-500"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {status}
            </span>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-xs">
        {/* Table Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-white/8 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Riwayat Presensi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {processedAttendance.length} dari {attendance.length} catatan presensi
              </p>
            </div>

            {/* Quick Sort Toggle Button */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-8 px-2.5 flex items-center gap-1.5"
                onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                title="Ubah urutan tanggal presensi"
              >
                {sortOrder === "desc" ? (
                  <>
                    <ArrowDown className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Urutan: Terbaru</span>
                  </>
                ) : (
                  <>
                    <ArrowUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Urutan: Terlama</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-2 grid-cols-1 sm:grid-cols-12 items-center">
            {/* Search Input */}
            <div className="relative sm:col-span-5">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama staff atau tanggal (YYYY-MM-DD)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Staff Filter */}
            <div className="sm:col-span-3">
              <select
                value={filterStaff}
                onChange={(e) => setFilterStaff(e.target.value)}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="ALL">Semua Staff</option>
                {currentTabStaffList.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Filter */}
            <div className="sm:col-span-3">
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="ALL">Semua Waktu</option>
                <option value="TODAY">Hari Ini</option>
                <option value="THIS_WEEK">Minggu Ini</option>
                <option value="THIS_MONTH">Bulan Ini</option>
                <option value="LAST_MONTH">Bulan Lalu</option>
              </select>
            </div>

            {/* Reset Filter Button */}
            {(searchQuery || filterStaff !== "ALL" || filterPeriod !== "ALL") && (
              <div className="sm:col-span-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8.5 w-full text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStaff("ALL");
                    setFilterPeriod("ALL");
                  }}
                  title="Reset Filter"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs sm:min-w-[640px] sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/8">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                  Staff
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                  title="Klik untuk mengubah urutan tanggal"
                >
                  <div className="flex items-center gap-1.5 group">
                    <span>Tanggal</span>
                    <span className="p-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-400">
                      {sortOrder === "desc" ? (
                        <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                  Masuk
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                  Pulang
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                  Durasi
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                  Status
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 sticky right-0 bg-slate-50 dark:bg-slate-800/80 backdrop-blur-sm z-20 border-l border-slate-200 dark:border-white/10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/8">
              {processedAttendance.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    {attendance.length === 0
                      ? "Belum ada data presensi"
                      : "Tidak ada data presensi yang sesuai filter pencarian"}
                  </td>
                </tr>
              ) : (
                processedAttendance.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {row.staff}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {formatDisplayDate(row.date)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {row.date}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {row.checkIn || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {row.checkOut || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {calcHours(row.checkIn, row.checkOut).toFixed(1)} jam
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          row.status === "Hadir"
                            ? "green"
                            : row.status === "Terlambat"
                              ? "amber"
                              : "blue"
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800/50 z-10 border-l border-slate-100 dark:border-white/10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="px-2 md:px-3"
                            onClick={() => startEdit(row)}
                          >
                            <Pencil className="h-4 w-4 md:mr-1" />
                            <span className="hidden md:inline">Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2 md:px-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                            onClick={() =>
                              void deleteAttendance(row.id).then(() =>
                                refresh("Presensi dihapus"),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4 md:mr-1" />
                            <span className="hidden md:inline">Hapus</span>
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Weekly Bulk Input Modal */}
      {showWeeklyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity dark:bg-slate-900/80"
            onClick={() => !isSubmittingWeekly && setShowWeeklyModal(false)}
          />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10 flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 px-5 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <CalendarRange className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Input Presensi Seminggu
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Isi dan simpan presensi satu minggu kerja sekaligus untuk tanggal masing-masing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWeeklyModal(false)}
                disabled={isSubmittingWeekly}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Configuration: Staff & Week Navigation */}
              <div className="grid gap-3 sm:grid-cols-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/70 dark:border-white/5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nama Staff *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="weekly-staff-list"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="Pilih atau ketik nama staff"
                      value={weeklyStaff}
                      onChange={(e) => handleStaffChange(e.target.value)}
                    />
                    <datalist id="weekly-staff-list">
                      {currentTabStaffList.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Pilih Minggu (Pilih Tanggal Acuan)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-9 px-2 shrink-0"
                      onClick={handlePrevWeek}
                      title="Minggu Sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <input
                      type="date"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                      value={selectedWeekMonday}
                      onChange={(e) => handleMondayChange(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-9 px-2 shrink-0"
                      onClick={handleNextWeek}
                      title="Minggu Berikutnya"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Week Info & Saturday Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="text-xs font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/40">
                  Periode: {formatDisplayDate(selectedWeekMonday)} s/d{" "}
                  {formatDisplayDate(addDaysToDate(selectedWeekMonday, includeSaturday ? 5 : 4))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    checked={includeSaturday}
                    onChange={(e) => handleIncludeSaturdayToggle(e.target.checked)}
                  />
                  <span>Sertakan hari Sabtu (6 hari kerja)</span>
                </label>
              </div>

              {/* Quick Fill Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-600 dark:text-slate-400">
                    Isi Cepat Semua:
                  </span>
                  <input
                    type="time"
                    className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                    value={quickFill.checkIn}
                    onChange={(e) => setQuickFill({ ...quickFill, checkIn: e.target.value })}
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="time"
                    className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                    value={quickFill.checkOut}
                    onChange={(e) => setQuickFill({ ...quickFill, checkOut: e.target.value })}
                  />
                  <select
                    className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                    value={quickFill.status}
                    onChange={(e) => setQuickFill({ ...quickFill, status: e.target.value })}
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Izin">Izin</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  onClick={applyQuickFillToAll}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Terapkan ke Semua
                </Button>
              </div>

              {/* Day-by-Day Table */}
              <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400">
                        <th className="py-2.5 px-3 text-center w-10">Aktif</th>
                        <th className="py-2.5 px-3 text-left">Hari & Tanggal</th>
                        <th className="py-2.5 px-3 text-left w-32">Status</th>
                        <th className="py-2.5 px-3 text-left w-24">Masuk</th>
                        <th className="py-2.5 px-3 text-left w-24">Pulang</th>
                        <th className="py-2.5 px-3 text-left w-20">Durasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {weeklyDays.map((day, idx) => {
                        const dur = calcHours(day.checkIn, day.checkOut);
                        return (
                          <tr
                            key={day.date}
                            className={`transition-colors ${
                              !day.enabled
                                ? "bg-slate-50/50 opacity-50 dark:bg-slate-800/20"
                                : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={day.enabled}
                                onChange={(e) => updateDayField(idx, "enabled", e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {day.dayName}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{day.date}</span>
                                {day.isExisting && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium">
                                    Sudah ada di DB
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                disabled={!day.enabled}
                                value={day.status}
                                onChange={(e) => updateDayField(idx, "status", e.target.value)}
                                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                              >
                                <option value="Hadir">Hadir</option>
                                <option value="Terlambat">Terlambat</option>
                                <option value="Izin">Izin</option>
                                <option value="Remote">Remote</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="time"
                                disabled={!day.enabled || day.status === "Izin"}
                                value={day.checkIn}
                                onChange={(e) => updateDayField(idx, "checkIn", e.target.value)}
                                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 font-mono text-xs text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="time"
                                disabled={!day.enabled || day.status === "Izin"}
                                value={day.checkOut}
                                onChange={(e) => updateDayField(idx, "checkOut", e.target.value)}
                                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 font-mono text-xs text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                              {day.status === "Izin" ? "—" : `${dur.toFixed(1)} jam`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informational alert */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 text-xs">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Hari yang dicentang ({weeklyDays.filter((d) => d.enabled).length} hari) akan disimpan ke database presensi untuk staff{" "}
                  <strong>{weeklyStaff || "..."}</strong>. Hari libur/tidak masuk dapat di-uncheck.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/10 px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowWeeklyModal(false)}
                disabled={isSubmittingWeekly}
              >
                Batal
              </Button>
              <Button
                onClick={() => void submitWeeklyAttendance()}
                disabled={isSubmittingWeekly}
                loading={isSubmittingWeekly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                <span>
                  {isSubmittingWeekly
                    ? "Menyimpan..."
                    : `Simpan Presensi (${weeklyDays.filter((d) => d.enabled).length} Hari)`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Intern Prompt Modal */}
      {internPrompt.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity dark:bg-slate-900/80"
            onClick={() => setInternPrompt({ show: false, type: null, name: "" })}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10 sm:scale-100">
            <div className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Identitas Magang
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Karena akun ini dipakai bersama, mohon ketik nama panggilan Anda sebelum melakukan presensi.
              </p>
              <Input
                placeholder="Nama panggilan (contoh: Budi)"
                value={internPrompt.name}
                onChange={(e) => setInternPrompt({ ...internPrompt, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitInternAttendance();
                }}
                autoFocus
              />
              <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setInternPrompt({ show: false, type: null, name: "" })}
                >
                  Batal
                </Button>
                <Button className="w-full sm:w-auto" onClick={submitInternAttendance}>
                  {internPrompt.type === "in" ? "Check In" : "Check Out"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function calcHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [ih = 0, im = 0] = checkIn.split(":").map(Number);
  const [oh = 0, om = 0] = checkOut.split(":").map(Number);
  return Math.max((oh * 60 + om - (ih * 60 + im)) / 60, 0);
}
