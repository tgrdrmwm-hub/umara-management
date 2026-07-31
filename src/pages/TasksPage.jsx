import { Plus } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";
import { createTask, deleteTask, updateTask } from "../services/database";

const columns = [
  { key: "todo", label: "To Do" },
  { key: "progress", label: "Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
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

export function TasksPage() {
  const { data } = useAppData();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTask);
  const tasks = data?.tasks ?? [];

  async function refresh(message) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(message);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) return toast.error("Judul task wajib diisi");
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Task Kanban</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Point otomatis saat task selesai.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm((value) => !value);
            setEditing(null);
            setForm(emptyTask);
          }}
        >
          <Plus className="h-4 w-4" />
          Task
        </Button>
      </div>
      {showForm && (
        <Card className="p-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => void submit(event)}
          >
            <Input
              placeholder="Judul task"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
            <Input
              placeholder="Client"
              value={form.client}
              onChange={(event) =>
                setForm({ ...form, client: event.target.value })
              }
            />
            <Input
              placeholder="PIC staff"
              value={form.pic}
              onChange={(event) =>
                setForm({ ...form, pic: event.target.value })
              }
            />
            <Input
              type="date"
              value={form.deadline}
              onChange={(event) =>
                setForm({ ...form, deadline: event.target.value })
              }
            />
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              {columns.map((column) => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={0}
              value={form.points}
              onChange={(event) =>
                setForm({ ...form, points: Number(event.target.value) })
              }
            />
            <textarea
              className="min-h-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950 md:col-span-2"
              placeholder="Catatan"
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
            <div className="flex gap-2 md:col-span-2">
              <Button>{editing ? "Update Task" : "Simpan Task"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setForm(emptyTask);
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <section
            key={column.key}
            className="min-w-0 rounded-lg border border-slate-200 bg-slate-100/70 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">{column.label}</h2>
              <Badge>
                {tasks.filter((task) => task.status === column.key).length}
              </Badge>
            </div>
            <div className="space-y-3">
              {tasks
                .filter((task) => task.status === column.key)
                .map((task) => (
                  <Card key={task.id} className="p-3">
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">{task.client}</p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span>{task.pic}</span>
                      <Badge tone={column.key === "done" ? "green" : "amber"}>
                        {task.points} pts
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startEdit(task)}
                      >
                        Edit
                      </Button>
                      {column.key !== "done" && (
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void deleteTask(task.id).then(() =>
                            refresh("Task dihapus"),
                          )
                        }
                      >
                        Hapus
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
