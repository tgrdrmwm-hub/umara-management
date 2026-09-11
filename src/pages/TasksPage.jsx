import { Calendar, Plus, X, History, Clock } from "lucide-react";
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
  points: 0.25,
  notes: "",
};

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
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const tasks = data?.tasks ?? [];
  const activityLogs = data?.activityLogs ?? [];

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
      points: task.points,
      notes: task.notes,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyTask);
  }

  async function confirmCompleteTask(e) {
    e.preventDefault();
    if (!invoiceFile) {
      return toast.error("File invoice bukti pekerjaan wajib diunggah.");
    }
    
    setIsUploading(true);
    try {
      const invoiceUrl = await uploadInvoice(invoiceFile, completingTask.id);
      
      const todayStr = new Date().toISOString().split("T")[0];
      const isOverdue = completingTask.deadline && completingTask.deadline < todayStr;
      const msg = isOverdue
        ? "Task diselesaikan lewat deadline."
        : "Task diselesaikan tepat waktu.";

      await updateTask(
        completingTask.id,
        { ...completingTask, status: "done", invoice_url: invoiceUrl },
        completingTask.status,
      );
      
      await refresh(msg);
      setCompletingTask(null);
      setInvoiceFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengunggah invoice atau menyelesaikan task.");
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
            Alur pengerjaan tugas — Selesaikan semua tugas sebelum 16:00 untuk mendapat bonus point harian!
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
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Layanan & Bonus Poin Ketepatan Waktu
              </label>
              <select
                className={selectClass}
                value={form.points}
                onChange={(e) =>
                  setForm({ ...form, points: Number(e.target.value) })
                }
              >
                <option value={0.25}>Standar Bonus (+0.25 pts)</option>
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
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                PIC (Pilih yang bertugas)
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {data?.users?.filter(u => u.role !== 'owner' && u.name.toLowerCase() !== 'tegar' && u.name.toLowerCase() !== 'owner').map((user) => {
                  const isSelected = form.pic.includes(user.name);
                  return (
                    <label
                      key={user.id}
                      className={`cursor-pointer select-none rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isSelected}
                        onChange={(e) => {
                          let currentPics = form.pic
                            .split(/,|\bdan\b/i)
                            .map((p) => p.trim())
                            .filter(Boolean);
                            
                          if (e.target.checked) {
                            if (!currentPics.includes(user.name)) {
                              currentPics.push(user.name);
                            }
                          } else {
                            currentPics = currentPics.filter(
                              (p) => p !== user.name
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
      {completingTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-0 overflow-hidden shadow-xl border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/8 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Penyelesaian Task
              </h2>
              <button
                onClick={() => { setCompletingTask(null); setInvoiceFile(null); }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={confirmCompleteTask} className="p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 mb-3">
                  Upload file bukti invoice / dokumen final untuk menyelesaikan task <strong>&quot;{completingTask.title}&quot;</strong>.
                </p>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  File Bukti (Wajib)
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={(e) => setInvoiceFile(e.target.files[0])}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-500/20 dark:file:text-indigo-300 dark:hover:file:bg-indigo-500/30"
                />
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
                  {isUploading ? "Mengunggah..." : "Selesai"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

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
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                      {task.title}
                    </h3>
                    {task.client && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {task.client}
                      </p>
                    )}
                    {task.deadline && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {task.deadline}
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
                          onClick={() => setCompletingTask(task)}
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
