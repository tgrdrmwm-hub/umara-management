import { ClipboardCheck, Paperclip, Plus, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { PALETTE } from "../components/ui/ChartWrapper";
import { taxServiceDefinitions, getTaxServicePoint } from "../constants/taxServices";
import { useAppData } from "../hooks/useAppData";
import { createTaxWork, deleteTaxWork, updateTaxWork } from "../services/database";
import { useAuth } from "../hooks/useAuth";

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

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20";

const statusTone = {
  Selesai: "green",
  Berjalan: "blue",
  Review: "amber",
  Draft: "slate",
};

export function TaxPage() {
  const { data, isLoading, error } = useAppData();
  const { user } = useAuth();
  const isAdmin = ["owner", "developer", "manager", "admin"].includes(user?.role);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTaxWork);

  const taxWorks = data?.taxWorks ?? [];
  const selectedServices =
    taxServiceDefinitions.find((g) => g.category === form.category)?.services ?? [];

  const categoryChart = taxServiceDefinitions.map((g, i) => {
    const totalPoints = g.services.reduce((total, service) => {
      return total + service.basePoints;
    }, 0);
    
    return {
      category: g.category.replace("Aktivasi ", ""),
      point: totalPoints,
      layanan: g.services.length,
      colorIndex: i,
    };
  });
  const maxCategoryPoint = Math.max(...categoryChart.map((item) => item.point), 1);
  const chartMaxPoint = Math.max(Math.ceil(maxCategoryPoint / 150) * 150, 600);
  const chartTicks = Array.from(
    { length: 5 },
    (_, index) => chartMaxPoint - (chartMaxPoint / 4) * index,
  );

  async function refresh(msg) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(msg);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.client.trim() || !form.pic.trim())
      return toast.error("Client dan PIC wajib diisi");
    try {
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
    } catch {
      toast.error("Gagal menyimpan");
    }
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

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyTaxWork);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">UMARA TAX</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Alur kerja pajak, PIC, status pekerjaan, dan point staff.
          </p>
        </div>
        <Button onClick={() => { if (showForm && !editing) { closeForm(); } else { setEditing(null); setForm(emptyTaxWork); setShowForm(true); } }}>
          <Plus className="h-4 w-4" />
          Tambah Pekerjaan
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {editing ? "Edit Pekerjaan Pajak" : "Tambah Pekerjaan Pajak"}
            </h2>
            <button onClick={closeForm} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void submit(e)}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Kategori</label>
              <select
                className={selectClass}
                value={form.category}
                onChange={(e) => {
                  const category = e.target.value;
                  const service = taxServiceDefinitions.find((g) => g.category === category)?.services[0]?.name ?? "";
                  setForm({ ...form, category, service });
                }}
              >
                {taxServiceDefinitions.map((g) => (
                  <option key={g.category} value={g.category}>{g.category}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Layanan</label>
              <select className={selectClass} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                {selectedServices.map((s) => (
                  <option key={s.name} value={s.name}>{s.name} — {s.basePoints} pt</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Client *</label>
              <Input placeholder="Nama client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">PIC *</label>
              <Input placeholder="Penanggung jawab (pisahkan koma)" value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Deadline</label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
              <select className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Draft">Draft</option>
                <option value="Berjalan">Berjalan</option>
                <option value="Review">Review</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Lampiran</label>
              <Input placeholder="URL atau nama file lampiran" value={form.attachment} onChange={(e) => setForm({ ...form, attachment: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Catatan</label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20"
                placeholder="Catatan pekerjaan..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">{editing ? "Simpan Perubahan" : "Tambah Pekerjaan"}</Button>
              <Button type="button" variant="secondary" onClick={closeForm}>Batal</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Service reference & chart */}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Kategori & Layanan</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {taxServiceDefinitions.map((group, gi) => (
              <div key={group.category} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-white/8 dark:bg-white/3">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: PALETTE[gi % PALETTE.length] }}
                  />
                  <span className="truncate text-[10px] font-semibold text-slate-700 dark:text-slate-300">{group.category}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-slate-400">{group.services.length}x</span>
                </div>
                <div className="space-y-1.5">
                  {group.services.map((service) => (
                    <div key={service.name} className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-slate-600 dark:text-slate-400">{service.name}</span>
                      <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                        {service.basePoints}pt
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 self-start">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Point Dasar per Kategori</h2>
            <p className="mt-0.5 text-xs text-slate-400">Total point kumulatif dari semua layanan</p>
          </div>
          <div className="relative h-[320px] w-full rounded-xl bg-gradient-to-b from-slate-50 to-white px-3 pb-12 pt-6 dark:from-slate-900 dark:to-slate-900 sm:h-[360px] sm:px-5">
            <div className="pointer-events-none absolute inset-x-5 bottom-16 top-6 flex flex-col justify-between">
              {chartTicks.map((tick) => (
                <div key={tick} className="flex items-center gap-2">
                  <span className="w-8 text-right text-[10px] font-medium text-slate-400">{tick}</span>
                  <span className="h-px flex-1 border-t border-dashed border-slate-200 dark:border-white/10" />
                </div>
              ))}
            </div>

            <div className="relative ml-10 flex h-full items-end justify-between gap-2 sm:gap-4">
              {categoryChart.map((item, index) => {
                const color = PALETTE[item.colorIndex % PALETTE.length];
                const height = Math.max((item.point / chartMaxPoint) * 100, 8);

                return (
                  <div key={item.category} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
                    <div className="relative flex flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-14 rounded-t-lg shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md"
                        style={{
                          height: `${height}%`,
                          background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
                          animation: `taxBarGrow 900ms ease-out ${index * 90}ms both`,
                          transformOrigin: "bottom",
                        }}
                      >
                        <div className="-mt-6 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          {item.point} pt
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-8 -rotate-[35deg] truncate text-center text-[10px] font-medium text-slate-500 sm:text-xs">
                      {item.category}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Tax work cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Pekerjaan Aktif</h2>
        {taxWorks.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-slate-400">Belum ada pekerjaan pajak. Tambahkan menggunakan tombol di atas.</p>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {taxWorks.map((item) => (
              <Card key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge tone="green" className="text-[10px]">{item.category}</Badge>
                    <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100 leading-snug">{item.service}</h3>
                  </div>
                  <Badge tone={statusTone[item.status] ?? "slate"} className="shrink-0">{item.status}</Badge>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-500">Client</dt>
                    <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{item.client}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">PIC</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                      <UserRound className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {item.pic}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Deadline</dt>
                    <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{item.deadline || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Point</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                      <ClipboardCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {getTaxServicePoint(item.category, item.service)} pt
                    </dd>
                  </div>
                  {item.attachment && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-slate-500">Lampiran</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        {item.attachment}
                      </dd>
                    </div>
                  )}
                </dl>

                {item.notes && (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-400">
                    {item.notes}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-white/8">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(item)}>Edit</Button>
                  {item.status !== "Selesai" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        void updateTaxWork(item.id, { ...item, status: "Selesai" }, item.status)
                          .then(() => refresh("Selesai, point ditambahkan"))
                      }
                    >
                      Tandai Selesai
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                      onClick={() => void deleteTaxWork(item.id).then(() => refresh("Pekerjaan dihapus"))}
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}