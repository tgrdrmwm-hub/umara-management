import {
  Calendar,
  Plus,
  X,
  History,
  Clock,
  Moon,
  AlertTriangle,
  Award,
  CheckCircle2,
  Users,
  Check,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { taxServiceDefinitions } from "../constants/taxServices";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";
import { createTask, deleteTask, updateTask, uploadInvoice } from "../services/database";
import { useAuth } from "../hooks/useAuth";

const columns = [
  {
    key: "todo",
    label: "To Do",
    color: "bg-slate-100 dark:bg-white/5",
    dot: "bg-slate-400",
  },
  {
    key: "progress",
    label: "In Progress",
    color: "bg-blue-50 dark:bg-blue-500/5",
    dot: "bg-blue-500",
  },
  {
    key: "done",
    label: "Done",
    color: "bg-emerald-50 dark:bg-emerald-500/5",
    dot: "bg-emerald-500",
  },
];

const emptyTask = {
  title: "",
  client: "",
  pic: "",
  deadline: "",
  status: "todo",
  points: 1,
  notes: "",
  is_overtime: false,
};

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTaskPics(picString) {
  if (!picString) return [];
  return picString
    .split(/[,/&\-–—]|\bdan\b/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function isPicSelected(picString, userName) {
  if (!picString || !userName) return false;
  const target = userName.toLowerCase().trim();
  const tokens = picString
    .split(/[,/&\-–—]|\bdan\b/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return tokens.some((token) => {
    if (token === target) return true;
    const tokenWords = token.split(/\s+/);
    if (tokenWords.includes(target)) return true;
    const targetWords = target.split(/\s+/);
    if (targetWords.includes(token)) return true;
    if (tokenWords.some((tw) => targetWords.includes(tw) && tw.length > 2)) return true;
    return false;
  });
}

export function resolveClientPics(clientPic, users = []) {
  if (!clientPic) return "";
  const staffUsers = (users || []).filter(
    (u) =>
      u.role !== "owner" &&
      u.name.toLowerCase() !== "tegar" &&
      u.name.toLowerCase() !== "owner" &&
      u.name.toLowerCase() !== "magang" &&
      u.role !== "magang"
  );

  const matched = staffUsers.filter((u) => isPicSelected(clientPic, u.name));
  if (matched.length > 0) {
    return matched.map((u) => u.name).join(", ");
  }
  return clientPic;
}

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20";

const badgeToneMap = {
  todo: "slate",
  progress: "blue",
  review: "amber",
  done: "green",
};

export function parseTaskApprovals(notes) {
  if (!notes) return { start: [], done: [] };
  try {
    const match = notes.match(/<!-- APPROVALS: (.*?) -->/);
    if (match && match[1]) {
      const parsed = JSON.parse(match[1]);
      return {
        start: Array.isArray(parsed.start) ? parsed.start : [],
        done: Array.isArray(parsed.done) ? parsed.done : [],
      };
    }
  } catch {}
  return { start: [], done: [] };
}

export function encodeTaskApprovals(notes, approvals) {
  const cleanNotes = (notes || "").replace(/<!-- APPROVALS: .*? -->/g, "").trim();
  const metaStr = `<!-- APPROVALS: ${JSON.stringify(approvals)} -->`;
  return cleanNotes ? `${cleanNotes}\n${metaStr}` : metaStr;
}

export function TasksPage() {
  const { data } = useAppData();
  const { user } = useAuth();
  const isAdmin = ["owner", "developer", "manager", "admin"].includes(
    user?.role,
  );
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTask);
  const [showHistory, setShowHistory] = useState(false);
  const [completingTask, setCompletingTask] = useState(null);
  const [completionOvertime, setCompletionOvertime] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [startingTask, setStartingTask] = useState(null);
  const [approvedStartPics, setApprovedStartPics] = useState([]);
  const [approvedCompletePics, setApprovedCompletePics] = useState([]);
  const [mobileActiveCol, setMobileActiveCol] = useState("all");

  const tasks = data?.tasks ?? [];
  const activityLogs = data?.activityLogs ?? [];
  const todayStr = getTodayDateString();

  const categories = (() => {
    if (!data?.taxServices || data.taxServices.length === 0) return taxServiceDefinitions;
    const grouped = data.taxServices.reduce((acc, service) => {
      if (!acc[service.category]) acc[service.category] = [];
      acc[service.category].push(service);
      return acc;
    }, {});
    
    return Object.entries(grouped).map(([category, services]) => ({
      category,
      services: services.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  })();

  async function refresh(message) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(message);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) return toast.error("Judul task wajib diisi");
    try {
      if (editing) {
        const currentApprovals = parseTaskApprovals(editing.notes);
        const mergedNotes = encodeTaskApprovals(form.notes, currentApprovals);
        await updateTask(editing.id, { ...form, notes: mergedNotes }, editing.status);
        setEditing(null);
        await refresh("Task diperbarui");
      } else {
        await createTask(form);
        await refresh("Task ditambahkan");
      }
      setForm(emptyTask);
      setShowForm(false);
    } catch {
      toast.error("Gagal menyimpan task");
    }
  }

  function startEdit(task) {
    setEditing(task);
    setForm({
      title: task.title,
      client: task.client,
      pic: task.pic,
      deadline: task.deadline,
      status: task.status,
      points: task.points || 1,
      notes: (task.notes || "").replace(/<!-- APPROVALS: .*? -->/g, "").trim(),
      is_overtime: Boolean(task.is_overtime),
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyTask);
  }

  function handleStartTask(task) {
    const pics = getTaskPics(task.pic);
    if (pics.length >= 2) {
      setStartingTask(task);
      const existingApprovals = parseTaskApprovals(task.notes).start;
      setApprovedStartPics(existingApprovals);
    } else {
      const isPicMatch = !task.pic || isPicSelected(task.pic, user?.name);
      if (!isPicMatch && !isAdmin) {
        return toast.error(`Hanya PIC (${task.pic}) yang dapat memulai tugas ini.`);
      }
      void updateTask(
        task.id,
        { ...task, status: "progress" },
        task.status,
      ).then(() => refresh("Task dipindahkan ke In Progress"));
    }
  }

  async function saveStartApprovals() {
    if (!startingTask) return;
    try {
      const currentApprovals = parseTaskApprovals(startingTask.notes);
      const newNotes = encodeTaskApprovals(startingTask.notes, {
        ...currentApprovals,
        start: approvedStartPics,
      });

      await updateTask(
        startingTask.id,
        {
          ...startingTask,
          notes: newNotes,
        },
        startingTask.status,
      );
      await refresh(
        `Persetujuan mulai tugas disimpan (${approvedStartPics.length}/${getTaskPics(startingTask.pic).length} PIC siap)!`,
      );
      setStartingTask(null);
      setApprovedStartPics([]);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan persetujuan: " + (err?.message || "Unknown error"));
    }
  }

  async function confirmStartTask(e) {
    e.preventDefault();
    if (!startingTask) return;
    const pics = getTaskPics(startingTask.pic);
    if (
      pics.length >= 2 &&
      !pics.every((p) => approvedStartPics.includes(p.toLowerCase()))
    ) {
      return toast.error(
        "Kedua PIC yang bertanggung jawab wajib memberikan persetujuan.",
      );
    }

    try {
      const currentApprovals = parseTaskApprovals(startingTask.notes);
      const newNotes = encodeTaskApprovals(startingTask.notes, {
        ...currentApprovals,
        start: approvedStartPics,
      });

      await updateTask(
        startingTask.id,
        {
          ...startingTask,
          status: "progress",
          notes: newNotes,
        },
        startingTask.status,
      );
      await refresh(
        pics.length >= 2
          ? `Task resmi dimulai dengan persetujuan kedua PIC (${pics.join(", ")})!`
          : "Task dipindahkan ke In Progress",
      );
      setStartingTask(null);
      setApprovedStartPics([]);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memulai task: " + (err?.message || "Unknown error"));
    }
  }

  function openCompleteModal(task) {
    const pics = getTaskPics(task.pic);
    const isPicMatch = pics.length === 0 || pics.some((p) => isPicSelected(p, user?.name));
    if (!isPicMatch && !isAdmin) {
      return toast.error(`Hanya PIC (${task.pic}) yang dapat menyelesaikan tugas ini.`);
    }
    const now = new Date();
    const isAfterHours =
      now.getHours() >= 17 ||
      now.getHours() < 8 ||
      now.getDay() === 0 ||
      now.getDay() === 6;
    setCompletingTask(task);
    setInvoiceFile(null);
    const existingDoneApprovals = parseTaskApprovals(task.notes).done;
    setApprovedCompletePics(existingDoneApprovals);
    setCompletionOvertime(Boolean(task.is_overtime || isAfterHours));
  }

  async function saveCompleteApprovals() {
    if (!completingTask) return;
    try {
      let invoiceUrl = completingTask.invoice_url;
      if (invoiceFile) {
        setIsUploading(true);
        invoiceUrl = await uploadInvoice(invoiceFile, completingTask.id);
      }

      const currentApprovals = parseTaskApprovals(completingTask.notes);
      const newNotes = encodeTaskApprovals(completingTask.notes, {
        ...currentApprovals,
        done: approvedCompletePics,
      });

      await updateTask(
        completingTask.id,
        {
          ...completingTask,
          invoice_url: invoiceUrl,
          notes: newNotes,
        },
        completingTask.status,
      );
      await refresh(
        `Persetujuan penyelesaian disimpan (${approvedCompletePics.length}/${getTaskPics(completingTask.pic).length} PIC setuju)!`,
      );
      setCompletingTask(null);
      setInvoiceFile(null);
      setApprovedCompletePics([]);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan persetujuan: " + (err?.message || "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  }

  async function confirmCompleteTask(e) {
    e.preventDefault();
    if (!invoiceFile && !completingTask.invoice_url) {
      return toast.error("File invoice bukti pekerjaan wajib diunggah.");
    }
    const pics = getTaskPics(completingTask.pic);
    if (
      pics.length >= 2 &&
      !pics.every((p) => approvedCompletePics.includes(p.toLowerCase()))
    ) {
      return toast.error(
        "Kedua PIC yang bertanggung jawab wajib menyetujui penyelesaian tugas.",
      );
    }
    
    setIsUploading(true);
    try {
      let invoiceUrl = completingTask.invoice_url;
      if (invoiceFile) {
        invoiceUrl = await uploadInvoice(invoiceFile, completingTask.id);
      }

      const currentApprovals = parseTaskApprovals(completingTask.notes);
      const newNotes = encodeTaskApprovals(completingTask.notes, {
        ...currentApprovals,
        done: approvedCompletePics,
      });
      
      const res = await updateTask(
        completingTask.id,
        {
          ...completingTask,
          status: "done",
          invoice_url: invoiceUrl,
          notes: newNotes,
          is_overtime: completionOvertime,
        },
        completingTask.status,
        { isOvertime: completionOvertime }
      );
      
      await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });

      if (res?.isOverdue) {
        toast.warning(
          `Task diselesaikan lewat tenggat waktu (${completingTask.deadline}). Tidak mendapat poin reward (0 pt).`,
        );
      } else if (res?.earnedPoints > 0) {
        toast.success(
          pics.length >= 2
            ? `Task selesai dengan persetujuan kedua PIC (${pics.join(", ")})! Poin berhasil diberikan.`
            : `Task diselesaikan tepat waktu! +${res.earnedPoints} poin berhasil diberikan ke PIC.`,
        );
      } else {
        toast.success("Task berhasil diselesaikan.");
      }

      setCompletingTask(null);
      setInvoiceFile(null);
      setApprovedCompletePics([]);
    } catch (err) {
      console.error(err);
      toast.error("Gagal: " + (err?.message || "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Task Board
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Pekerjaan bulanan reguler terhitung dalam gaji pokok. Tambahan poin reward diperoleh apabila tugas diselesaikan tepat waktu dan dikerjakan secara lembur/ekstra.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="secondary" onClick={() => setShowHistory(true)} className="flex-1 sm:flex-initial text-xs sm:text-sm">
            <History className="h-4 w-4" />
            <span>Riwayat</span>
          </Button>
          <Button onClick={() => { setEditing(null); setForm(emptyTask); setShowForm(true); }} className="flex-1 sm:flex-initial text-xs sm:text-sm">
            <Plus className="h-4 w-4" />
            <span>Tambah Task</span>
          </Button>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg max-h-[80vh] flex flex-col p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" />
                Riwayat Aktivitas Task
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activityLogs.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-10">
                  Belum ada riwayat aktivitas.
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="relative pl-6 pb-4 border-l border-slate-200 dark:border-white/10 last:pb-0 last:border-transparent"
                  >
                    <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {log.user_name}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {log.action}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Form modal/card */}
      {showForm && (
        <Card className="p-4 border-indigo-200 dark:border-indigo-500/20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/8">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {editing ? "Edit Task" : "Tambah Task Baru"}
            </h2>
            <button
              onClick={closeForm}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Judul Task
              </label>
              <Input
                placeholder="Contoh: Rekonsiliasi Faktur Pajak PT ABC"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Client
              </label>
              <Input
                placeholder="Nama client"
                list="task-clients-datalist"
                value={form.client}
                onChange={(e) => {
                  const val = e.target.value;
                  const matchedClient = (data?.clients || []).find(
                    (c) => c.name.toLowerCase().trim() === val.toLowerCase().trim(),
                  );
                  if (matchedClient && matchedClient.pic && !form.pic) {
                    const autoPic = resolveClientPics(matchedClient.pic, data?.users);
                    setForm({ ...form, client: val, pic: autoPic });
                  } else {
                    setForm({ ...form, client: val });
                  }
                }}
              />
              <datalist id="task-clients-datalist">
                {(data?.clients || []).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.pic ? `PIC: ${c.pic}` : ""}
                  </option>
                ))}
              </datalist>

              {/* Quick service chips for detected client */}
              {(() => {
                const matchedClient = (data?.clients || []).find(
                  (c) => c.name.toLowerCase().trim() === form.client.toLowerCase().trim(),
                );
                if (!matchedClient) return null;
                const activeSrvs = [];
                if (matchedClient.pph_25) activeSrvs.push("PPh 25");
                if (matchedClient.pph_final) activeSrvs.push("PPh Final");
                if (matchedClient.ppn) activeSrvs.push("PPN");
                if (matchedClient.pph_21) activeSrvs.push("PPh 21/26");
                if ((matchedClient.kontrak || "").toLowerCase().includes("tahun")) {
                  const isBadan = (matchedClient.type || "Badan").toLowerCase().includes("badan");
                  activeSrvs.push(isBadan ? "SPT Badan" : "SPT Orang Pribadi");
                }
                if (activeSrvs.length === 0) return null;

                return (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Layanan aktif klien:
                    </span>
                    {activeSrvs.map((srv) => (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            title: `[${srv}] ${matchedClient.name}`,
                          }));
                        }}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 transition"
                      >
                        + {srv}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Layanan & Reward Poin Lembur
              </label>
              <select
                className={selectClass}
                value={form.points}
                onChange={(e) =>
                  setForm({ ...form, points: Number(e.target.value) })
                }
              >
                <option value={1}>Standar Lembur (+1 pt)</option>
                {categories.map((cat) => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.services.map((svc) => (
                      <option key={svc.name} value={svc.basePoints}>
                        {svc.name} (+{svc.basePoints} pts)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Deadline
              </label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
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
                {columns.map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Overtime Task Checkbox */}
            <div className="sm:col-span-2 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_overtime)}
                  onChange={(e) => setForm({ ...form, is_overtime: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Moon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    Tugas Lembur / Ekstra (Reward Poin Ketepatan Waktu)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tugas bulanan rutin dihitung dalam gaji pokok reguler (0 poin). Centang ini jika tugas dikerjakan saat lembur/ekstra agar mendapatkan poin bila selesai tepat waktu.
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  PIC (Pilih yang bertugas)
                </label>
                {form.pic && (
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    Terpilih: {form.pic}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {data?.users?.filter(u => u.role !== 'owner' && u.name.toLowerCase() !== 'tegar' && u.name.toLowerCase() !== 'owner' && u.name.toLowerCase() !== 'magang' && u.role !== 'magang').map((user) => {
                  const isSelected = isPicSelected(form.pic, user.name);
                  return (
                    <label
                      key={user.id}
                      className={`cursor-pointer select-none rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isSelected}
                        onChange={(e) => {
                          let currentPics = form.pic
                            ? form.pic
                                .split(/[,/&\-–—]|\bdan\b/i)
                                .map((p) => p.trim())
                                .filter(Boolean)
                            : [];
                            
                          if (e.target.checked) {
                            if (!isPicSelected(form.pic, user.name)) {
                              currentPics.push(user.name);
                            }
                          } else {
                            currentPics = currentPics.filter(
                              (p) => !isPicSelected(p, user.name),
                            );
                          }
                          setForm({ ...form, pic: currentPics.join(", ") });
                        }}
                      />
                      {user.name}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Catatan
              </label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20"
                placeholder="Catatan tambahan..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">
                {editing ? "Simpan Perubahan" : "Tambah Task"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Modal Mulai Kerjakan (Dual PIC Verification) */}
      {startingTask && (() => {
        const pics = getTaskPics(startingTask.pic);
        const isAllApproved = pics.length < 2 || pics.every((p) => approvedStartPics.includes(p.toLowerCase()));

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
            <Card className="w-full max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-xl border-slate-200 dark:border-white/10 rounded-2xl">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-white/8 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Mulai Pengerjaan Tugas (On Process)
                  </h2>
                  <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                    {startingTask.title}
                  </p>
                </div>
                <button
                  onClick={() => { setStartingTask(null); setApprovedStartPics([]); }}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={confirmStartTask} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900 dark:border-blue-500/20 dark:bg-blue-950/30 dark:text-blue-200">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    Penanggung Jawab Bersama ({pics.length} PIC)
                  </div>
                  <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                    Tugas ini didelegasikan kepada <strong>{pics.join(" & ")}</strong>. Status tidak bisa diubah oleh 1 orang saja; diperlukan konfirmasi kesiapan dari kedua PIC untuk memulai.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Konfirmasi Kedua PIC *
                    </label>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      approvedStartPics.length === pics.length
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}>
                      {approvedStartPics.length}/{pics.length} PIC Siap
                    </span>
                  </div>

                  <div className="space-y-2">
                    {pics.map((picName) => {
                      const isPicMatch = isPicSelected(picName, user?.name);
                      const canToggle = isPicMatch || isAdmin;
                      const isChecked = approvedStartPics.includes(picName.toLowerCase());
                      return (
                        <label
                          key={picName}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition select-none ${
                            !canToggle
                              ? "cursor-not-allowed bg-slate-50/60 border-slate-200 dark:bg-slate-900/30 dark:border-white/5 opacity-80"
                              : "cursor-pointer"
                          } ${
                            isChecked
                              ? "border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40 shadow-xs"
                              : canToggle
                              ? "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-slate-800/60"
                              : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!canToggle}
                            onChange={(e) => {
                              if (!canToggle) return;
                              if (e.target.checked) {
                                setApprovedStartPics([...approvedStartPics, picName.toLowerCase()]);
                              } else {
                                setApprovedStartPics(
                                  approvedStartPics.filter((p) => p !== picName.toLowerCase())
                                );
                              }
                            }}
                            className={`mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${
                              !canToggle ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                {picName}
                                {isPicMatch && (
                                  <span className="text-[10px] font-normal text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/80 px-1 rounded">
                                    (Anda)
                                  </span>
                                )}
                                {isAdmin && !isPicMatch && (
                                  <span className="text-[10px] font-normal text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 px-1 rounded">
                                    (Admin)
                                  </span>
                                )}
                              </span>
                              {isChecked ? (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  Siap Mengerjakan
                                </span>
                              ) : canToggle ? (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded font-medium">
                                  Klik untuk Konfirmasi
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                  <Lock className="h-2.5 w-2.5" />
                                  Hanya PIC {picName}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              {isChecked
                                ? `${picName} telah menyatakan mulai mengerjakan tugas ini.`
                                : canToggle
                                ? `Saya (${picName}) menyatakan siap mulai mengerjakan tugas ini.`
                                : `Menunggu ${picName} masuk dengan akunnya untuk mencentang konfirmasi kesiapan.`}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => { setStartingTask(null); setApprovedStartPics([]); }}
                    className="w-full sm:flex-1 text-xs sm:text-sm"
                  >
                    Batal
                  </Button>
                  {!isAllApproved ? (
                    <Button 
                      type="button" 
                      onClick={saveStartApprovals}
                      className="w-full sm:flex-1 font-semibold text-xs sm:text-sm"
                    >
                      Simpan Konfirmasi ({approvedStartPics.length}/{pics.length} PIC)
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      className="w-full sm:flex-1 font-semibold bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
                    >
                      Mulai Kerjakan ({pics.length}/{pics.length} PIC Siap)
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </div>
        );
      })()}

      {/* Modal Upload Invoice Selesai Task */}
      {completingTask && (() => {
        const isOverdue = Boolean(completingTask.deadline && completingTask.deadline < todayStr);
        const pics = getTaskPics(completingTask.pic);
        const isAllApproved = pics.length < 2 || pics.every((p) => approvedCompletePics.includes(p.toLowerCase()));

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
            <Card className="w-full max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-xl border-slate-200 dark:border-white/10 rounded-2xl">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-white/8 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Konfirmasi Penyelesaian Task
                  </h2>
                  <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                    {completingTask.title}
                  </p>
                </div>
                <button
                  onClick={() => { setCompletingTask(null); setInvoiceFile(null); setApprovedCompletePics([]); }}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={confirmCompleteTask} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Status Evaluation Card */}
                {isOverdue ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                    <div>
                      <div className="font-semibold text-rose-900 dark:text-rose-200">
                        Lewat Batas Tenggat Waktu ({completingTask.deadline})
                      </div>
                      <p className="mt-0.5 text-[11px] text-rose-600 dark:text-rose-400">
                        Sesuai aturan, tugas yang diselesaikan melebihi tenggat waktu <strong>tidak mendapatkan reward poin (0 pt)</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 flex items-start gap-2.5">
                    <Award className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="font-semibold text-emerald-900 dark:text-emerald-200">
                        Selesai Tepat Waktu (+{completingTask.points || 0.25} Poin)
                      </div>
                      <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                        Diselesaikan sebelum/pada batas tenggat waktu! PIC <strong>{completingTask.pic || "Staff"}</strong> akan menerima tambahan <strong>+{completingTask.points || 0.25} poin</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Overtime Toggle */}
                <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-slate-800/80 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={completionOvertime}
                    onChange={(e) => setCompletionOvertime(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="text-xs">
                    <span className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Moon className="h-3.5 w-3.5 text-amber-500" />
                      Dikerjakan saat Lembur / Di Luar Jam Kantor
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Jam kantor normal: 08:00–17:00 (Senin–Jumat). Centang jika pengerjaan dilakukan saat lembur/ekstra.
                    </p>
                  </div>
                </label>

                {/* Persetujuan Kedua PIC (jika >= 2 PIC) */}
                {pics.length >= 2 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        Persetujuan Kedua PIC Penanggung Jawab *
                      </label>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        approvedCompletePics.length === pics.length
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}>
                        {approvedCompletePics.length}/{pics.length} PIC Setuju
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tugas ini tidak bisa diselesaikan oleh 1 orang saja. Kedua PIC wajib memverifikasi dan menyetujui hasil pekerjaan:
                    </p>

                    <div className="space-y-2">
                      {pics.map((picName) => {
                        const isPicMatch = isPicSelected(picName, user?.name);
                        const canToggle = isPicMatch || isAdmin;
                        const isChecked = approvedCompletePics.includes(picName.toLowerCase());
                        return (
                          <label
                            key={picName}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border transition select-none ${
                              !canToggle
                                ? "cursor-not-allowed bg-slate-50/60 border-slate-200 dark:bg-slate-900/30 dark:border-white/5 opacity-80"
                                : "cursor-pointer"
                            } ${
                              isChecked
                                ? "border-emerald-600 bg-emerald-50/70 dark:border-emerald-500 dark:bg-emerald-950/40 shadow-xs"
                                : canToggle
                                ? "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-slate-800/60"
                                : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!canToggle}
                              onChange={(e) => {
                                if (!canToggle) return;
                                if (e.target.checked) {
                                  setApprovedCompletePics([...approvedCompletePics, picName.toLowerCase()]);
                                } else {
                                  setApprovedCompletePics(
                                    approvedCompletePics.filter((p) => p !== picName.toLowerCase())
                                  );
                                }
                              }}
                              className={`mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 ${
                                !canToggle ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  {picName}
                                  {isPicMatch && (
                                    <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-1 rounded">
                                      (Anda)
                                    </span>
                                  )}
                                  {isAdmin && !isPicMatch && (
                                    <span className="text-[10px] font-normal text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 px-1 rounded">
                                      (Admin)
                                    </span>
                                  )}
                                </span>
                                {isChecked ? (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Disetujui
                                  </span>
                                ) : canToggle ? (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded font-medium">
                                    Klik untuk Menyetujui
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                    <Lock className="h-2.5 w-2.5" />
                                    Hanya PIC {picName}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                {isChecked
                                  ? `${picName} telah memeriksa hasil pekerjaan & menyetujui tugas selesai.`
                                  : canToggle
                                  ? `Saya (${picName}) telah memeriksa hasil pekerjaan & menyetujui tugas ini selesai.`
                                  : `Menunggu ${picName} masuk dengan akunnya untuk menyetujui hasil pekerjaan.`}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Invoice Upload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      File Bukti Invoice / Dokumen Final {completingTask.invoice_url ? "(Sudah Ada)" : "(Wajib)"}
                    </label>
                    {completingTask.invoice_url && (
                      <a
                        href={completingTask.invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 dark:text-indigo-400 font-medium"
                      >
                        ✓ Dokumen Tersimpan
                      </a>
                    )}
                  </div>
                  <input
                    type="file"
                    required={!completingTask.invoice_url}
                    accept=".pdf,image/*"
                    onChange={(e) => setInvoiceFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-500/20 dark:file:text-indigo-300 dark:hover:file:bg-indigo-500/30"
                  />
                  <p className="text-[11px] text-slate-400">
                    {completingTask.invoice_url
                      ? "File bukti sudah diunggah. Unggah file baru hanya jika ingin menggantinya."
                      : "Unggah faktur/dokumen hasil pengerjaan sebagai bukti validasi."}
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => { setCompletingTask(null); setInvoiceFile(null); setApprovedCompletePics([]); }}
                    className="w-full sm:flex-1 text-xs sm:text-sm"
                    disabled={isUploading}
                  >
                    Batal
                  </Button>
                  {pics.length >= 2 && !isAllApproved ? (
                    <Button 
                      type="button" 
                      onClick={saveCompleteApprovals}
                      className="w-full sm:flex-1 font-semibold text-xs sm:text-sm"
                      disabled={isUploading}
                    >
                      {isUploading
                        ? "Menyimpan..."
                        : `Simpan Persetujuan (${approvedCompletePics.length}/${pics.length} PIC)`}
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      className="w-full sm:flex-1 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm"
                      disabled={isUploading || (!invoiceFile && !completingTask.invoice_url) || !isAllApproved}
                    >
                      {isUploading
                        ? "Mengunggah..."
                        : !invoiceFile && !completingTask.invoice_url
                        ? "Unggah Bukti Dahulu"
                        : pics.length >= 2
                        ? `Konfirmasi Selesai (${pics.length}/${pics.length} PIC)`
                        : "Konfirmasi Selesai"}
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </div>
        );
      })()}

      {/* Mobile Kanban Tab Selector */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 md:hidden overflow-x-auto no-scrollbar border border-slate-200/60 dark:border-white/5">
        <button
          type="button"
          onClick={() => setMobileActiveCol("all")}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all text-center ${
            mobileActiveCol === "all"
              ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          Semua ({tasks.length})
        </button>
        {columns.map((col) => {
          const count = tasks.filter(
            (t) => t.status === col.key || (col.key === "progress" && t.status === "review")
          ).length;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => setMobileActiveCol(col.key)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all text-center flex items-center justify-center gap-1 ${
                mobileActiveCol === col.key
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
              <span>{col.label}</span>
              <span className="text-[10px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Kanban columns */}
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => {
          const colTasks = tasks.filter(
            (t) => t.status === col.key || (col.key === "progress" && t.status === "review")
          );
          return (
            <div
              key={col.key}
              className={`rounded-xl border border-slate-200/80 dark:border-white/8 ${col.color} p-3 ${
                mobileActiveCol !== "all" && mobileActiveCol !== col.key ? "hidden md:block" : "block"
              }`}
            >
              {/* Column header */}
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {col.label}
                  </h2>
                </div>
                <Badge tone={badgeToneMap[col.key]}>{colTasks.length}</Badge>
              </div>

              {/* Task cards */}
              <div className="space-y-2">
                {colTasks.length === 0 && (
                  <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400 dark:border-white/8">
                    Tidak ada task
                  </div>
                )}
                {colTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="p-3 shadow-none hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                        {task.title}
                      </h3>
                      <div className="shrink-0 flex items-center gap-1">
                        {task.is_overtime && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                            <Moon className="h-2.5 w-2.5" /> Lembur
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                          +{task.points || 0.25} pt
                        </span>
                      </div>
                    </div>
                    {task.client && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {task.client}
                      </p>
                    )}
                    {task.deadline && (
                      <div className={`mt-2 flex items-center gap-1 text-xs ${
                        col.key !== "done" && task.deadline < todayStr
                          ? "text-rose-600 dark:text-rose-400 font-semibold"
                          : "text-slate-400"
                      }`}>
                        {col.key !== "done" && task.deadline < todayStr ? (
                          <AlertTriangle className="h-3 w-3 text-rose-500" />
                        ) : (
                          <Calendar className="h-3 w-3" />
                        )}
                        <span>{task.deadline}</span>
                        {col.key !== "done" && task.deadline < todayStr && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1 rounded dark:bg-rose-500/20 dark:text-rose-300">
                            Terlambat
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      {task.pic && (() => {
                        const pics = getTaskPics(task.pic);
                        const isMultiPic = pics.length >= 2;
                        const approvals = parseTaskApprovals(task.notes);
                        const startCount = approvals.start.length;
                        const doneCount = approvals.done.length;

                        return (
                          <div className="space-y-1 max-w-[200px]">
                            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {isMultiPic ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                  <Users className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{pics.length} PIC: {pics.join(", ")}</span>
                                </span>
                              ) : (
                                task.pic
                              )}
                            </div>
                            {isMultiPic && col.key === "todo" && startCount > 0 && (
                              <div className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/60 font-medium">
                                ⏳ {startCount}/{pics.length} PIC Siap ({approvals.start.join(", ")})
                              </div>
                            )}
                            {isMultiPic && col.key === "progress" && doneCount > 0 && (
                              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60 font-medium">
                                ⏳ {doneCount}/{pics.length} PIC Setuju Selesai
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <Badge
                        tone={badgeToneMap[col.key]}
                        className="ml-auto shrink-0 text-xs self-start"
                      >
                        {col.key === "done" ? "Selesai" : col.key === "progress" ? "In Progress" : "To Do"}
                      </Badge>
                    </div>
                    {task.invoice_url && (
                      <div className="mt-2 text-xs">
                        <a 
                          href={task.invoice_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-indigo-600 hover:underline flex items-center gap-1 dark:text-indigo-400 font-medium"
                        >
                          Lihat Invoice
                        </a>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5 dark:border-white/8">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startEdit(task)}
                      >
                        Edit
                      </Button>
                      {col.key === "todo" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400"
                          onClick={() => handleStartTask(task)}
                        >
                          {(() => {
                            const pics = getTaskPics(task.pic);
                            if (pics.length >= 2) {
                              const approvals = parseTaskApprovals(task.notes).start;
                              return approvals.length > 0
                                ? `Kerjakan (${approvals.length}/${pics.length})`
                                : `Kerjakan (${pics.length} PIC)`;
                            }
                            return "Kerjakan";
                          })()}
                        </Button>
                      )}
                      {col.key !== "done" && (
                        <Button
                          size="sm"
                          onClick={() => openCompleteModal(task)}
                        >
                          {(() => {
                            const pics = getTaskPics(task.pic);
                            if (pics.length >= 2) {
                              const approvals = parseTaskApprovals(task.notes).done;
                              return approvals.length > 0
                                ? `Selesai (${approvals.length}/${pics.length})`
                                : "Selesai";
                            }
                            return "Selesai";
                          })()}
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                          onClick={() =>
                            void deleteTask(task.id).then(() =>
                              refresh("Task dihapus"),
                            )
                          }
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
