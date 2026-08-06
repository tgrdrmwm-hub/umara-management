import { Calendar, Link as LinkIcon, Plus, X } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";
import { createInternTask, deleteInternTask, updateInternTask } from "../services/database";
import { useAuth } from "../hooks/useAuth";

const columns = [
  { key: "todo", label: "To Do", color: "bg-slate-100 dark:bg-white/5", dot: "bg-slate-400" },
  { key: "progress", label: "In Progress", color: "bg-blue-50 dark:bg-blue-500/5", dot: "bg-blue-500" },
  { key: "review", label: "Review", color: "bg-amber-50 dark:bg-amber-500/5", dot: "bg-amber-500" },
  { key: "done", label: "Done", color: "bg-emerald-50 dark:bg-emerald-500/5", dot: "bg-emerald-500" },
];

const emptyTask = {
  title: "",
  assigner: "",
  intern: "",
  date: new Date().toISOString().split("T")[0],
  attachment: "",
  status: "todo",
};

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20";

const badgeToneMap = { todo: "slate", progress: "blue", review: "amber", done: "green" };

export function InternTasksPage() {
  const { data, isLoading } = useAppData();
  const { user } = useAuth();
  const isMagang = user?.role === "magang" || user?.role === "staff_magang";
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTask);
  
  const tasks = data?.internTasks ?? [];

  async function refresh(message) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(message);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) return toast.error("Judul tugas wajib diisi");
    if (!form.assigner.trim()) return toast.error("Pemberi tugas wajib diisi");
    
    try {
      if (editing) {
        await updateInternTask(editing.id, form);
        setEditing(null);
        await refresh("Tugas magang diperbarui");
      } else {
        await createInternTask(form);
        await refresh("Tugas magang ditambahkan");
      }
      setForm(emptyTask);
      setShowForm(false);
    } catch {
      toast.error("Gagal menyimpan tugas magang");
    }
  }

  function startEdit(task) {
    setEditing(task);
    setForm({ 
      title: task.title, 
      assigner: task.assigner, 
      intern: task.intern, 
      date: task.date, 
      status: task.status, 
      attachment: task.attachment 
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyTask);
  }

  if (isLoading) {
    return <div className="p-4 text-sm text-slate-500">Memuat...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Tugas Magang</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Kelola tugas yang diberikan oleh staff kepada anak magang.
          </p>
        </div>
        {!isMagang && (
          <Button onClick={() => { if (showForm && !editing) { closeForm(); } else { setEditing(null); setForm(emptyTask); setShowForm(true); } }}>
            <Plus className="h-4 w-4" />
            Tambah Tugas
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {editing ? "Edit Tugas Magang" : "Tambah Tugas Magang"}
            </h2>
            <button onClick={closeForm} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void submit(e)}>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Pekerjaan / Judul Tugas *</label>
              <Input placeholder="Deskripsi pekerjaan" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Pemberi Tugas (Staff) *</label>
              <Input placeholder="Nama Staff" value={form.assigner} onChange={(e) => setForm({ ...form, assigner: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Diberikan Kepada (Anak Magang)</label>
              <Input placeholder="Nama Anak Magang" value={form.intern} onChange={(e) => setForm({ ...form, intern: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tanggal Diberikan</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
              <select className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {columns.map((col) => (
                  <option key={col.key} value={col.key}>{col.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Letak File / Dokumen (Opsional)</label>
              <Input placeholder="Link Google Drive / Folder lokal..." value={form.attachment} onChange={(e) => setForm({ ...form, attachment: e.target.value })} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">{editing ? "Simpan Perubahan" : "Tambah Tugas"}</Button>
              <Button type="button" variant="secondary" onClick={closeForm}>Batal</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Kanban columns */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={`rounded-xl border border-slate-200/80 dark:border-white/8 ${col.color} p-3`}>
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{col.label}</h2>
                </div>
                <Badge tone={badgeToneMap[col.key]}>{colTasks.length}</Badge>
              </div>

              <div className="space-y-2">
                {colTasks.length === 0 && (
                  <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400 dark:border-white/8">
                    Tidak ada tugas
                  </div>
                )}
                {colTasks.map((task) => (
                  <Card key={task.id} className="p-3 shadow-none hover:shadow-sm transition-shadow">
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">{task.title}</h3>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <p>Oleh: <span className="font-medium text-slate-700 dark:text-slate-300">{task.assigner}</span></p>
                      {task.intern && <p>Untuk: <span className="font-medium text-slate-700 dark:text-slate-300">{task.intern}</span></p>}
                    </div>
                    {task.date && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {task.date}
                      </div>
                    )}
                    {task.attachment && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                        <LinkIcon className="h-3 w-3" />
                        <a href={task.attachment.startsWith("http") ? task.attachment : "#"} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate max-w-[150px]">
                          Lihat Dokumen
                        </a>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5 dark:border-white/8">
                      {!isMagang && (
                        <Button size="sm" variant="secondary" onClick={() => startEdit(task)}>Edit</Button>
                      )}
                      {col.key !== "done" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            void updateInternTask(task.id, { ...task, status: "done" })
                              .then(() => refresh("Tugas selesai"))
                          }
                        >
                          Selesai
                        </Button>
                      )}
                      {!isMagang && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                          onClick={() => void deleteInternTask(task.id).then(() => refresh("Tugas dihapus"))}
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
