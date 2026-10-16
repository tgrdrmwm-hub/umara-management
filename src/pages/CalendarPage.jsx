import { useState, useMemo, useRef, useEffect } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  MapPin,
  Users,
  Plus,
  X,
  Pencil,
  Trash2,
  FileText,
  Calendar as CalendarIcon,
  Check,
  Search,
  Mail,
  BellRing,
  Send,
  Copy,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../services/database";
import {
  resolveEventStaffRecipients,
  getDaysUntilEvent,
  sendEventMeetingReminder,
  buildMeetingEmailTemplate,
} from "../services/notificationService";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function formatToYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const emptyEventForm = {
  title: "",
  eventDate: formatToYMD(new Date()),
  startTime: "09:00",
  endTime: "11:00",
  isAllDay: false,
  location: "",
  pic: "",
  notes: "",
};

export function CalendarPage() {
  const { data } = useAppData();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatToYMD(today), [today]);

  const [currentMonthDate, setCurrentMonthDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(emptyEventForm);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [reminderModalEvent, setReminderModalEvent] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [senderEmail, setSenderEmail] = useState(
    () =>
      localStorage.getItem("umara_email") ||
      import.meta.env.VITE_MAIL_SENDER_FROM_EMAIL ||
      "MS_noreply@test-p7kx4xw0ny7g9yjr.mlsender.net",
  );

  // State untuk Multi-Select Dropdown PIC
  const [isPicDropdownOpen, setIsPicDropdownOpen] = useState(false);
  const [picSearch, setPicSearch] = useState("");
  const picDropdownRef = useRef(null);

  const events = data?.calendarEvents ?? [];
  const allUsers = data?.users ?? [];

  // Close dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        picDropdownRef.current &&
        !picDropdownRef.current.contains(event.target)
      ) {
        setIsPicDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Daftar seluruh PIC (Staff, Owner, Magang) dengan prioritas Bu Uma
  const availablePics = useMemo(() => {
    const list = [];

    // Helper untuk formatting nama (misal: "intan" -> "Intan")
    const formatName = (str) => {
      if (!str) return "";
      if (str.toLowerCase() === "owner") return "Bu Uma (Owner)";
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // Prioritaskan Bu Uma (Owner)
    const buUmaUser = allUsers.find(
      (u) =>
        u.name?.toLowerCase().includes("uma") ||
        u.email?.toLowerCase().includes("owner") ||
        u.name?.toLowerCase() === "owner" ||
        u.role === "owner",
    );
    if (buUmaUser) {
      list.push({
        id: buUmaUser.id,
        name: buUmaUser.name?.toLowerCase() === "owner" ? "Bu Uma (Owner)" : formatName(buUmaUser.name),
        role: "Owner",
      });
    } else {
      list.push({ id: "bu-uma-default", name: "Bu Uma", role: "Owner" });
    }

    // Tambahkan seluruh staf & anggota dari database
    for (const u of allUsers) {
      const formatted = formatName(u.name);
      if (
        formatted &&
        !list.some((item) => item.name.toLowerCase() === formatted.toLowerCase() || item.id === u.id)
      ) {
        list.push({
          id: u.id,
          name: formatted,
          role: u.role === "owner" ? "Owner" : u.role.replace("_", " "),
        });
      }
    }

    // Jika database belum terload, sediakan fallback
    if (list.length <= 1) {
      const defaultFallbacks = ["Tegar", "Intan", "Anggun", "Azizah", "Aulia", "Septi", "Nita", "Anna", "Magang"];
      for (const name of defaultFallbacks) {
        if (!list.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
          list.push({ id: `fb-${name}`, name, role: "Staff" });
        }
      }
    }

    return list;
  }, [allUsers]);

  const filteredPics = useMemo(() => {
    if (!picSearch.trim()) return availablePics;
    return availablePics.filter(
      (u) =>
        u.name.toLowerCase().includes(picSearch.toLowerCase()) ||
        u.role.toLowerCase().includes(picSearch.toLowerCase()),
    );
  }, [availablePics, picSearch]);

  const selectedPicsList = useMemo(() => {
    if (!form.pic) return [];
    return form.pic
      .split(/,|\bdan\b/i)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [form.pic]);

  async function refresh(msg) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    if (msg) toast.success(msg);
  }

  // Generate calendar days for current month view
  const calendarGrid = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month overflow days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, d);
      const dateStr = formatToYMD(dateObj);
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = formatToYMD(dateObj);
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Next month overflow days
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      const dateStr = formatToYMD(dateObj);
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonthDate]);

  // Group events by date string
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const evt of events) {
      if (!map[evt.eventDate]) {
        map[evt.eventDate] = [];
      }
      map[evt.eventDate].push(evt);
    }
    return map;
  }, [events]);

  // Events for selected date
  const selectedDateEvents = useMemo(() => {
    return eventsByDate[selectedDate] ?? [];
  }, [eventsByDate, selectedDate]);

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.eventDate >= todayStr)
      .sort(
        (a, b) =>
          a.eventDate.localeCompare(b.eventDate) ||
          (a.startTime || "").localeCompare(b.startTime || ""),
      )
      .slice(0, 10);
  }, [events, todayStr]);

  // Agenda yang persis jatuh pada H-3 hari dari hari ini
  const h3Events = useMemo(() => {
    return events.filter((e) => getDaysUntilEvent(e.eventDate) === 3);
  }, [events]);

  function prevMonth() {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1),
    );
  }

  function nextMonth() {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1),
    );
  }

  function goToToday() {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(formatToYMD(now));
  }

  function openAddModal(preselectedDate) {
    setEditingEvent(null);
    setForm({
      ...emptyEventForm,
      eventDate: preselectedDate || selectedDate || todayStr,
      createdBy: currentUser?.name || "Staff",
    });
    setIsPicDropdownOpen(false);
    setPicSearch("");
    setShowModal(true);
  }

  function openEditModal(evt) {
    setEditingEvent(evt);
    setForm({
      title: evt.title,
      eventDate: evt.eventDate,
      startTime: evt.startTime || "09:00",
      endTime: evt.endTime || "11:00",
      isAllDay: Boolean(evt.isAllDay),
      location: evt.location || "",
      pic: evt.pic || "",
      notes: evt.notes || "",
      createdBy: evt.createdBy || currentUser?.name || "Staff",
    });
    setIsPicDropdownOpen(false);
    setPicSearch("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!form.title.trim()) {
      return toast.error("Nama kegiatan wajib diisi");
    }
    if (!form.eventDate) {
      return toast.error("Tanggal kegiatan wajib diisi");
    }

    try {
      setIsSubmitting(true);
      if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, form);
        await refresh("Agenda berhasil diperbarui");
      } else {
        await createCalendarEvent({
          ...form,
          createdBy: currentUser?.name || "Staff",
        });
        await refresh("Agenda baru berhasil ditambahkan");
      }
      setShowModal(false);
      setEditingEvent(null);
      setForm(emptyEventForm);
    } catch (err) {
      console.error("Error saving calendar event:", err);
      toast.error(err?.message || "Gagal menyimpan agenda. Pastikan tabel calendar_events sudah dibuat di Supabase.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmDelete(evt) {
    setEventToDelete(evt);
  }

  async function handleDelete() {
    if (!eventToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteCalendarEvent(eventToDelete.id, eventToDelete.title);
      await refresh("Agenda dihapus");
      setEventToDelete(null);
    } catch {
      toast.error("Gagal menghapus agenda");
    } finally {
      setIsDeleting(false);
    }
  }

  function togglePicSelection(userName) {
    let currentPics = form.pic
      ? form.pic.split(/,|\bdan\b/i).map((p) => p.trim()).filter(Boolean)
      : [];

    if (currentPics.some((p) => p.toLowerCase() === userName.toLowerCase())) {
      currentPics = currentPics.filter(
        (p) => p.toLowerCase() !== userName.toLowerCase(),
      );
    } else {
      currentPics.push(userName);
    }
    setForm({ ...form, pic: currentPics.join(", ") });
  }

  function removePic(userName, e) {
    e.stopPropagation();
    let currentPics = selectedPicsList.filter(
      (p) => p.toLowerCase() !== userName.toLowerCase(),
    );
    setForm({ ...form, pic: currentPics.join(", ") });
  }

  async function handleSendDirectReminder(targetEvent) {
    if (!targetEvent) return;
    setIsSendingEmail(true);
    const toastId = toast.loading(`Mengirim notifikasi email otomatis untuk "${targetEvent.title}"...`);
    try {
      const recipients = resolveEventStaffRecipients(targetEvent, allUsers);
      const validRecipients = recipients.filter((r) => r.hasValidEmail);
      if (validRecipients.length === 0) {
        toast.error(`Tidak ada email staf valid untuk PIC: ${targetEvent.pic || "Belum diatur"}`, { id: toastId });
        return;
      }

      await sendEventMeetingReminder(targetEvent, recipients, false, senderEmail);
      const staffNames = validRecipients.map((r) => `${r.name} (${r.targetEmail})`).join(", ");
      toast.success(`Berhasil! Notifikasi email otomatis terkirim ke PIC: ${staffNames}`, {
        id: toastId,
        duration: 6000,
      });
      setReminderModalEvent(null);
    } catch (err) {
      toast.error(err?.message || "Gagal mengirim notifikasi email otomatis", { id: toastId });
    } finally {
      setIsSendingEmail(false);
    }
  }

  async function handleSendH3BannerEmails() {
    if (h3Events.length === 0) return;
    setIsSendingEmail(true);
    const toastId = toast.loading(`Mengirim notifikasi email otomatis untuk ${h3Events.length} agenda H-3...`);
    try {
      let totalSent = 0;
      const sentDetails = [];

      for (const evt of h3Events) {
        const recipients = resolveEventStaffRecipients(evt, allUsers);
        const validRecipients = recipients.filter((r) => r.hasValidEmail);
        if (validRecipients.length > 0) {
          await sendEventMeetingReminder(evt, recipients, false, senderEmail);
          totalSent += validRecipients.length;
          for (const r of validRecipients) {
            sentDetails.push(`${r.name} (${r.targetEmail})`);
          }
        }
      }

      if (totalSent > 0) {
        const uniqueRecipients = [...new Set(sentDetails)].join(", ");
        toast.success(`Berhasil! Notifikasi email H-3 terkirim otomatis ke ${totalSent} staf: ${uniqueRecipients}`, {
          id: toastId,
          duration: 6000,
        });
      } else {
        toast.warning("Tidak ditemukan email staf PIC yang terdaftar pada agenda H-3 ini.", { id: toastId });
      }
    } catch (err) {
      toast.error(err?.message || "Gagal mengirim notifikasi email otomatis", { id: toastId });
    } finally {
      setIsSendingEmail(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 shrink-0" />
            Kalender Kegiatan
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Jadwal kegiatan Bu Uma & agenda operasional kantor UmaraTax.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="secondary" onClick={goToToday} className="flex-1 sm:flex-initial text-xs sm:text-sm">
            Hari Ini
          </Button>
          <Button onClick={() => openAddModal()} className="flex-1 sm:flex-initial text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-1 shrink-0" />
            Tambah Agenda
          </Button>
        </div>
      </div>

      {/* Banner Peringatan Agenda H-3 Hari */}
      {h3Events.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 sm:p-4 text-xs sm:text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400">
              <BellRing className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Pengingat H-3 Meeting: {h3Events.length} Agenda Mendekati Jadwal
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Agenda {h3Events.map((e) => `"${e.title}"`).join(", ")} dijadwalkan dalam 3 hari ke depan. Siap kirim notifikasi email ke staf terkait.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSendH3BannerEmails}
            disabled={isSendingEmail}
            className="w-full sm:w-auto text-xs bg-amber-600 hover:bg-amber-700 text-white border-transparent gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSendingEmail ? "Mengirim Otomatis..." : "Kirim Notifikasi Email H-3"}</span>
          </Button>
        </div>
      )}

      {/* Main Layout: Calendar Grid + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Month Calendar Grid) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-3 sm:p-5">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {MONTH_NAMES[currentMonthDate.getMonth()]}{" "}
                {currentMonthDate.getFullYear()}
              </h2>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0"
                  onClick={prevMonth}
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0"
                  onClick={nextMonth}
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-2">
              {DAY_NAMES.map((day, idx) => (
                <div
                  key={day}
                  className={`text-[10px] sm:text-xs font-semibold py-1 sm:py-1.5 ${
                    idx === 0 || idx === 6
                      ? "text-rose-500 dark:text-rose-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarGrid.map((cell) => {
                const dayEvents = eventsByDate[cell.dateStr] || [];
                const isSelected = selectedDate === cell.dateStr;
                const isToday = todayStr === cell.dateStr;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => setSelectedDate(cell.dateStr)}
                    className={`min-h-[50px] sm:min-h-[95px] p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-500/10 ring-2 ring-indigo-500/30"
                        : cell.isCurrentMonth
                        ? "border-slate-200/80 bg-white dark:border-white/5 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-white/20"
                        : "border-slate-100 bg-slate-50/60 text-slate-400 dark:border-transparent dark:bg-slate-900/20 dark:text-slate-600"
                    }`}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] sm:text-xs font-semibold rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center ${
                          isToday
                            ? "bg-indigo-600 text-white font-bold"
                            : isSelected
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                            : ""
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Mobile dots indicator (hidden on tablet/desktop) */}
                    <div className="sm:hidden flex items-center justify-center gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400"
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="h-1 w-1 rounded-full bg-slate-400" />
                      )}
                    </div>

                    {/* Desktop & Tablet event title badges */}
                    <div className="hidden sm:block space-y-1 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt) => (
                        <div
                          key={evt.id}
                          className="truncate text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200/50 dark:bg-indigo-500/15 dark:text-indigo-200 dark:border-indigo-500/20 font-medium"
                          title={evt.title}
                        >
                          {evt.isAllDay ? "Seharian" : evt.startTime || ""} {evt.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-slate-400 font-medium text-center">
                          +{dayEvents.length - 2} lainnya
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Selected Day Events & Upcoming Panel */}
        <div className="space-y-6">
          {/* Selected Date Details */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/8 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-indigo-500" />
                  Agenda {selectedDate === todayStr ? "(Hari Ini)" : ""}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openAddModal(selectedDate)}
                className="text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah
              </Button>
            </div>

            {/* Selected Date Events List */}
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {selectedDateEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                  Tidak ada agenda pada tanggal ini.
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-indigo-600 dark:text-indigo-400"
                      onClick={() => openAddModal(selectedDate)}
                    >
                      + Tambah Agenda
                    </Button>
                  </div>
                </div>
              ) : (
                selectedDateEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-white/8 dark:bg-slate-800/40 space-y-2 group relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                          {evt.title}
                        </h4>
                        {getDaysUntilEvent(evt.eventDate) === 3 && (
                          <Badge tone="amber" className="text-[10px] px-1.5 py-0 font-medium">
                            H-3 Meeting
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendDirectReminder(evt);
                          }}
                          disabled={isSendingEmail}
                          className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors cursor-pointer"
                          title="Kirim Notifikasi Email H-3 Otomatis ke PIC"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(evt)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(evt)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Time & Location */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-500" />
                        {evt.isAllDay ? (
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">
                            Sepanjang Hari
                          </span>
                        ) : (
                          <span>
                            {evt.startTime} - {evt.endTime}
                          </span>
                        )}
                      </div>
                      {evt.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" />
                          <span>{evt.location}</span>
                        </div>
                      )}
                    </div>

                    {/* PIC tags */}
                    {evt.pic && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                        <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                          {evt.pic}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {evt.notes && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-white/5 flex items-start gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{evt.notes}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Upcoming Events List */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/8 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-500" />
                Kegiatan Mendatang
              </h3>
              <Badge tone="blue">{upcomingEvents.length} Agenda</Badge>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {upcomingEvents.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Belum ada agenda mendatang.
                </div>
              ) : (
                upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      setSelectedDate(evt.eventDate);
                      setCurrentMonthDate(new Date(evt.eventDate + "T00:00:00"));
                    }}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-indigo-300 dark:border-white/5 dark:hover:border-indigo-500/30 bg-white dark:bg-slate-900/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {evt.title}
                        </h5>
                        {getDaysUntilEvent(evt.eventDate) === 3 && (
                          <Badge tone="amber" className="text-[9px] px-1 py-0 shrink-0 font-medium">
                            H-3
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendDirectReminder(evt);
                          }}
                          disabled={isSendingEmail}
                          className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer"
                          title="Kirim Notifikasi Email H-3 Otomatis ke PIC"
                        >
                          <Mail className="h-3 w-3" />
                        </button>
                        <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                          {new Date(evt.eventDate + "T00:00:00").toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{evt.isAllDay ? "Seharian" : evt.startTime}</span>
                      {evt.location && <span>• {evt.location}</span>}
                      {evt.pic && (
                        <span className="truncate max-w-[120px] text-indigo-600 dark:text-indigo-400">
                          • {evt.pic}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Form Tambah / Edit Agenda */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg"
            >
              <Card className="p-0 overflow-hidden shadow-2xl border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/8 bg-slate-50/50 dark:bg-slate-800/50">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-indigo-500" />
                    {editingEvent ? "Edit Agenda Kegiatan" : "Tambah Agenda Baru"}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                  {/* Nama / Judul Kegiatan */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nama Kegiatan / Agenda *
                    </label>
                    <Input
                      required
                      placeholder="Contoh: Dinas Luar Bu Uma ke Sleman / Meeting SPT PT ABC"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>

                  {/* Tanggal & Waktu */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Tanggal *
                      </label>
                      <Input
                        type="date"
                        required
                        value={form.eventDate}
                        onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1 flex flex-col justify-end">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer h-9 px-3 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={form.isAllDay}
                          onChange={(e) => setForm({ ...form, isAllDay: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Sepanjang Hari (All Day)</span>
                      </label>
                    </div>
                  </div>

                  {!form.isAllDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Jam Mulai
                        </label>
                        <Input
                          type="time"
                          value={form.startTime}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Jam Selesai
                        </label>
                        <Input
                          type="time"
                          value={form.endTime}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Lokasi */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Lokasi / Tempat
                    </label>
                    <Input
                      placeholder="Contoh: Kantor Umara Lt. 2 / KPP Pratama Sleman / Google Meet"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </div>

                  {/* Multi-Select PIC Dropdown Model */}
                  <div className="space-y-1.5" ref={picDropdownRef}>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      PIC / Yang Terlibat (Pilih Staff & Owner)
                    </label>
                    
                    {/* Dropdown Trigger Box */}
                    <div className="relative">
                      <div
                        onClick={() => setIsPicDropdownOpen(!isPicDropdownOpen)}
                        className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm cursor-pointer transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex flex-wrap gap-1.5 items-center flex-1">
                          {selectedPicsList.length === 0 ? (
                            <span className="text-xs text-slate-400">
                              -- Klik untuk memilih Staff / Owner --
                            </span>
                          ) : (
                            selectedPicsList.map((name) => (
                              <span
                                key={name}
                                className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200/60 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
                              >
                                {name}
                                <button
                                  type="button"
                                  onClick={(e) => removePic(name, e)}
                                  className="hover:text-indigo-900 dark:hover:text-white"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 transition-transform ${
                            isPicDropdownOpen ? "rotate-180 text-indigo-600" : ""
                          }`}
                        />
                      </div>

                      {/* Dropdown Menu Popover */}
                      <AnimatePresence>
                        {isPicDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-800 p-2 space-y-2"
                          >
                            {/* Search input in dropdown */}
                            <div className="relative">
                              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Cari nama staff / owner..."
                                value={picSearch}
                                onChange={(e) => setPicSearch(e.target.value)}
                                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/60 outline-none focus:border-indigo-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            {/* List of Users */}
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {filteredPics.length === 0 ? (
                                <div className="text-center py-3 text-xs text-slate-400">
                                  Tidak ada staff dengan nama &quot;{picSearch}&quot;
                                </div>
                              ) : (
                                filteredPics.map((u) => {
                                  const isSelected = selectedPicsList.some(
                                    (p) => p.toLowerCase() === u.name.toLowerCase(),
                                  );

                                  return (
                                    <div
                                      key={u.id}
                                      onClick={() => togglePicSelection(u.name)}
                                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                                        isSelected
                                          ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-900 dark:text-indigo-200 font-semibold"
                                          : "hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                            isSelected
                                              ? "bg-indigo-600 border-indigo-600 text-white"
                                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                          }`}
                                        >
                                          {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                        <span>{u.name}</span>
                                      </div>
                                      <Badge
                                        tone={u.role === "Owner" ? "indigo" : "slate"}
                                        className="text-[10px] capitalize"
                                      >
                                        {u.role}
                                      </Badge>
                                    </div>
                                  );
                                })
                              )}

                              {/* Opsi Tambah Nama Kustom dari Kolom Pencarian */}
                              {picSearch.trim() &&
                                !availablePics.some(
                                  (u) =>
                                    u.name.toLowerCase() ===
                                    picSearch.trim().toLowerCase(),
                                ) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      togglePicSelection(picSearch.trim());
                                      setPicSearch("");
                                    }}
                                    className="w-full text-left p-2 rounded-lg text-xs bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-between transition-colors font-medium border border-dashed border-indigo-300 dark:border-indigo-500/30"
                                  >
                                    <span>
                                      + Tambahkan &quot;{picSearch.trim()}&quot; ke PIC
                                    </span>
                                    <Badge tone="blue" className="text-[10px]">
                                      Nama Baru
                                    </Badge>
                                  </button>
                                )}
                            </div>

                            {/* Manual typing fallback */}
                            <div className="pt-2 border-t border-slate-100 dark:border-white/8 flex items-center justify-between text-[11px] text-slate-500">
                              <span>
                                {selectedPicsList.length} orang terpilih
                              </span>
                              {selectedPicsList.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setForm({ ...form, pic: "" })}
                                  className="text-rose-500 hover:underline font-medium"
                                >
                                  Reset Pilihan
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Keterangan / Catatan */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Keterangan / Catatan Persiapan
                    </label>
                    <textarea
                      className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20"
                      placeholder="Catatan berkas yang perlu dibawa, agenda pembahasan, link gdrive, dll..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/8">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => setShowModal(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      loading={isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      {isSubmitting
                        ? "Menyimpan..."
                        : editingEvent
                          ? "Simpan Perubahan"
                          : "Tambah Agenda"}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Konfirmasi Hapus */}
      <AnimatePresence>
        {eventToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm"
            >
              <Card className="p-0 overflow-hidden shadow-2xl border-slate-200 dark:border-white/10">
                <div className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 mx-auto flex items-center justify-center">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Hapus Agenda?
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Apakah Anda yakin ingin menghapus agenda <br/>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">&quot;{eventToDelete.title}&quot;</span>?
                      <br/> Tindakan ini tidak dapat dibatalkan.
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-white/5 flex gap-3 justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => setEventToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    loading={isDeleting}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Notifikasi Email Agenda H-3 Ke Staff */}
      <AnimatePresence>
        {reminderModalEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg my-auto"
            >
              <Card className="p-0 overflow-hidden shadow-2xl border-slate-200 dark:border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/8 bg-slate-50/70 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Kirim Notifikasi Email Agenda
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Pengingat H-3 hari ke staf yang terlibat
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReminderModalEvent(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                  {/* Status Banner H-3 */}
                  {(() => {
                    const daysLeft = getDaysUntilEvent(reminderModalEvent.eventDate);
                    return (
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 flex items-center gap-2.5">
                        <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          {daysLeft === 3 ? (
                            <strong>🎯 Tepat H-3 Hari: Agenda ini berlangsung dalam 3 hari ke depan.</strong>
                          ) : daysLeft > 0 ? (
                            <span>Agenda ini berlangsung dalam <strong>{daysLeft} hari</strong> ke depan.</span>
                          ) : daysLeft === 0 ? (
                            <span>Agenda ini berlangsung <strong>HARI INI</strong>.</span>
                          ) : (
                            <span>Agenda ini telah selesai.</span>
                          )}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Ringkasan Agenda */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-white/8 dark:bg-white/4 space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {reminderModalEvent.title}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                        <span>
                          {new Date(reminderModalEvent.eventDate + "T00:00:00").toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-indigo-500" />
                        <span>
                          {reminderModalEvent.isAllDay
                            ? "Sepanjang Hari"
                            : `${reminderModalEvent.startTime || "09:00"} - ${reminderModalEvent.endTime || "Selesai"}`}
                        </span>
                      </div>
                      {reminderModalEvent.location && (
                        <div className="flex items-center gap-1.5 sm:col-span-2">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" />
                          <span>{reminderModalEvent.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Daftar Staf Penerima Notifikasi */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Daftar Staf Terlibat & Alamat Email Tujuan</span>
                      </label>
                    </div>

                    {(() => {
                      const recipients = resolveEventStaffRecipients(reminderModalEvent, allUsers);
                      if (recipients.length === 0) {
                        return (
                          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs text-slate-500 dark:border-white/5 dark:bg-white/2 text-center">
                            Belum ada nama PIC/staf yang ditentukan pada agenda ini.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {recipients.map((r) => (
                            <div
                              key={r.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-slate-200/80 bg-white dark:border-white/8 dark:bg-slate-900/60 gap-1.5"
                            >
                              <div>
                                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                                  {r.name}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  {r.targetEmail}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {r.isPersonalEmail ? (
                                  <Badge tone="green" className="text-[10px]">
                                    Email Pribadi
                                  </Badge>
                                ) : r.hasValidEmail ? (
                                  <Badge tone="blue" className="text-[10px]">
                                    Email Akun
                                  </Badge>
                                ) : (
                                  <Badge tone="red" className="text-[10px]">
                                    Belum Ada Email
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Preview Pesan Draf Email */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Isi Draf Notifikasi Email:
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const { bodyText } = buildMeetingEmailTemplate(reminderModalEvent);
                          navigator.clipboard.writeText(bodyText);
                          toast.success("Draf teks pengingat disalin ke clipboard!");
                        }}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Salin Teks</span>
                      </button>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                      {buildMeetingEmailTemplate(reminderModalEvent).bodyText}
                    </div>
                  </div>

                  {/* Pengaturan Email Pengirim untuk MailerSend */}
                  <div className="space-y-1.5 p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                        Email Pengirim (Sender Domain):
                      </label>
                      <span className="text-[10px] text-amber-700/80 dark:text-amber-400">
                        Dashboard MailerSend &gt; Domains
                      </span>
                    </div>
                    <Input
                      type="text"
                      placeholder="Contoh: MS_xxxx@trial-xxxx.mailersend.net atau notif@umara.tax"
                      value={senderEmail}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSenderEmail(val);
                        localStorage.setItem("umara_email", val.trim());
                      }}
                      className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
                    />
                    <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                      Wajib diisi sesuai alamat sender / trial domain di dashboard MailerSend Anda agar pengiriman 1-klik di latar belakang berhasil.
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/60 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-2 justify-end items-center">
                  <Button
                    variant="secondary"
                    onClick={() => setReminderModalEvent(null)}
                    disabled={isSendingEmail}
                    className="w-full sm:w-auto"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={() => handleSendDirectReminder(reminderModalEvent)}
                    disabled={isSendingEmail}
                    loading={isSendingEmail}
                    className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white border-transparent gap-2 cursor-pointer shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSendingEmail ? "Mengirim Otomatis..." : "Kirim Notifikasi Otomatis (1-Klik)"}</span>
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
