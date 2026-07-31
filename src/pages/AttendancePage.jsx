import { CalendarDays, Clock } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";
import {
  createAttendance,
  deleteAttendance,
  updateAttendance,
} from "../services/database";
import { useAuth } from "../hooks/useAuth";

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

export function AttendancePage() {
  const { data } = useAppData();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(getEmptyAttendance());
  const attendance = data?.attendance ?? [];
  // Filter only complete attendance records (both checkIn and checkOut present)
  const completeAttendance = attendance.filter(row => row.checkIn && row.checkOut);
  const attendanceChart = completeAttendance.map((row) => ({
    staff: row.staff,
    jam: calculateWorkHours(row.checkIn, row.checkOut),
  }));
  const totalHours = attendanceChart.reduce((total, row) => total + row.jam, 0);
  const averageHours = attendanceChart.length
    ? totalHours / attendanceChart.length
    : 0;

  async function refresh(message) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(message);
  }

  async function submit(event) {
    event.preventDefault();
    try {
      if (!form.staff.trim()) return toast.error("Nama staff wajib diisi");
      if (!form.date) return toast.error("Tanggal wajib diisi");
      if (!form.checkIn) return toast.error("Jam masuk wajib diisi");
      if (!form.checkOut) return toast.error("Jam pulang wajib diisi");
      if (!form.status) return toast.error("Status wajib dipilih");

      // Validate time format
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(form.checkIn)) {
        return toast.error("Format jam masuk tidak valid (HH:MM)");
      }
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(form.checkOut)) {
        return toast.error("Format jam pulang tidak valid (HH:MM)");
      }

      if (editing) {
        await updateAttendance(editing.id, form);
        setEditing(null);
        await refresh("Absensi diperbarui");
      } else {
        await createAttendance(form);
        await refresh("Absensi ditambahkan");
      }
      setForm(getEmptyAttendance());
      setShowForm(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Absensi gagal disimpan",
      );
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

  async function quickAttendance(type) {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    const staff = user?.name || user?.email || "";
    const today = getToday();
    try {
      if (!staff) {
        toast.error("Profil staff belum terbaca. Gunakan Input Manual.");
        return;
      }
      const existing = attendance.find(
        (row) => row.staff === staff && row.date === today,
      );
      if (type === "in") {
        if (existing) {
          // Update existing record with check-in time and proper status
          const checkInTime = existing.checkIn || time;
          const status = checkInTime > "08:00" ? "Terlambat" : existing.status === "Izin" || existing.status === "Remote" ? existing.status : "Hadir";
          await updateAttendance(existing.id, {
            ...existing,
            checkIn: checkInTime,
            status: status,
          });
          await refresh("Check in hari ini sudah tercatat");
          return;
        }
        // Create new attendance record
        const status = time > "08:00" ? "Terlambat" : "Hadir";
        await createAttendance({
          staff,
          date: today,
          checkIn: time,
          checkOut: "",
          status: status,
        });
        await refresh("Check in tersimpan");
        return;
      }
      if (!existing) {
        toast.error("Belum ada check in hari ini");
        return;
      }
      if (!existing.checkIn) {
        toast.error("Check in belum tercatat. Silakan check in terlebih dahulu.");
        return;
      }
      await updateAttendance(existing.id, {
        staff: existing.staff,
        date: existing.date,
        checkIn: existing.checkIn,
        checkOut: time,
        status: existing.status,
      });
      await refresh("Check out tersimpan");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Absensi gagal diproses",
      );
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2 sm:gap-3">
        <div className="w-full sm:w-auto">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold">Absensi</h1>
            <Badge tone="green" className="text-xs sm:text-sm">Realtime aktif</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Jam masuk, jam pulang, durasi kerja, dan status kehadiran staff.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
          <Button onClick={() => void quickAttendance("in")} className="w-full sm:w-auto text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            Check In
          </Button>
          <Button
            variant="secondary"
            onClick={() => void quickAttendance("out")}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Check Out
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setShowForm((value) => !value);
              setEditing(null);
              setForm(getEmptyAttendance(user?.name || user?.email || ""));
            }}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Input Manual
          </Button>
        </div>
      </div>
      {showForm && (
        <Card className="p-3 sm:p-4">
          <form
            className="grid gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3"
            onSubmit={(event) => void submit(event)}
          >
            <Input
              placeholder="Nama staff"
              value={form.staff}
              onChange={(event) =>
                setForm({ ...form, staff: event.target.value })
              }
              className="text-xs sm:text-sm"
            />
            <Input
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm({ ...form, date: event.target.value })
              }
              className="text-xs sm:text-sm"
            />
            <Input
              type="time"
              value={form.checkIn}
              onChange={(event) =>
                setForm({ ...form, checkIn: event.target.value })
              }
              className="text-xs sm:text-sm"
            />
            <Input
              type="time"
              value={form.checkOut}
              onChange={(event) =>
                setForm({ ...form, checkOut: event.target.value })
              }
              className="text-xs sm:text-sm"
            />
            <select
              className="h-9 sm:h-10 rounded-md border border-slate-200 bg-white px-2 sm:px-3 text-xs sm:text-sm dark:border-white/10 dark:bg-slate-950"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
              <option value="Remote">Remote</option>
            </select>
            <div className="flex gap-1 sm:gap-2 md:col-span-2 lg:col-span-3">
              <Button className="text-xs sm:text-sm">{editing ? "Update Absensi" : "Simpan Absensi"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setForm(getEmptyAttendance());
                }}
                className="text-xs sm:text-sm"
              >
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}
      <section className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-slate-500">Total Jam Tercatat</p>
          <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold">{totalHours.toFixed(1)} jam</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-slate-500">Rata-rata Jam/Staf</p>
          <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold">
            {averageHours.toFixed(1)} jam
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-slate-500">Terlambat/Izin/Remote</p>
          <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold">
            {attendance.filter((row) => row.status !== "Hadir").length}
          </p>
        </Card>
      </section>
      <Card className="p-3 sm:p-4">
        <div className="mb-3 sm:mb-4 flex items-center gap-1 sm:gap-2 font-bold">
          <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
          <span className="text-sm sm:text-base">Kalender {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</span>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs sm:text-sm">
          {Array.from(
            { length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() },
            (_, index) => {
              const date = index + 1;
              const today = new Date().getDate();
              const isToday = date === today;
              const currentMonth = new Date().getMonth();
              const currentYear = new Date().getFullYear();
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
              const hasAttendance = attendance.some(row => row.date === dateStr);

              return (
                <div
                  key={index}
                  className={`rounded-md p-2 sm:p-3 font-medium transition ${
                    isToday
                      ? "bg-green-500 text-white shadow-md"
                      : hasAttendance
                      ? "bg-teal-500 text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-300"
                  }`}
                  title={hasAttendance ? "Ada absensi" : isToday ? "Hari ini" : ""}
                >
                  {date}
                </div>
              );
            }
          )}
        </div>
      </Card>
      <Card className="p-3 sm:p-4">
        <h2 className="mb-3 sm:mb-4 font-bold text-sm sm:text-base">Grafik Jam Kerja Staff</h2>
        <div className="h-60 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="staff" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="jam" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-white/5">
            <tr>
              <th className="p-2 sm:p-3 whitespace-nowrap">Staff</th>
              <th className="p-2 sm:p-3 whitespace-nowrap">Tanggal</th>
              <th className="p-2 sm:p-3 whitespace-nowrap">Masuk</th>
              <th className="p-2 sm:p-3 whitespace-nowrap">Pulang</th>
              <th className="p-2 sm:p-3 whitespace-nowrap">Durasi</th>
              <th className="p-2 sm:p-3 whitespace-nowrap">Status</th>
              <th className="p-2 sm:p-3 whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {attendance.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="p-2 sm:p-3 font-medium sm:font-semibold whitespace-nowrap">{row.staff}</td>
                <td className="p-2 sm:p-3 whitespace-nowrap">{row.date}</td>
                <td className="p-2 sm:p-3 whitespace-nowrap">{row.checkIn}</td>
                <td className="p-2 sm:p-3 whitespace-nowrap">{row.checkOut}</td>
                <td className="p-2 sm:p-3 whitespace-nowrap">
                  {calculateWorkHours(row.checkIn, row.checkOut).toFixed(1)} jam
                </td>
                <td className="p-2 sm:p-3 whitespace-nowrap">
                  <Badge
                    tone={
                      row.status === "Hadir"
                        ? "green"
                        : row.status === "Terlambat"
                          ? "amber"
                          : "blue"
                    }
                    className="text-xs"
                  >
                    {row.status}
                  </Badge>
                </td>
                <td className="p-2 sm:p-3 whitespace-nowrap">
                  <div className="flex gap-1 sm:gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startEdit(row)}
                      className="text-xs px-2 py-1"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void deleteAttendance(row.id).then(() =>
                          refresh("Absensi dihapus"),
                        )
                      }
                      className="text-xs px-2 py-1"
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function calculateWorkHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [inHour = 0, inMinute = 0] = checkIn.split(":").map(Number);
  const [outHour = 0, outMinute = 0] = checkOut.split(":").map(Number);
  const minutes = outHour * 60 + outMinute - (inHour * 60 + inMinute);
  return Math.max(minutes / 60, 0);
}
