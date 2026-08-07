import { Calendar, Plus, X, History, Clock } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";
import { createTask, deleteTask, updateTask } from "../services/database";
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
    key: "review",
    label: "Review",
    color: "bg-amber-50 dark:bg-amber-500/5",
    dot: "bg-amber-500",
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
  points: 10,
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
  const { data, isLoading, error } = useAppData();
  const { user } = useAuth();
  const isAdmin = ["owner", "developer", "manager", "admin"].includes(
    user?.role,
  );
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTask);
  const [showHistory, setShowHistory] = useState(false);

  const tasks = data?.tasks ?? [];
  const activityLogs = data?.activityLogs ?? [];

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Task Board
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Kanban — point otomatis diberikan saat task selesai.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowHistory(true)}>
            <History className="h-4 w-4" />
            Riwayat
          </Button>
          <Button
            onClick={() => {
              if (showForm && !editing) {
                closeForm();
              } else {
                setEditing(null);
                setForm(emptyTask);
                setShowForm(true);
              }
            }}
          >
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

      {/* Form */}
      {showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {editing ? "Edit Task" : "Tambah Task Baru"}
            </h2>
            <button
              onClick={closeForm}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => void submit(e)}
          >
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Judul Task *
              </label>
              <Input
                placeholder="Deskripsi singkat task"
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
                PIC
              </label>
              <Input
                placeholder="Pisahkan dengan koma"
                value={form.pic}
                onChange={(e) => setForm({ ...form, pic: e.target.value })}
              />
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
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Point
              </label>
              <Input
                type="number"
                min={0}
                value={form.points}
                onChange={(e) =>
                  setForm({ ...form, points: Number(e.target.value) })
                }
              />
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

      {/* Kanban columns */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
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
                        <span className="truncate text-xs text-slate-500 dark:text-slate-400 max-w-[100px]">
                          {task.pic}
                        </span>
                      )}
                      <Badge
                        tone={col.key === "done" ? "green" : "slate"}
                        className="ml-auto shrink-0"
                      >
                        {task.points} pts
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5 dark:border-white/8">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startEdit(task)}
                      >
                        Edit
                      </Button>
                      {col.key !== "done" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            void updateTask(
                              task.id,
                              { ...task, status: "done" },
                              task.status,
                            ).then(() =>
                              refresh("Task selesai, point ditambahkan"),
                            )
                          }
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
