import { Download, FileDown, FileUp, Plus, Search, X, Pencil, Trash2, Send } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";
import { createClient, deleteClient, updateClient } from "../services/database";
import { useAuth } from "../hooks/useAuth";
import { taxServiceDefinitions } from "../constants/taxServices";
import { createTask } from "../services/database";

const emptyClient = {
  name: "",
  npwp: "",
  type: "Badan",
  status: "Aktif",
  pic: "",
  email: "",
  link_gdrive: "",
  keterangan_aktivasi: "",
  keterangan_konfirmasi: "",
  password_djp: "",
  nik_op: "",
  password_coretax: "",
  passphrase: "",
  kode_aktivasi: "",
  efin: "",
  alamat: "",
  password_email: "",
  no_telepon: "",
  nik_pj: "",
  npwp_pj: "",
  alamat_pj: "",
  konfirmasi: "",
  tanggal_mulai_kontrak: "",
  tanggal_akhir_kontrak: "",
  kontrak: "",
  keterangan: "",
  spt_tahunan_2024: "",
};

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20";

export function ClientsPage() {
  const { data } = useAppData();
  const { user } = useAuth();
  const isAdmin = ["owner", "developer", "manager", "admin"].includes(
    user?.role,
  );
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [showForm, setShowForm] = useState(false);
  const [delegating, setDelegating] = useState(null);
  const [delegateForm, setDelegateForm] = useState({
    category: "",
    service: "",
    pic: "",
    deadline: "",
  });

  const clients = (data?.clients ?? []).filter((c) =>
    [c.name, c.npwp, c.pic, c.email]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

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


  async function submitDelegate(e) {
    e.preventDefault();
    if (!delegateForm.category || !delegateForm.service || !delegateForm.pic) {
      return toast.error("Kategori, layanan, dan PIC wajib diisi");
    }

    const catObj = categories.find((c) => c.category === delegateForm.category);
    const srvObj = catObj?.services.find((i) => i.name === delegateForm.service);
    const points = srvObj ? Number(srvObj.basePoints ?? 0.25) : 0.25;

    try {
      await createTask({
        title: `[${delegateForm.service}] ${delegating.name}`,
        client: delegating.name,
        notes: `Tugas dari Klien ${delegating.name}`,
        pic: delegateForm.pic,
        deadline: delegateForm.deadline || null,
        status: "todo",
        points: points,
      });
      await refresh("Pekerjaan berhasil didelegasikan ke Task Board");
      setDelegating(null);
      setDelegateForm({ category: "", service: "", pic: "", deadline: "" });
    } catch (err) {
      console.error(err);
      toast.error("Gagal mendelegasikan pekerjaan: " + (err?.message || "Unknown error"));
    }
  }

  function startEdit(client) {
    setEditing(client);
    setForm({
      name: client.name,
      npwp: client.npwp,
      type: client.type,
      status: client.status,
      pic: client.pic,
      email: client.email,
      link_gdrive: client.link_gdrive,
      keterangan_aktivasi: client.keterangan_aktivasi,
      keterangan_konfirmasi: client.keterangan_konfirmasi,
      password_djp: client.password_djp,
      nik_op: client.nik_op,
      password_coretax: client.password_coretax,
      passphrase: client.passphrase,
      kode_aktivasi: client.kode_aktivasi,
      efin: client.efin,
      alamat: client.alamat,
      password_email: client.password_email,
      no_telepon: client.no_telepon,
      nik_pj: client.nik_pj,
      npwp_pj: client.npwp_pj,
      alamat_pj: client.alamat_pj,
      konfirmasi: client.konfirmasi,
      tanggal_mulai_kontrak: client.tanggal_mulai_kontrak,
      tanggal_akhir_kontrak: client.tanggal_akhir_kontrak,
      kontrak: client.kontrak,
      keterangan: client.keterangan,
      spt_tahunan_2024: client.spt_tahunan_2024,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyClient);
  }

  function exportCsv() {
    const headers = [
      "id", "name", "npwp", "type", "status", "pic", "email", "link_gdrive", 
      "keterangan_aktivasi", "keterangan_konfirmasi", "password_djp", "nik_op", 
      "password_coretax", "passphrase", "kode_aktivasi", "efin", "alamat", 
      "password_email", "no_telepon", "nik_pj", "npwp_pj", "alamat_pj", 
      "konfirmasi", "tanggal_mulai_kontrak", "tanggal_akhir_kontrak", "kontrak", 
      "keterangan", "spt_tahunan_2024"
    ];
    const rows = [
      headers,
      ...clients.map((c) => [
        c.id, c.name, c.npwp, c.type, c.status, c.pic, c.email, c.link_gdrive,
        c.keterangan_aktivasi, c.keterangan_konfirmasi, c.password_djp, c.nik_op,
        c.password_coretax, c.passphrase, c.kode_aktivasi, c.efin, c.alamat,
        c.password_email, c.no_telepon, c.nik_pj, c.npwp_pj, c.alamat_pj,
        c.konfirmasi, c.tanggal_mulai_kontrak, c.tanggal_akhir_kontrak, c.kontrak,
        c.keterangan, c.spt_tahunan_2024
      ]),
    ];
    downloadCsv("clients-umara.csv", rows);
  }

  function importCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    import("papaparse").then((Papa) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (!results.data || results.data.length === 0) {
            return toast.error("File CSV kosong atau format tidak sesuai.");
          }

          let successCount = 0;
          let failCount = 0;

          for (const row of results.data) {
            const name = row['name'] || row['NAMA WAJIB PAJAK'] || row['Client'] || '';
            if (!name) continue;

            const rawType = String(row['type'] || row['JENIS'] || row['Tipe'] || "Badan").toUpperCase();
            const finalType = rawType.includes('OP') ? 'OP' : 'Badan';
            
            const rawStatus = String(row['status'] || row['LANJUT KLIEN'] || row['Status'] || "");
            let finalStatus = "Aktif";
            if (rawStatus.toUpperCase().includes('TIDAK LANJUT')) finalStatus = "Nonaktif";
            else if (rawStatus.toUpperCase().includes('LANJUT')) finalStatus = "Aktif";
            else if (rawStatus) finalStatus = "Prospek";

            const pjNama = row['pic'] || row['IDENTITAS PENANGGUNG JAWAB'] || row['PIC'] || '';

            try {
              await createClient({
                name: String(name).trim(),
                npwp: String(row['npwp'] || row['NPWP'] || "").trim(),
                type: finalType,
                status: finalStatus,
                pic: String(pjNama).trim(),
                email: String(row['email'] || row['PASSWORD EMAIL'] || row['Email'] || "").trim(),
                link_gdrive: String(row['link_gdrive'] || row['LINK GDRIVE'] || "").trim(),
                keterangan_aktivasi: String(row['keterangan_aktivasi'] || row['KETERANGAN AKTIVASI'] || "").trim(),
                keterangan_konfirmasi: String(row['keterangan_konfirmasi'] || row['KETERANGAN KONFIRMASI'] || "").trim(),
                password_djp: String(row['password_djp'] || row['PASSWORD DJP'] || "").trim(),
                nik_op: String(row['nik_op'] || row['NIK OP'] || "").trim(),
                password_coretax: String(row['password_coretax'] || row['PASSWORD CORETAX'] || "").trim(),
                passphrase: String(row['passphrase'] || row['PASPHRASE'] || "").trim(),
                kode_aktivasi: String(row['kode_aktivasi'] || row['KODE AKTIVASI'] || row['KODE AKTIVASIF'] || "").trim(),
                efin: String(row['efin'] || row['E - FIN'] || "").trim(),
                alamat: String(row['alamat'] || row['ALAMAT'] || "").trim(),
                password_email: String(row['password_email'] || row['PASSWORD EMAIL'] || "").trim(),
                no_telepon: String(row['no_telepon'] || row['NO TELEPON / HP'] || "").trim(),
                nik_pj: String(row['nik_pj'] || "").trim(),
                npwp_pj: String(row['npwp_pj'] || "").trim(),
                alamat_pj: String(row['alamat_pj'] || "").trim(),
                konfirmasi: String(row['konfirmasi'] || row['KONFIRMASI'] || "").trim(),
                tanggal_mulai_kontrak: String(row['tanggal_mulai_kontrak'] || row['TANGGAL MULAI KONTRAK'] || "").trim(),
                tanggal_akhir_kontrak: String(row['tanggal_akhir_kontrak'] || row['TANGGAL AKHIR KONTRAK'] || "").trim(),
                kontrak: String(row['kontrak'] || row['KONTRAK'] || "").trim(),
                keterangan: String(row['keterangan'] || row['KETERANGAN'] || "").trim(),
                spt_tahunan_2024: String(row['spt_tahunan_2024'] || row['SPT TAHUNAN 2024'] || "").trim(),
              });
              successCount++;
            } catch (err) {
              failCount++;
            }
          }

          toast.success(`Berhasil import ${successCount} client.` + (failCount > 0 ? ` Gagal: ${failCount}.` : ""));
          await refresh("Data client diperbarui");
          e.target.value = "";
        },
        error: (error) => {
          toast.error("Gagal membaca file CSV: " + error.message);
          e.target.value = "";
        }
      });
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Client
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Manajemen data client - {clients.length} entri
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="px-3 md:px-4"
            onClick={() => {
              if (showForm && !editing) {
                closeForm();
              } else {
                setEditing(null);
                setForm(emptyClient);
                setShowForm(true);
              }
            }}
          >
            <Plus className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Tambah Client</span>
          </Button>
          
          <label className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80 h-9 px-3 md:px-4 py-2 cursor-pointer">
            <FileUp className="h-4 w-4" />
            <span className="hidden md:inline">Import</span>
            <input type="file" accept=".csv" className="hidden" onChange={importCsv} />
          </label>

          <Button variant="secondary" onClick={exportCsv} className="px-3 md:px-4">
            <Download className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Export</span>
          </Button>
          <Button variant="secondary" onClick={() => window.print()} className="px-3 md:px-4">
            <FileDown className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">PDF</span>
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
            <button
              onClick={closeForm}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/8"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form
            className="flex flex-col gap-5 h-[70vh] overflow-y-auto pr-2"
            onSubmit={(e) => void submit(e)}
          >
            {/* Informasi Dasar */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-1 mb-3 text-sm">Informasi Dasar</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Nama Client / WP *</label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">NPWP</label><Input value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tipe</label><select className={selectClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="Badan">Badan</option><option value="OP">OP</option></select></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</label><select className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="Aktif">Aktif</option><option value="Prospek">Prospek</option><option value="Nonaktif">Nonaktif</option></select></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Alamat</label><Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">No Telepon / HP</label><Input value={form.no_telepon} onChange={(e) => setForm({ ...form, no_telepon: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Link GDrive</label><Input value={form.link_gdrive} onChange={(e) => setForm({ ...form, link_gdrive: e.target.value })} /></div>
              </div>
            </div>

            {/* Info Akun & Pajak */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-1 mb-3 text-sm">Info Akun & Pajak</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Password DJP</label><Input value={form.password_djp} onChange={(e) => setForm({ ...form, password_djp: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Password Coretax</label><Input value={form.password_coretax} onChange={(e) => setForm({ ...form, password_coretax: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Password Email</label><Input value={form.password_email} onChange={(e) => setForm({ ...form, password_email: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Passphrase</label><Input value={form.passphrase} onChange={(e) => setForm({ ...form, passphrase: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Kode Aktivasi</label><Input value={form.kode_aktivasi} onChange={(e) => setForm({ ...form, kode_aktivasi: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">E-FIN</label><Input value={form.efin} onChange={(e) => setForm({ ...form, efin: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">NIK OP</label><Input value={form.nik_op} onChange={(e) => setForm({ ...form, nik_op: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Keterangan Aktivasi</label><Input value={form.keterangan_aktivasi} onChange={(e) => setForm({ ...form, keterangan_aktivasi: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Keterangan Konfirmasi</label><Input value={form.keterangan_konfirmasi} onChange={(e) => setForm({ ...form, keterangan_konfirmasi: e.target.value })} /></div>
              </div>
            </div>

            {/* Penanggung Jawab */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-1 mb-3 text-sm">Penanggung Jawab (PJ)</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Nama PJ (Klien)</label><Input value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">NIK PJ</label><Input value={form.nik_pj} onChange={(e) => setForm({ ...form, nik_pj: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">NPWP PJ</label><Input value={form.npwp_pj} onChange={(e) => setForm({ ...form, npwp_pj: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Alamat PJ</label><Input value={form.alamat_pj} onChange={(e) => setForm({ ...form, alamat_pj: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Konfirmasi</label><Input value={form.konfirmasi} onChange={(e) => setForm({ ...form, konfirmasi: e.target.value })} /></div>
              </div>
            </div>

            {/* Kontrak */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-1 mb-3 text-sm">Kontrak & Lainnya</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Mulai Kontrak</label><Input value={form.tanggal_mulai_kontrak} onChange={(e) => setForm({ ...form, tanggal_mulai_kontrak: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Akhir Kontrak</label><Input value={form.tanggal_akhir_kontrak} onChange={(e) => setForm({ ...form, tanggal_akhir_kontrak: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Status Kontrak</label><Input value={form.kontrak} onChange={(e) => setForm({ ...form, kontrak: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Keterangan Umum</label><Input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">SPT Tahunan 2024</label><Input value={form.spt_tahunan_2024} onChange={(e) => setForm({ ...form, spt_tahunan_2024: e.target.value })} /></div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 sticky bottom-0 bg-white dark:bg-slate-900 mt-2 pb-2">
              <Button type="submit">
                {editing ? "Simpan Perubahan" : "Tambah Client"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8"
            placeholder="Cari client, NPWP, PIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden flex flex-col border border-slate-200 dark:border-white/10">
        <div className="overflow-auto max-h-[60vh] relative">
          <table className="w-full min-w-max text-xs sm:text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[200px] border-b border-slate-200 dark:border-white/10">Client / WP</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Tipe</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">NPWP</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[150px] border-b border-slate-200 dark:border-white/10">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[150px] border-b border-slate-200 dark:border-white/10">PIC Internal</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[150px] border-b border-slate-200 dark:border-white/10">Link GDrive</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[200px] border-b border-slate-200 dark:border-white/10">Ket. Aktivasi</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[200px] border-b border-slate-200 dark:border-white/10">Ket. Konfirmasi</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Pass DJP</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">NIK OP</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Pass Coretax</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Passphrase</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Kode Aktivasi</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">E-FIN</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[250px] border-b border-slate-200 dark:border-white/10">Alamat</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Pass Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">No Telepon</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">NIK PJ</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">NPWP PJ</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[250px] border-b border-slate-200 dark:border-white/10">Alamat PJ</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Konfirmasi</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Mulai Kontrak</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Akhir Kontrak</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Kontrak</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">Keterangan</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-b border-slate-200 dark:border-white/10">SPT 2024</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap sticky right-0 bg-slate-100 dark:bg-slate-800 z-30 border-l border-b border-slate-200 dark:border-white/10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/8">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={28} className="px-4 py-10 text-center text-sm text-slate-400">Tidak ada data client</td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap max-w-[300px] truncate" title={client.name}>{client.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge tone={client.status === "Aktif" ? "green" : client.status === "Prospek" ? "amber" : "slate"}>
                        {client.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{client.type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{client.npwp || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[200px] truncate" title={client.email}>{client.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[200px] truncate" title={client.pic}>{client.pic || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[200px] truncate"><a href={client.link_gdrive} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{client.link_gdrive ? "Buka Link" : "-"}</a></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[250px] truncate" title={client.keterangan_aktivasi}>{client.keterangan_aktivasi || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[250px] truncate" title={client.keterangan_konfirmasi}>{client.keterangan_konfirmasi || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">{client.password_djp || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">{client.nik_op || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">{client.password_coretax || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">{client.passphrase || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">{client.kode_aktivasi || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">{client.efin || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[300px] truncate" title={client.alamat}>{client.alamat || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">{client.password_email || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">{client.no_telepon || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">{client.nik_pj || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">{client.npwp_pj || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[300px] truncate" title={client.alamat_pj}>{client.alamat_pj || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[200px] truncate">{client.konfirmasi || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{client.tanggal_mulai_kontrak || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{client.tanggal_akhir_kontrak || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[200px] truncate">{client.kontrak || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[250px] truncate" title={client.keterangan}>{client.keterangan || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{client.spt_tahunan_2024 || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800/50 z-10 border-l border-slate-100 dark:border-white/10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="secondary" className="px-2 md:px-3 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20" onClick={() => { setDelegating(client); setDelegateForm({ category: "", service: "", pic: "", deadline: "" }); }}>
                          <Send className="h-4 w-4 md:mr-1" />
                          <span className="hidden md:inline">Tugaskan</span>
                        </Button>
                        <Button size="sm" variant="secondary" className="px-2 md:px-3" onClick={() => startEdit(client)}>
                          <Pencil className="h-4 w-4 md:mr-1" />
                          <span className="hidden md:inline">Edit</span>
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" className="px-2 md:px-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => void deleteClient(client.id).then(() => refresh("Client dihapus"))}>
                            <Trash2 className="h-4 w-4 md:mr-1" />
                            <span className="hidden md:inline">Hapus</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delegate Modal */}
      {delegating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Delegasikan Pekerjaan
              </h2>
              <button
                onClick={() => setDelegating(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4 text-xs text-slate-500">
              Klien: <span className="font-semibold text-slate-700 dark:text-slate-300">{delegating.name}</span>
            </div>
            <form className="space-y-4" onSubmit={submitDelegate}>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Kategori Layanan *
                </label>
                <select
                  className={selectClass}
                  value={delegateForm.category}
                  onChange={(e) =>
                    setDelegateForm({ ...delegateForm, category: e.target.value, service: "" })
                  }
                  required
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Jenis Layanan *
                </label>
                <select
                  className={selectClass}
                  value={delegateForm.service}
                  onChange={(e) => setDelegateForm({ ...delegateForm, service: e.target.value })}
                  required
                  disabled={!delegateForm.category}
                >
                  <option value="">-- Pilih Layanan --</option>
                  {categories
                    .find((c) => c.category === delegateForm.category)
                    ?.services.map((srv) => (
                      <option key={srv.name} value={srv.name}>
                        {srv.name} ({srv.basePoints} pts)
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Tugaskan Kepada (PIC) *
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {data?.users
                    ?.filter(
                      (u) =>
                        u.role !== "owner" &&
                        u.name.toLowerCase() !== "tegar" &&
                        u.name.toLowerCase() !== "owner"
                    )
                    .map((user) => {
                      const isSelected = delegateForm.pic.includes(user.name);
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
                              let currentPics = delegateForm.pic
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
                              setDelegateForm({
                                ...delegateForm,
                                pic: currentPics.join(", "),
                              });
                            }}
                          />
                          {user.name}
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Tenggat Waktu
                </label>
                <Input
                  type="date"
                  value={delegateForm.deadline}
                  onChange={(e) => setDelegateForm({ ...delegateForm, deadline: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="w-full">
                  Buat Task
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

