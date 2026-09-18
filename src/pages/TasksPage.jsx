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

export function isPicSelected(picString, userName) {
  if (!picString || !userName) return false;
  const target = userName.toLowerCase().trim();
  const tokens = picString
    .split(/[,/&\-–—]|\bdan\b/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return tokens.some((token) => {
    if (token === target) return true;
    const words = token.split(/\s+/);
    return words.includes(target);
  });
}

export function resolveClientPics(clientPic, users = []) {
  if (!clientPic) return "";
  const staffUsers = (users || []).filter(
    (u) =>
      u.role !== "owner" &&
      u.name.toLowerCase() !== "tegar" &&
      u.name.toLowerCase() !== "owner"
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
        await updateTask(editing.id, form, editing.status);
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
      notes: task.notes,
      is_overtime: Boolean(task.is_overtime),
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyTask);
  }

  function openCompleteModal(task) {
    const now = new Date();
    const isAfterHours =
      now.getHours() >= 17 ||
      now.getHours() < 8 ||
      now.getDay() === 0 ||
      now.getDay() === 6;
    setCompletingTask(task);
    setInvoiceFile(null);
    setCompletionOvertime(Boolean(task.is_overtime || isAfterHours));
  }

  async function confirmCompleteTask(e) {
    e.preventDefault();
    if (!invoiceFile) {
      return toast.error("File invoice bukti pekerjaan wajib diunggah.");
    }
    
    setIsUploading(true);
    try {
      const invoiceUrl = await uploadInvoice(invoiceFile, completingTask.id);
      
      const res = await updateTask(
        completingTask.id,
        {
          ...completingTask,
          status: "done",
          invoice_url: invoiceUrl,
          is_overtime: completionOvertime,
        },
        completingTask.status,
        { isOvertime: completionOvertime }
      );
      
      await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });

      if (res?.isOverdue) {
        toast.warning(
          `Task diselesaikan lewat deadline (${completingTask.deadline}). Tidak mendapat reward poin (0 pt).`
        );
      } else if (res?.earnedPoints > 0) {
        toast.success(
          `Task diselesaikan tepat waktu saat lembur! +${res.earnedPoints} poin diberikan ke PIC.`
        );
      } else {
        toast.success(
          "Task diselesaikan tepat waktu (Pekerjaan reguler tercover gaji bulanan)."
        );
      }

      setCompletingTask(null);
      setInvoiceFile(null);
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Task Board
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Pekerjaan bulanan reguler terhitung dalam gaji pokok. Tambahan poin reward diperoleh apabila tugas diselesaikan tepat waktu dan dikerjakan secara lembur/ekstra.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowHistory(true)}>
            <History className="h-4 w-4" />
            Riwayat
          </Button>
          <Button onClick={() => { setEditing(null); setForm(emptyTask); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Tambah Task
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
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={submit}
          >
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
              <div className="flex flex-wrap gap-2 pt-1">
                {data?.users?.filter(u => u.role !== 'owner' && u.name.toLowerCase() !== 'tegar' && u.name.toLowerCase() !== 'owner').map((user) => {
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

      {/* Modal Upload Invoice Selesai Task */}
      {completingTask && (() => {
        const isOverdue = Boolean(completingTask.deadline && completingTask.deadline < todayStr);
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <Card className="w-full max-w-md p-0 overflow-hidden shadow-xl border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/8 bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Konfirmasi Penyelesaian Task
                  </h2>
                  <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                    {completingTask.title}
                  </p>
                </div>
                <button
                  onClick={() => { setCompletingTask(null); setInvoiceFile(null); }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={confirmCompleteTask} className="p-5 space-y-4">
                {/* Status Evaluation Card */}
                {isOverdue ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                    <div>
                      <div className="font-semibold text-rose-900 dark:text-rose-200">
                        Lewat Batas Deadline ({completingTask.deadline})
                      </div>
                      <p className="mt-0.5 text-[11px] text-rose-600 dark:text-rose-400">
                        Sesuai kebijakan reward, tugas yang diselesaikan terlambat <strong>tidak mendapatkan reward poin (0 pt)</strong>.
                      </p>
                    </div>
                  </div>
                ) : completionOvertime ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 flex items-start gap-2.5">
                    <Award className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="font-semibold text-emerald-900 dark:text-emerald-200">
                        Tepat Waktu & Lembur (+{completingTask.points || 1} Poin)
                      </div>
                      <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                        Memenuhi syarat bonus! PIC <strong>{completingTask.pic || "Staff"}</strong> akan menerima tambahan <strong>+{completingTask.points || 1} poin</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-slate-500" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-200">
                        Tepat Waktu (Tugas Rutin Bulanan)
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        Pekerjaan rutin bulanan tercakup dalam gaji pokok reguler (<strong>0 poin reward tambahan</strong>).
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

                {/* Invoice Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    File Bukti Invoice / Dokumen Final (Wajib)
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,image/*"
                    onChange={(e) => setInvoiceFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-500/20 dark:file:text-indigo-300 dark:hover:file:bg-indigo-500/30"
                  />
                  <p className="text-[11px] text-slate-400">
                    Unggah faktur/dokumen hasil pengerjaan sebagai bukti validasi.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => { setCompletingTask(null); setInvoiceFile(null); }}
                    className="flex-1"
                    disabled={isUploading}
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={isUploading || !invoiceFile}
                  >
                    {isUploading ? "Mengunggah..." : "Konfirmasi Selesai"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        );
      })()}

      {/* Kanban columns */}
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => {
          const colTasks = tasks.filter(
            (t) => t.status === col.key || (col.key === "progress" && t.status === "review")
          );
          return (
            <div
              key={col.key}
              className={`rounded-xl border border-slate-200/80 dark:border-white/8 ${col.color} p-3`}
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
                      {task.is_overtime ? (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                          <Moon className="h-2.5 w-2.5" /> Lembur (+{task.points || 1} pt)
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Reguler
                        </span>
                      )}
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
                      {task.pic && (
                        <span className="truncate text-xs text-slate-500 dark:text-slate-400 max-w-[120px]">
                          {task.pic}
                        </span>
                      )}
                      <Badge
                        tone={col.key === "done" ? "green" : "slate"}
                        className="ml-auto shrink-0 text-xs"
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
                          onClick={() =>
                            void updateTask(
                              task.id,
                              { ...task, status: "progress" },
                              task.status,
                            ).then(() =>
                              refresh("Task dipindahkan ke In Progress"),
                            )
                          }
                        >
                          Kerjakan
                        </Button>
                      )}
                      {col.key !== "done" && (
                        <Button
                          size="sm"
                          onClick={() => openCompleteModal(task)}
                        >
                          Selesai
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
