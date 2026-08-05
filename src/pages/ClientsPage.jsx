import { Download, FileDown, FileUp, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";
import { createClient, deleteClient, updateClient } from "../services/database";

const emptyClient = {
  name: "",
  npwp: "",
  type: "Badan",
  status: "Aktif",
  pic: "",
  email: "",
};

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20";

export function ClientsPage() {
  const { data, isLoading, error } = useAppData();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [showForm, setShowForm] = useState(false);

  const clients = (data?.clients ?? []).filter((c) =>
    [c.name, c.npwp, c.pic, c.email].join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  async function refresh(message) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(message);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) return toast.error("Nama client wajib diisi");
    try {
      if (editing) {
        await updateClient(editing.id, form);
        setEditing(null);
        await refresh("Client diperbarui");
      } else {
        await createClient(form);
        await refresh("Client ditambahkan");
      }
      setForm(emptyClient);
      setShowForm(false);
    } catch {
      toast.error("Gagal menyimpan client");
    }
  }

  function startEdit(client) {
    setEditing(client);
    setForm({ name: client.name, npwp: client.npwp, type: client.type, status: client.status, pic: client.pic, email: client.email });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyClient);
  }

  function exportCsv() {
    const rows = [
      ["Client", "NPWP", "Type", "PIC", "Status", "Email"],
      ...clients.map((c) => [c.name, c.npwp, c.type, c.pic, c.status, c.email]),
    ];
    downloadCsv("clients-umara.csv", rows);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Client</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Manajemen data client — {clients.length} entri
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (showForm && !editing) { closeForm(); } else { setEditing(null); setForm(emptyClient); setShowForm(true); }
            }}
          >
            <Plus className="h-4 w-4" />
            Tambah Client
          </Button>
          <Button variant="secondary" onClick={() => toast.info("Import CSV belum tersedia.")}>
            <FileUp className="h-3.5 w-3.5" />
            Import
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <FileDown className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {editing ? "Edit Client" : "Tambah Client Baru"}
            </h2>
            <button onClick={closeForm} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/8">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void submit(e)}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Nama Client *</label>
              <Input placeholder="PT. Contoh Indonesia" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">NPWP</label>
              <Input placeholder="00.000.000.0-000.000" value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tipe</label>
              <select className={selectClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="Badan">Badan</option>
                <option value="OP">OP</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
              <select className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Aktif">Aktif</option>
                <option value="Prospek">Prospek</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">PIC</label>
              <Input placeholder="Nama penanggung jawab" value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</label>
              <Input type="email" placeholder="email@client.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-1 sm:col-span-2">
              <Button type="submit">{editing ? "Simpan Perubahan" : "Tambah Client"}</Button>
              <Button type="button" variant="secondary" onClick={closeForm}>Batal</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input className="pl-8" placeholder="Cari client, NPWP, PIC..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {search && (
          <button onClick={() => setSearch("")} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs sm:min-w-[640px] sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/8">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">NPWP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Tipe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">PIC</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/8">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    Tidak ada data client
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="group">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{client.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{client.npwp || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{client.type}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{client.pic || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={client.status === "Aktif" ? "green" : client.status === "Prospek" ? "amber" : "slate"}
                      >
                        {client.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{client.email || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => startEdit(client)}>Edit</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                          onClick={() => void deleteClient(client.id).then(() => refresh("Client dihapus"))}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
