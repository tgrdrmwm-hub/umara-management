import { ClipboardCheck, Paperclip, Plus, UserRound } from "lucide-react";
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
import {
  taxServiceDefinitions,
  getTaxServicePoint,
} from "../constants/taxServices";
import { useAppData } from "../hooks/useAppData";
import {
  createTaxWork,
  deleteTaxWork,
  updateTaxWork,
} from "../services/database";

const emptyTaxWork = {
  category: "Aktivasi Coretax",
  service: "Pembuatan NPWP",
  client: "",
  pic: "",
  deadline: "",
  status: "Draft",
  attachment: "",
  notes: "",
};

export function TaxPage() {
  const { data } = useAppData();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTaxWork);
  const taxWorks = data?.taxWorks ?? [];
  const selectedServices =
    taxServiceDefinitions.find((group) => group.category === form.category)
      ?.services ?? [];
  const categoryChart = taxServiceDefinitions.map((group) => ({
    category: group.category.replace("Aktivasi ", ""),
    point: group.services.reduce(
      (total, service) => total + service.basePoints,
      0,
    ),
    layanan: group.services.length,
  }));

  async function refresh(message) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(message);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.client.trim() || !form.pic.trim())
      return toast.error("Client dan PIC wajib diisi");
    if (editing) {
      await updateTaxWork(editing.id, form, editing.status);
      setEditing(null);
      await refresh("Pekerjaan pajak diperbarui");
    } else {
      await createTaxWork(form);
      await refresh("Pekerjaan pajak ditambahkan");
    }
    setForm(emptyTaxWork);
    setShowForm(false);
  }

  function startEdit(item) {
    setEditing(item);
    setForm({
      category: item.category,
      service: item.service,
      client: item.client,
      pic: item.pic,
      deadline: item.deadline,
      status: item.status,
      attachment: item.attachment,
      notes: item.notes,
    });
    setShowForm(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">UMARA TAX</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Alur kerja pajak, PIC penanggung jawab, status pekerjaan, dan point
            staff.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm((value) => !value);
            setEditing(null);
            setForm(emptyTaxWork);
          }}
        >
          <Plus className="h-4 w-4" />
          Pekerjaan Pajak
        </Button>
      </div>
      {showForm && (
        <Card className="p-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => void submit(event)}
          >
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950"
              value={form.category}
              onChange={(event) => {
                const category = event.target.value;
                const service =
                  taxServiceDefinitions.find(
                    (group) => group.category === category,
                  )?.services[0]?.name ?? "";
                setForm({ ...form, category, service });
              }}
            >
              {taxServiceDefinitions.map((group) => (
                <option key={group.category} value={group.category}>
                  {group.category}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950"
              value={form.service}
              onChange={(event) =>
                setForm({ ...form, service: event.target.value })
              }
            >
              {selectedServices.map((service) => (
                <option key={service.name} value={service.name}>
                  {service.name} - {service.basePoints} pt
                </option>
              ))}
            </select>
            <Input
              placeholder="Client"
              value={form.client}
              onChange={(event) =>
                setForm({ ...form, client: event.target.value })
              }
            />
            <Input
              placeholder="PIC penanggung jawab (pisahkan dengan koma)"
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
              <option value="Draft">Draft</option>
              <option value="Berjalan">Berjalan</option>
              <option value="Review">Review</option>
              <option value="Selesai">Selesai</option>
            </select>
            <Input
              placeholder="Lampiran"
              value={form.attachment}
              onChange={(event) =>
                setForm({ ...form, attachment: event.target.value })
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
              <Button>
                {editing ? "Update Pekerjaan" : "Simpan Pekerjaan"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setForm(emptyTaxWork);
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}
      <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card className="p-4">
          <h2 className="text-base font-bold mb-4">Kategori & Point Layanan</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            {taxServiceDefinitions.map((group) => (
              <div
                key={group.category}
                className="rounded-md border border-slate-200 p-3 dark:border-white/10 bg-white dark:bg-slate-950/50"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge tone="green" className="text-xs">{group.category}</Badge>
                  <span className="text-xs font-semibold text-slate-500 flex-shrink-0">
                    {group.services.length} layan
                  </span>
                </div>
                <div className="space-y-1">
                  {group.services.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{service.name}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200 flex-shrink-0">
                        {service.basePoints} pt
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="text-base font-bold mb-4">Grafik Point Dasar</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="point" fill="#15803d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        {taxWorks.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone="green">{item.category}</Badge>
                <h2 className="mt-3 text-lg font-bold">{item.service}</h2>
              </div>
              <Badge
                tone={
                  item.status === "Selesai"
                    ? "green"
                    : item.status === "Review"
                      ? "blue"
                      : "amber"
                }
              >
                {item.status}
              </Badge>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Client</dt>
                <dd className="font-semibold">{item.client}</dd>
              </div>
              <div>
                <dt className="text-slate-500">PIC Penanggung Jawab</dt>
                <dd className="flex items-center gap-2 font-semibold">
                  <UserRound className="h-4 w-4 text-green-700" />
                  {item.pic}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Deadline</dt>
                <dd className="font-semibold">{item.deadline}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Point Pekerjaan</dt>
                <dd className="flex items-center gap-2 font-semibold">
                  <ClipboardCheck className="h-4 w-4 text-green-700" />
                  {getTaxServicePoint(item.category, item.service)} pt
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Lampiran</dt>
                <dd className="flex items-center gap-2 font-semibold">
                  <Paperclip className="h-4 w-4" />
                  {item.attachment}
                </dd>
              </div>
            </dl>
            <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {item.notes}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => startEdit(item)}
              >
                Edit
              </Button>
              {item.status !== "Selesai" && (
                <Button
                  size="sm"
                  onClick={() =>
                    void updateTaxWork(
                      item.id,
                      { ...item, status: "Selesai" },
                      item.status,
                    ).then(() =>
                      refresh("Pekerjaan selesai, point ditambahkan"),
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
                  void deleteTaxWork(item.id).then(() =>
                    refresh("Pekerjaan pajak dihapus"),
                  )
                }
              >
                Hapus
              </Button>
            </div>
          </Card>
        ))}
        {!taxWorks.length && (
          <Card className="p-4 text-sm text-slate-500 dark:text-slate-400">
            Belum ada pekerjaan pajak aktif. Gunakan kategori layanan di atas
            sebagai acuan saat menambahkan data tax di Supabase.
          </Card>
        )}
      </div>
    </div>
  );
}
