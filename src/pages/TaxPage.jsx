import { useState, useMemo } from "react";
import { Plus, X, Pencil, Trash2, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { taxServiceDefinitions } from "../constants/taxServices";
import { createTaxService, updateTaxService, deleteTaxService } from "../services/database";

export function TaxPage() {
  const { data } = useAppData();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = ["owner", "developer"].includes(user?.role);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
    category: "",
    service_name: "",
    base_points: 0.25,
  });

  const categories = useMemo(() => {
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
  }, [data?.taxServices]);

  async function refresh(message) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(message);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.category.trim() || !form.service_name.trim()) {
      return toast.error("Kategori dan Nama Layanan wajib diisi");
    }

    try {
      if (editing) {
        await updateTaxService(editing.id, form);
        await refresh("Layanan diperbarui");
      } else {
        await createTaxService(form);
        await refresh("Layanan ditambahkan");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ category: "", service_name: "", base_points: 0.25 });
    } catch (err) {
      toast.error("Gagal menyimpan layanan");
    }
  }

  function startEdit(service) {
    setEditing(service);
    setForm({
      category: service.category,
      service_name: service.name,
      base_points: service.basePoints ?? 0.25,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startAdd() {
    setEditing(null);
    setForm({ category: "", service_name: "", base_points: 0.25 });
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-500" />
            Kategori & Layanan
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Katalog lengkap layanan UMARA TAX beserta bonus poin ketepatan waktunya.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={startAdd}>
            <Plus className="h-4 w-4" />
            Tambah Layanan
          </Button>
        )}
      </div>

      {/* Form */}
      {isAdmin && showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              {editing ? "Edit Layanan" : "Tambah Layanan Baru"}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form className="grid gap-4 sm:grid-cols-3" onSubmit={submit}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Kategori
              </label>
              <Input
                required
                placeholder="Contoh: Coretax"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                list="category-options"
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c.category} value={c.category} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Nama Layanan
              </label>
              <Input
                required
                placeholder="Contoh: Pembuatan NPWP"
                value={form.service_name}
                onChange={(e) => setForm({ ...form, service_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Bonus Ketepatan Waktu (Poin)
              </label>
              <Input
                type="number"
                required
                min="0"
                step="0.25"
                value={form.base_points}
                onChange={(e) => setForm({ ...form, base_points: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <Button type="submit">
                {editing ? "Simpan Perubahan" : "Tambah"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {categories.map((categoryObj, index) => {
          const { category, services } = categoryObj;
          const totalPoints = services.reduce((total, service) => total + service.basePoints, 0);

          return (
            <Card key={index} className="flex flex-col p-0 overflow-hidden border-slate-200 dark:border-white/10 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 transition-colors">
              {/* Category Header */}
              <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {category}
                </h2>
                <Badge tone="blue" className="px-2 py-0.5 rounded-full">
                  {services.length} Layanan
                </Badge>
              </div>

              {/* Services List */}
              <div className="p-5 flex-1 flex flex-col gap-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between gap-3 group py-1.5 border-b border-slate-100/80 dark:border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-snug">
                        {service.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        tone="green"
                        className="font-mono text-xs whitespace-nowrap shrink-0"
                      >
                        +{service.basePoints} pts
                      </Badge>
                      {isAdmin && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(service)}
                            className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Hapus layanan ${service.name}?`)) {
                                await deleteTaxService(service.id, service.name);
                                await refresh("Layanan dihapus");
                              }
                            }}
                            className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                            title="Hapus"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Category Footer (Total points) */}
              <div className="bg-slate-50/50 dark:bg-slate-800/20 px-5 py-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-xs text-slate-500">
                <span>Total Bonus Kategori</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{Number(totalPoints).toFixed(2)} pts</span>
              </div>
            </Card>
          );
        })}
        {categories.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-500">
            Belum ada data layanan. {isAdmin && "Silakan tambahkan data baru atau jalankan script seed."}
          </div>
        )}
      </div>
    </div>
  );
}
