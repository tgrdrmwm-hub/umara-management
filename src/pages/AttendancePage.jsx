import { CalendarDays, Clock, Plus, X } from "lucide-react";
import { useState } from "react";
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
import { PALETTE, tooltipStyle, axisTick, gridStyle, animationProps } from "../components/ui/ChartWrapper";
import { useAppData } from "../hooks/useAppData";
import { createAttendance, deleteAttendance, updateAttendance } from "../services/database";
import { useAuth } from "../hooks/useAuth";

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getEmptyAttendance(staff = "") {
  return { staff, date: getToday(), checkIn: "08:00", checkOut: "17:00", status: "Hadir" };
}

const STATUS_COLOR = {
  Hadir: "#059669", // emerald-600
  Terlambat: "#d97706", // amber-600
  Izin: "#4f46e5", // indigo-600
  Remote: "#0d9488", // teal-600
};

export function AttendancePage() {
  const { data, isLoading, error } = useAppData();
  const { user } = useAuth();
  const isAdmin = ["owner", "developer", "manager", "admin"].includes(user?.role);
  const isMagangRole = user?.role === "magang" || user?.role === "staff_magang";
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(getEmptyAttendance());
  const [activeTab, setActiveTab] = useState(isMagangRole ? "magang" : "staff");

  const allAttendance = data?.attendance ?? [];
  const users = data?.users ?? [];

  const isMagang = (staffName) => {
    if (staffName.toLowerCase().includes("(magang)")) return true;
    const foundUser = users.find(u => u.name === staffName || u.email === staffName);
    return foundUser && (foundUser.role === "magang" || foundUser.role === "staff_magang");
  };

  const attendance = allAttendance.filter(r => activeTab === "magang" ? isMagang(r.staff) : !isMagang(r.staff));
  const completeAttendance = attendance.filter((r) => r.checkIn && r.checkOut);
  const attendanceChart = completeAttendance.map((r) => ({
    staff: r.staff,
    jam: calcHours(r.checkIn, r.checkOut),
    status: r.status,
  }));
  const totalHours = attendanceChart.reduce((t, r) => t + r.jam, 0);
  const avgHours = attendanceChart.length ? totalHours / attendanceChart.length : 0;
  const nonHadir = attendance.filter((r) => r.status !== "Hadir").length;

  async function refresh(msg) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(msg);
  }

  async function submit(e) {
    e.preventDefault();
    try {
      if (!form.staff.trim()) return toast.error("Nama staff wajib diisi");
      if (!form.date) return toast.error("Tanggal wajib diisi");
      if (!form.checkIn) return toast.error("Jam masuk wajib diisi");
      
      const isSharedMagang = user?.role === "magang" || user?.role === "staff_magang" || user?.email === "magang@umaratax.com";
      let finalStaff = form.staff.trim();
      if (isSharedMagang && !finalStaff.toLowerCase().includes("(magang)")) {
        finalStaff = `${finalStaff} (Magang)`;
      }
      
      const payload = { ...form, staff: finalStaff };

      if (editing) {
        await updateAttendance(editing.id, payload);
        setEditing(null);
        await refresh("Absensi diperbarui");
      } else {
        await createAttendance(payload);
        await refresh("Absensi ditambahkan");
      }
      setForm(getEmptyAttendance());
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  }

  function startEdit(row) {
    setEditing(row);
    setForm({ staff: row.staff, date: row.date, checkIn: row.checkIn, checkOut: row.checkOut, status: row.status });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(getEmptyAttendance());
  }

  async function quickAttendance(type) {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    let staff = user?.name || user?.email || "";
    const today = getToday();
    
    const isSharedMagang = user?.role === "magang" || user?.role === "staff_magang" || user?.email === "magang@umaratax.com";
    
    if (isSharedMagang) {
      const inputName = window.prompt("Karena akun magang dipakai bersama, masukkan Nama Lengkap/Panggilan Anda:");
      if (!inputName || !inputName.trim()) return;
      staff = `${inputName.trim()} (Magang)`;
    }
    
    try {
      if (!staff) { toast.error("Profil staff belum terbaca."); return; }
      const existing = allAttendance.find((r) => r.staff === staff && r.date === today);
      if (type === "in") {
        if (existing) {
          await updateAttendance(existing.id, { ...existing, checkIn: existing.checkIn || time, status: (existing.checkIn || time) > "08:00" ? "Terlambat" : "Hadir" });
          await refresh("Check in tercatat");
          return;
        }
        await createAttendance({ staff, date: today, checkIn: time, checkOut: "", status: time > "08:00" ? "Terlambat" : "Hadir" });
        await refresh("Check in tersimpan");
        return;
      }
      if (!existing) { toast.error("Belum ada check in hari ini"); return; }
      await updateAttendance(existing.id, { ...existing, checkOut: time });
      await refresh("Check out tersimpan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses");
    }
  }

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Absensi</h1>
            <Badge tone="green">Realtime</Badge>
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Jam masuk, pulang, durasi kerja, dan status kehadiran staff.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void quickAttendance("in")}>
            <Clock className="h-3.5 w-3.5" />
            Check In
          </Button>
          <Button variant="secondary" onClick={() => void quickAttendance("out")}>
            Check Out
          </Button>
          {isAdmin && (
            <Button
              variant="secondary"
              onClick={() => {
                if (showForm && !editing) { closeForm(); } else { setEditing(null); setForm(getEmptyAttendance(user?.name || "")); setShowForm(true); }
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Manual
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-white/10">
        {!isMagangRole && (
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
        )}
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

      {/* Form */}
      {showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {editing ? "Edit Absensi" : "Input Absensi Manual"}
            </h2>
            <button onClick={closeForm} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => void submit(e)}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Nama Staff *</label>
              <Input placeholder="Nama lengkap" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tanggal *</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Jam Masuk</label>
              <Input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Jam Pulang</label>
              <Input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
              <select className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Hadir">Hadir</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Izin">Izin</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" className="flex-1">{editing ? "Simpan" : "Tambah"}</Button>
              <Button type="button" variant="secondary" onClick={closeForm}>Batal</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Jam Tercatat</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{totalHours.toFixed(1)}<span className="ml-1 text-sm font-normal text-slate-500">jam</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Rata-rata / Staff</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{avgHours.toFixed(1)}<span className="ml-1 text-sm font-normal text-slate-500">jam</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tidak Hadir / Terlambat</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{nonHadir}<span className="ml-1 text-sm font-normal text-slate-500">kali</span></p>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Kalender {monthName}</h2>
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-900 dark:bg-slate-100" />Hari ini</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Ada absensi</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-medium text-slate-400">{d}</div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const date = i + 1;
            const isToday = date === now.getDate();
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
            const hasAttendance = attendance.some((r) => r.date === dateStr);
            return (
              <div
                key={i}
                className={`flex h-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                  isToday
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : hasAttendance
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/8"
                }`}
              >
                {date}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Jam Kerja Staff</h2>
          <p className="mt-0.5 text-xs text-slate-400">Durasi jam kerja per sesi absensi</p>
        </div>
        {attendanceChart.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">
            Belum ada data jam kerja tercatat
          </div>
        ) : (
          <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceChart} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="staff" tick={{ ...axisTick, angle: -45, textAnchor: "end", height: 40 }} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} unit=" jam" />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v.toFixed(1)} jam`, "Durasi"]} />
                <Bar dataKey="jam" name="Jam Kerja" radius={[6, 6, 0, 0]} maxBarSize={56} {...animationProps}>
                  {attendanceChart.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLOR[entry.status] ?? PALETTE[0]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3">
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <span key={status} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {status}
            </span>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs sm:min-w-[640px] sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/8">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Staff</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Masuk</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Pulang</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Durasi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
                {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/8">
              {attendance.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada data absensi</td></tr>
              ) : (
                attendance.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{row.staff}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.date}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{row.checkIn || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{row.checkOut || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {calcHours(row.checkIn, row.checkOut).toFixed(1)} jam
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={row.status === "Hadir" ? "green" : row.status === "Terlambat" ? "amber" : "blue"}>
                        {row.status}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>Edit</Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                            onClick={() => void deleteAttendance(row.id).then(() => refresh("Absensi dihapus"))}
                          >
                            Hapus
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
    </div>
  );
}

function calcHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [ih = 0, im = 0] = checkIn.split(":").map(Number);
  const [oh = 0, om = 0] = checkOut.split(":").map(Number);
  return Math.max((oh * 60 + om - (ih * 60 + im)) / 60, 0);
}
