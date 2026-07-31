import { Download, FileDown, FileUp, Plus, Search } from "lucide-react";
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

export function ClientsPage() {
  const { data } = useAppData();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [showForm, setShowForm] = useState(false);
  const clients = (data?.clients ?? []).filter((client) =>
    [client.name, client.npwp, client.pic, client.email]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  async function refresh(message) {
    await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    toast.success(message);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) return toast.error("Nama client wajib diisi");
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
    });
    setShowForm(true);
  }

  function exportCsv() {
    const rows = [
      ["Client", "NPWP", "Type", "PIC", "Status", "Email"],
      ...clients.map((client) => [
        client.name,
        client.npwp,
        client.type,
        client.pic,
        client.status,
        client.email,
      ]),
    ];
    downloadCsv("clients-umara.csv", rows);
  }

  return (
    <Page
      title="Client Management"
      subtitle="CRUD, search, filter, import/export Excel & PDF."
    >
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setShowForm((value) => !value);
            setEditing(null);
            setForm(emptyClient);
          }}
        >
          <Plus className="h-4 w-4" />
          Client
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.info(
              "Import CSV belum diaktifkan. Gunakan form tambah client untuk saat ini.",
            )
          }
        >
          <FileUp className="h-4 w-4" />
          Import
        </Button>
        <Button variant="secondary" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          Excel
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          <FileDown className="h-4 w-4" />
          PDF
        </Button>
      </div>
      {showForm && (
        <Card className="p-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => void submit(event)}
          >
            <Input
              placeholder="Nama client"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
            <Input
              placeholder="NPWP"
              value={form.npwp}
              onChange={(event) =>
                setForm({ ...form, npwp: event.target.value })
              }
            />
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950"
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value })
              }
            >
              <option value="Badan">Badan</option>
              <option value="OP">OP</option>
            </select>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="Aktif">Aktif</option>
              <option value="Prospek">Prospek</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
            <Input
              placeholder="PIC"
              value={form.pic}
              onChange={(event) =>
                setForm({ ...form, pic: event.target.value })
              }
            />
            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
            <div className="flex gap-2 md:col-span-2">
              <Button>{editing ? "Update Client" : "Simpan Client"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setForm(emptyClient);
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search client..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-white/5">
            <tr>
              <th className="p-3">Client</th>
              <th>NPWP</th>
              <th>Type</th>
              <th>PIC</th>
              <th>Status</th>
              <th>Email</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="p-3 font-semibold">{client.name}</td>
                <td>{client.npwp}</td>
                <td>{client.type}</td>
                <td>{client.pic}</td>
                <td>
                  <Badge tone={client.status === "Aktif" ? "green" : "amber"}>
                    {client.status}
                  </Badge>
                </td>
                <td>{client.email}</td>
                <td>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startEdit(client)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void deleteClient(client.id).then(() =>
                          refresh("Client dihapus"),
                        )
                      }
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}

function Page({ title, subtitle, children }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
