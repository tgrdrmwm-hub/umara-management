import {
  Download,
  FileDown,
  FileUp,
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  Send,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  Layers,
  Calendar,
  MoveHorizontal,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAppData } from "../hooks/useAppData";
import {
  createClient,
  deleteClient,
  updateClient,
  createTask,
} from "../services/database";
import { useAuth } from "../hooks/useAuth";
import { taxServiceDefinitions, taxServices } from "../constants/taxServices";

const emptyClient = {
  name: "",
  kontrak: "Bulanan",
  pic: "",
  pph_25: false,
  pph_final: false,
  ppn: false,
  pph_21: false,
  npwp: "",
  type: "Badan",
  status: "Aktif",
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
  keterangan: "",
  spt_tahunan_2024: "",
};

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20";

export function isPicSelected(picString, userName) {
  if (!picString || !userName) return false;
  const target = userName.toLowerCase().trim();
  const tokens = picString
    .split(/[,/&\-–—]|\bdan\b/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return tokens.some((token) => {
    if (token === target) return true;
    const words = token.split(/\s+/);
    return words.includes(target);
  });
}

export function resolveClientPics(clientPic, users = []) {
  if (!clientPic) return "";
  const staffUsers = (users || []).filter(
    (u) =>
      u.role !== "owner" &&
      u.name.toLowerCase() !== "tegar" &&
      u.name.toLowerCase() !== "owner"
  );

  const matched = staffUsers.filter((u) => isPicSelected(clientPic, u.name));
  if (matched.length > 0) {
    return matched.map((u) => u.name).join(", ");
  }
  return clientPic;
}

export const CORE_CLIENT_SERVICES = [
  {
    key: "pph_25",
    service: "PPh 25",
    label: "PPh 25",
    columnLabel: "PPH 25",
    category: "SPT Masa",
  },
  {
    key: "pph_final",
    service: "PPh Final",
    label: "PPh Final",
    columnLabel: "PPH FINAL",
    category: "SPT Masa",
  },
  {
    key: "ppn",
    service: "PPN",
    label: "PPN",
    columnLabel: "PPN",
    category: "SPT Masa",
  },
  {
    key: "pph_21",
    service: "PPh 21/26",
    label: "PPh 21",
    columnLabel: "PPH 21",
    category: "SPT Masa",
  },
];

export function getClientActiveServices(client) {
  const active = [];
  const isTahunan = (client?.kontrak || "").toLowerCase().includes("tahun");
  const isBadan = (client?.type || "Badan").toLowerCase().includes("badan");

  // 4 Kolom Utama Pajak Klien (Sesuai urutan tabel: PPH 25, PPH FINAL, PPN, PPH 21)
  if (client?.pph_25) {
    active.push({
      category: "SPT Masa",
      service: "PPh 25",
      label: "PPh 25",
    });
  }
  if (client?.pph_final) {
    active.push({
      category: "SPT Masa",
      service: "PPh Final",
      label: "PPh Final",
    });
  }
  if (client?.ppn) {
    active.push({
      category: "SPT Masa",
      service: "PPN",
      label: "PPN",
    });
  }
  if (client?.pph_21) {
    active.push({
      category: "SPT Masa",
      service: "PPh 21/26",
      label: "PPh 21",
    });
  }

  // Jika kontrak tahunan
  if (isTahunan) {
    active.push({
      category: "SPT Tahunan",
      service: isBadan ? "SPT Badan" : "SPT Orang Pribadi",
      label: isBadan ? "SPT Tahunan Badan" : "SPT Tahunan OP",
    });
  }

  // Fallback defaults jika belum ada flag aktif
  if (active.length === 0) {
    if (isTahunan) {
      active.push({
        category: "SPT Tahunan",
        service: isBadan ? "SPT Badan" : "SPT Orang Pribadi",
        label: isBadan ? "SPT Tahunan Badan" : "SPT Tahunan OP",
      });
    } else {
      active.push({
        category: "SPT Masa",
        service: "PPN",
        label: "PPN",
      });
    }
  }

  return active;
}

export function ClientsPage() {
  const { data } = useAppData();
  const { user: currentUser } = useAuth();
  const isAdmin = ["owner", "developer", "manager", "admin"].includes(
    currentUser?.role,
  );
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [contractFilter, setContractFilter] = useState("all"); // "all" | "Bulanan" | "Tahunan"
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [showForm, setShowForm] = useState(false);
  const [viewingDetail, setViewingDetail] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // 25, 50, 100, "all"

  // Delegation state (Mendukung multi-layanan sekaligus)
  const [delegating, setDelegating] = useState(null);
  const [delegateForm, setDelegateForm] = useState({
    category: "SPT Masa",
    services: [], // Daftar layanan terpilih (bisa 1, 2, 3, 4 atau lebih)
    pic: "",
    deadline: "",
  });
  const [showOtherCategories, setShowOtherCategories] = useState(false);


  function openDelegateModal(client) {
    const autoPic = resolveClientPics(client.pic, data?.users);
    const activeServices = getClientActiveServices(client);
    // Otomatis centang semua layanan yang aktif pada klien ini
    const initialServices = activeServices.map((as) => as.service);

    setDelegating(client);
    setShowOtherCategories(false);
    setDelegateForm({
      category: "SPT Masa",
      services: initialServices.length > 0 ? initialServices : ["PPN"],
      pic: autoPic || (currentUser?.name && !isAdmin ? currentUser.name : ""),
      deadline: "",
    });
  }

  // Drag-to-scroll / swipe state (bisa digeser langsung seperti layar HP)
  const tableContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollPosition = useCallback(() => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkScrollPosition();
    window.addEventListener("resize", checkScrollPosition);
    return () => window.removeEventListener("resize", checkScrollPosition);
  }, [checkScrollPosition]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const handleMouseDown = (e) => {
    if (e.target.closest("button, a, input, select, textarea, .no-drag")) return;
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - (tableContainerRef.current?.offsetLeft || 0));
    setScrollLeftPos(tableContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !tableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - (tableContainerRef.current.offsetLeft || 0);
    const walk = (x - startX) * 1.5; // swipe multiplier
    if (Math.abs(walk) > 4) {
      setHasDragged(true);
    }
    tableContainerRef.current.scrollLeft = scrollLeftPos - walk;
    checkScrollPosition();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const scrollTable = (direction) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({
        left: direction === "left" ? -280 : 280,
        behavior: "smooth",
      });
      setTimeout(checkScrollPosition, 350);
    }
  };

  const rawClients = useMemo(() => data?.clients ?? [], [data?.clients]);

  // Counts for filter tabs
  const counts = useMemo(() => {
    let bulanan = 0;
    let tahunan = 0;
    for (const c of rawClients) {
      const k = (c.kontrak || "").toLowerCase();
      if (k.includes("bulan")) bulanan++;
      else if (k.includes("tahun")) tahunan++;
    }
    return {
      all: rawClients.length,
      bulanan,
      tahunan,
    };
  }, [rawClients]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return rawClients.filter((c) => {
      // Contract Filter
      if (contractFilter === "Bulanan") {
        if (!(c.kontrak || "").toLowerCase().includes("bulan")) return false;
      } else if (contractFilter === "Tahunan") {
        if (!(c.kontrak || "").toLowerCase().includes("tahun")) return false;
      }

      // Search query
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return [c.name, c.kontrak, c.pic, c.npwp, c.email]
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }, [rawClients, contractFilter, search]);

  // Paginated clients
  const paginatedClients = useMemo(() => {
    if (pageSize === "all") return filteredClients;
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  const totalPages =
    pageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredClients.length / pageSize));

  // Reset page when filter or search changes
  function handleContractFilterChange(type) {
    setContractFilter(type);
    setCurrentPage(1);
  }

  function handleSearchChange(e) {
    setSearch(e.target.value);
    setCurrentPage(1);
  }

  const categories = useMemo(() => {
    if (!data?.taxServices || data.taxServices.length === 0)
      return taxServiceDefinitions;
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
    if (message) toast.success(message);
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
    if (!delegateForm.services || delegateForm.services.length === 0) {
      return toast.error("Silakan pilih minimal satu jenis layanan untuk didelegasikan");
    }
    if (!delegateForm.pic) {
      return toast.error("PIC wajib diisi");
    }

    try {
      const createdNames = [];
      for (const srvName of delegateForm.services) {
        const srvObj = taxServices.find((i) => i.name === srvName);
        const points = srvObj ? Number(srvObj.basePoints ?? 0.25) : 0.25;

        await createTask({
          title: `[${srvName}] ${delegating.name}`,
          client: delegating.name,
          notes: `Tugas ${srvName} untuk klien ${delegating.name}`,
          pic: delegateForm.pic,
          deadline: delegateForm.deadline || null,
          status: "todo",
          points: points,
          is_overtime: false,
        });
        createdNames.push(srvName);
      }

      await refresh(
        createdNames.length > 1
          ? `${createdNames.length} tugas (${createdNames.join(", ")}) berhasil didelegasikan ke Task Board!`
          : `Tugas [${createdNames[0]}] berhasil didelegasikan ke Task Board!`,
      );
      setDelegating(null);
      setDelegateForm({
        category: "SPT Masa",
        services: [],
        pic: "",
        deadline: "",
      });
    } catch (err) {
      console.error(err);
      toast.error(
        "Gagal mendelegasikan pekerjaan: " + (err?.message || "Unknown error"),
      );
    }
  }

  function startEdit(client) {
    setEditing(client);
    setForm({
      name: client.name || "",
      kontrak: client.kontrak || "Bulanan",
      pic: client.pic || "",
      pph_25: Boolean(client.pph_25),
      pph_final: Boolean(client.pph_final),
      ppn: Boolean(client.ppn),
      pph_21: Boolean(client.pph_21),
      npwp: client.npwp || "",
      type: client.type || "Badan",
      status: client.status || "Aktif",
      email: client.email || "",
      link_gdrive: client.link_gdrive || "",
      keterangan_aktivasi: client.keterangan_aktivasi || "",
      keterangan_konfirmasi: client.keterangan_konfirmasi || "",
      password_djp: client.password_djp || "",
      nik_op: client.nik_op || "",
      password_coretax: client.password_coretax || "",
      passphrase: client.passphrase || "",
      kode_aktivasi: client.kode_aktivasi || "",
      efin: client.efin || "",
      alamat: client.alamat || "",
      password_email: client.password_email || "",
      no_telepon: client.no_telepon || "",
      nik_pj: client.nik_pj || "",
      npwp_pj: client.npwp_pj || "",
      alamat_pj: client.alamat_pj || "",
      konfirmasi: client.konfirmasi || "",
      tanggal_mulai_kontrak: client.tanggal_mulai_kontrak || "",
      tanggal_akhir_kontrak: client.tanggal_akhir_kontrak || "",
      keterangan: client.keterangan || "",
      spt_tahunan_2024: client.spt_tahunan_2024 || "",
    });
    setShowForm(true);
    setViewingDetail(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyClient);
  }

  function exportCsv() {
    const headers = [
      "No",
      "NAMA WAJIB PAJAK",
      "KONTRAK",
      "PPH 25",
      "PPH FINAL",
      "PPN",
      "PPH 21",
      "PIC",
    ];

    const rows = [
      headers,
      ...filteredClients.map((c, idx) => [
        idx + 1,
        c.name || "",
        c.kontrak || "Bulanan",
        c.pph_25 ? "TRUE" : "FALSE",
        c.pph_final ? "TRUE" : "FALSE",
        c.ppn ? "TRUE" : "FALSE",
        c.pph_21 ? "TRUE" : "FALSE",
        c.pic || "",
      ]),
    ];

    downloadCsv(`list-klien-${contractFilter}.csv`, rows);
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

          const toastId = toast.loading("Mengimpor data klien...");

          for (const row of results.data) {
            const name =
              row["NAMA WAJIB PAJAK"] ||
              row["name"] ||
              row["Client"] ||
              row["Nama Client"] ||
              "";
            if (!name.trim()) continue;

            const kontrak = (row["KONTRAK"] || row["kontrak"] || "Bulanan").trim();
            const pph25 = String(row["PPH 25"] || row["pph_25"] || "").toUpperCase() === "TRUE";
            const pphFinal = String(row["PPH FINAL"] || row["pph_final"] || "").toUpperCase() === "TRUE";
            const ppn = String(row["PPN"] || row["ppn"] || "").toUpperCase() === "TRUE";
            const pph21 = String(row["PPH 21"] || row["pph_21"] || "").toUpperCase() === "TRUE";
            const pic = (row["PIC"] || row["pic"] || "").trim();

            try {
              await createClient({
                name: name.trim(),
                kontrak,
                pic,
                pph_25: pph25,
                pph_final: pphFinal,
                ppn,
                pph_21: pph21,
                status: "Aktif",
                type:
                  name.toUpperCase().startsWith("PT") ||
                  name.toUpperCase().startsWith("CV") ||
                  name.toUpperCase().startsWith("UD")
                    ? "Badan"
                    : "OP",
              });
              successCount++;
            } catch {
              failCount++;
            }
          }

          toast.dismiss(toastId);
          toast.success(
            `Berhasil mengimpor ${successCount} klien.` +
              (failCount > 0 ? ` Gagal: ${failCount}.` : ""),
          );
          await refresh("Data klien diperbarui");
          e.target.value = "";
        },
        error: (error) => {
          toast.error("Gagal membaca file CSV: " + error.message);
          e.target.value = "";
        },
      });
    });
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Data Klien
            </h1>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {counts.all} Total Klien
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Daftar wajib pajak Umara Tax - Klasifikasi Bulanan & Tahunan
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="shadow-sm"
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
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Tambah Klien</span>
          </Button>

          <label className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 h-9 px-3.5 py-2 cursor-pointer shadow-sm">
            <FileUp className="h-4 w-4" />
            <span>Import CSV</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={importCsv}
            />
          </label>

          <Button
            variant="secondary"
            onClick={exportCsv}
            className="px-3.5 shadow-sm"
          >
            <Download className="h-4 w-4 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => window.print()}
            className="px-3 shadow-sm"
            title="Cetak atau simpan PDF"
          >
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Buttons & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Buttons Filter: Bulanan / Tahunan / Semua */}
        <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-sm self-start">
          <button
            type="button"
            onClick={() => handleContractFilterChange("all")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              contractFilter === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Semua</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                contractFilter === "all"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  : "bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400"
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleContractFilterChange("Bulanan")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              contractFilter === "Bulanan"
                ? "bg-blue-600 text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Bulanan</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                contractFilter === "Bulanan"
                  ? "bg-blue-500/80 text-white"
                  : "bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400"
              }`}
            >
              {counts.bulanan}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleContractFilterChange("Tahunan")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              contractFilter === "Tahunan"
                ? "bg-indigo-600 text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Tahunan</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                contractFilter === "Tahunan"
                  ? "bg-indigo-500/80 text-white"
                  : "bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400"
              }`}
            >
              {counts.tahunan}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64 md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9 pr-8 h-9 text-sm"
              placeholder="Cari nama WP, PIC, kontrak..."
              value={search}
              onChange={handleSearchChange}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form Card (Tambah / Edit Client) */}
      {showForm && (
        <Card className="p-5 border-blue-200 dark:border-blue-900/40 shadow-md">
          <div className="mb-4 flex items-center justify-between border-b pb-3 border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {editing ? `Edit Klien: ${editing.name}` : "Tambah Klien Baru"}
              </h2>
            </div>
            <button
              onClick={closeForm}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/8"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form
            className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-2"
            onSubmit={(e) => void submit(e)}
          >
            {/* Informasi Pokok (Sesuai Kolom CSV) */}
            <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-200/60 dark:bg-slate-800/40 dark:border-white/5">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                Informasi Utama (CSV)
              </h3>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nama Wajib Pajak (Klien) *
                  </label>
                  <Input
                    required
                    placeholder="Contoh: PT ABC MAKMUR SEJAHTERA"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Kontrak *
                  </label>
                  <select
                    className={selectClass}
                    value={form.kontrak}
                    onChange={(e) => setForm({ ...form, kontrak: e.target.value })}
                  >
                    <option value="Bulanan">Bulanan</option>
                    <option value="Tahunan">Tahunan</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-3">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    PIC Petugas Pajak (Internal)
                  </label>
                  <Input
                    placeholder="Contoh: Anggun - Intan / Azizah - Septi / Aulia - Nita"
                    value={form.pic}
                    onChange={(e) => setForm({ ...form, pic: e.target.value })}
                  />
                </div>
              </div>

              {/* Checkboxes Layanan PPh & PPN */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  Kewajiban Perpajakan (Centang jika Aktif):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={form.pph_25}
                      onChange={(e) =>
                        setForm({ ...form, pph_25: e.target.checked })
                      }
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      PPh 25
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={form.pph_final}
                      onChange={(e) =>
                        setForm({ ...form, pph_final: e.target.checked })
                      }
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      PPh Final
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={form.ppn}
                      onChange={(e) =>
                        setForm({ ...form, ppn: e.target.checked })
                      }
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      PPN
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={form.pph_21}
                      onChange={(e) =>
                        setForm({ ...form, pph_21: e.target.checked })
                      }
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      PPh 21
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Informasi Pelengkap (NPWP, Akun, DJP, Alamat, dll.) */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-1 mb-3 text-sm">
                Informasi Pelengkap & Akun Perpajakan
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    NPWP
                  </label>
                  <Input
                    placeholder="00.000.000.0-000.000"
                    value={form.npwp}
                    onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Tipe WP
                  </label>
                  <select
                    className={selectClass}
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="Badan">Badan</option>
                    <option value="OP">Orang Pribadi (OP)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Status Klien
                  </label>
                  <select
                    className={selectClass}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Prospek">Prospek</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Email Klien
                  </label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    No Telepon / WhatsApp
                  </label>
                  <Input
                    value={form.no_telepon}
                    onChange={(e) => setForm({ ...form, no_telepon: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Link Google Drive
                  </label>
                  <Input
                    placeholder="https://drive.google.com/..."
                    value={form.link_gdrive}
                    onChange={(e) => setForm({ ...form, link_gdrive: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Alamat Lengkap
                  </label>
                  <Input
                    value={form.alamat}
                    onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Kredensial DJP & Coretax */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-1 mb-3 text-sm">
                Akses DJP Online & Coretax
              </h3>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Password DJP
                  </label>
                  <Input
                    value={form.password_djp}
                    onChange={(e) => setForm({ ...form, password_djp: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Password Coretax
                  </label>
                  <Input
                    value={form.password_coretax}
                    onChange={(e) =>
                      setForm({ ...form, password_coretax: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Passphrase
                  </label>
                  <Input
                    value={form.passphrase}
                    onChange={(e) => setForm({ ...form, passphrase: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    E-FIN
                  </label>
                  <Input
                    value={form.efin}
                    onChange={(e) => setForm({ ...form, efin: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/10 mt-2 pb-1">
              <Button type="submit">
                {editing ? "Simpan Perubahan" : "Simpan Klien"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tabel Klien (Disesuaikan Persis Kolom CSV + Drag to Scroll seperti HP) */}
      <Card className="overflow-hidden flex flex-col border border-slate-200 dark:border-white/10 shadow-sm relative">
        {/* Bar Navigasi Swipe / Drag */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
              <MoveHorizontal className="h-3 w-3 animate-pulse" />
            </span>
            <span className="font-medium text-[11px] sm:text-xs">
              Geser tabel ke kiri / kanan untuk melihat kolom lengkap
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => scrollTable("left")}
              disabled={!canScrollLeft}
              title="Geser ke kiri"
              className="inline-flex items-center justify-center h-6 sm:h-7 px-2 sm:px-2.5 gap-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition text-[11px] font-medium shadow-2xs"
            >
              <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>Kiri</span>
            </button>
            <button
              type="button"
              onClick={() => scrollTable("right")}
              disabled={!canScrollRight}
              title="Geser ke kanan"
              className="inline-flex items-center justify-center h-6 sm:h-7 px-2 sm:px-2.5 gap-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition text-[11px] font-medium shadow-2xs"
            >
              <span>Kanan</span>
              <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={tableContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onScroll={checkScrollPosition}
          className={`overflow-x-auto relative no-scrollbar select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x pan-y",
          }}
        >
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10 select-none">
              <tr>
                <th className="px-3.5 py-3 font-semibold text-slate-700 dark:text-slate-300 w-12 text-center">
                  No
                </th>
                <th className="px-3.5 py-3 font-semibold text-slate-700 dark:text-slate-300 min-w-[170px] sm:min-w-[240px]">
                  NAMA WAJIB PAJAK
                </th>
                <th className="px-3.5 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center w-28">
                  KONTRAK
                </th>
                <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center w-24">
                  PPH 25
                </th>
                <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center w-24">
                  PPH FINAL
                </th>
                <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center w-24">
                  PPN
                </th>
                <th className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 text-center w-24">
                  PPH 21
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 min-w-[170px]">
                  PIC
                </th>
                <th className="px-3.5 py-3 font-semibold text-slate-900 dark:text-slate-100 text-right lg:sticky lg:right-0 bg-slate-50 dark:bg-slate-800 z-10 lg:border-l border-slate-200 dark:border-white/10 no-drag lg:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.08)]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500"
                  >
                    Tidak ada data klien yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client, index) => {
                  const seqNumber =
                    pageSize === "all"
                      ? index + 1
                      : (currentPage - 1) * pageSize + index + 1;

                  const isBulanan = (client.kontrak || "")
                    .toLowerCase()
                    .includes("bulan");

                  return (
                    <tr
                      key={client.id}
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Nomor Urut */}
                      <td className="px-3.5 py-3 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
                        {seqNumber}
                      </td>

                      {/* Nama Wajib Pajak */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            onClick={() => {
                              if (!hasDragged) setViewingDetail(client);
                            }}
                            title="Klik untuk melihat rincian lengkap"
                          >
                            {client.name}
                          </span>
                          {client.type === "Badan" ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Badan
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                              OP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kontrak */}
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        {isBulanan ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40">
                            Bulanan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/40">
                            Tahunan
                          </span>
                        )}
                      </td>

                      {/* PPH 25 */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {client.pph_25 ? (
                          <span className="inline-flex items-center justify-center h-6 px-2 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/30">
                            <Check className="h-3.5 w-3.5 mr-0.5" /> TRUE
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-xs font-mono">
                            FALSE
                          </span>
                        )}
                      </td>

                      {/* PPH FINAL */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {client.pph_final ? (
                          <span className="inline-flex items-center justify-center h-6 px-2 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/30">
                            <Check className="h-3.5 w-3.5 mr-0.5" /> TRUE
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-xs font-mono">
                            FALSE
                          </span>
                        )}
                      </td>

                      {/* PPN */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {client.ppn ? (
                          <span className="inline-flex items-center justify-center h-6 px-2 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/30">
                            <Check className="h-3.5 w-3.5 mr-0.5" /> TRUE
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-xs font-mono">
                            FALSE
                          </span>
                        )}
                      </td>

                      {/* PPH 21 */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {client.pph_21 ? (
                          <span className="inline-flex items-center justify-center h-6 px-2 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/30">
                            <Check className="h-3.5 w-3.5 mr-0.5" /> TRUE
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-xs font-mono">
                            FALSE
                          </span>
                        )}
                      </td>

                      {/* PIC */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {client.pic ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-white/10">
                            <User className="h-3 w-3 text-blue-500" />
                            {client.pic}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-right lg:sticky lg:right-0 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800/80 z-10 lg:border-l border-slate-100 dark:border-white/10 no-drag lg:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Tugaskan ke Task Board"
                            onClick={() => openDelegateModal(client)}
                            className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            title="Lihat Detail Lengkap"
                            onClick={() => setViewingDetail(client)}
                            className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                          >
                            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>

                          <button
                            type="button"
                            title="Edit Klien"
                            onClick={() => startEdit(client)}
                            className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              title="Hapus Klien"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Apakah Anda yakin ingin menghapus "${client.name}"?`,
                                  )
                                ) {
                                  void deleteClient(client.id).then(() =>
                                    refresh("Klien dihapus"),
                                  );
                                }
                              }}
                              className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan{" "}
              <strong className="font-semibold text-slate-900 dark:text-slate-200">
                {filteredClients.length === 0
                  ? 0
                  : (currentPage - 1) * (pageSize === "all" ? 0 : pageSize) + 1}
              </strong>{" "}
              -{" "}
              <strong className="font-semibold text-slate-900 dark:text-slate-200">
                {pageSize === "all"
                  ? filteredClients.length
                  : Math.min(currentPage * pageSize, filteredClients.length)}
              </strong>{" "}
              dari{" "}
              <strong className="font-semibold text-slate-900 dark:text-slate-200">
                {filteredClients.length}
              </strong>{" "}
              klien
            </span>

            <div className="flex items-center gap-1.5 ml-4">
              <span>Per baris:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val =
                    e.target.value === "all" ? "all" : Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">Semua</option>
              </select>
            </div>
          </div>

          {pageSize !== "all" && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Button>

              <span className="px-2 font-medium">
                Halaman {currentPage} dari {totalPages}
              </span>

              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Modal Detail Klien */}
      {viewingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-xl max-h-[85vh] overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-start justify-between border-b pb-3 border-slate-100 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {viewingDetail.name}
                  </h2>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      viewingDetail.kontrak === "Tahunan"
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    }`}
                  >
                    {viewingDetail.kontrak || "Bulanan"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tipe: {viewingDetail.type} • Status: {viewingDetail.status}
                </p>
              </div>
              <button
                onClick={() => setViewingDetail(null)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs sm:text-sm">
              {/* Kewajiban Pajak */}
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Kewajiban Pajak:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div
                    className={`p-2.5 rounded-lg border text-center font-medium ${
                      viewingDetail.pph_25
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/40"
                    }`}
                  >
                    PPh 25: {viewingDetail.pph_25 ? "✓ Aktif" : "-"}
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border text-center font-medium ${
                      viewingDetail.pph_final
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/40"
                    }`}
                  >
                    PPh Final: {viewingDetail.pph_final ? "✓ Aktif" : "-"}
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border text-center font-medium ${
                      viewingDetail.ppn
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/40"
                    }`}
                  >
                    PPN: {viewingDetail.ppn ? "✓ Aktif" : "-"}
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border text-center font-medium ${
                      viewingDetail.pph_21
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/40"
                    }`}
                  >
                    PPh 21: {viewingDetail.pph_21 ? "✓ Aktif" : "-"}
                  </div>
                </div>
              </div>

              {/* Info PIC & Pajak */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <div>
                  <span className="text-slate-500 block text-xs">PIC Petugas:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingDetail.pic || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">NPWP:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {viewingDetail.npwp || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Email:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {viewingDetail.email || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">No. Telepon:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {viewingDetail.no_telepon || "-"}
                  </span>
                </div>
              </div>

              {/* Akses & Kredensial */}
              {(viewingDetail.password_djp ||
                viewingDetail.password_coretax ||
                viewingDetail.efin) && (
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    Akses Kredensial:
                  </h4>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg font-mono text-xs">
                    <div>
                      <span className="text-slate-500 block">DJP:</span>
                      <span>{viewingDetail.password_djp || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Coretax:</span>
                      <span>{viewingDetail.password_coretax || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">E-FIN:</span>
                      <span>{viewingDetail.efin || "-"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-3 border-slate-100 dark:border-white/10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewingDetail(null)}
              >
                Tutup
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="text-blue-600 dark:text-blue-400"
                onClick={() => {
                  const c = viewingDetail;
                  setViewingDetail(null);
                  openDelegateModal(c);
                }}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                Tugaskan
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const c = viewingDetail;
                  startEdit(c);
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit Klien
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delegate Modal (Multi-Layanan Sekaligus) */}
      {delegating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between border-b pb-3 border-slate-100 dark:border-white/10">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Delegasikan Tugas Klien
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilih satu atau beberapa layanan sekaligus untuk dibuatkan task ke Board
                </p>
              </div>
              <button
                onClick={() => setDelegating(null)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/8 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Info Klien */}
            <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-slate-800/60 p-3 text-xs space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px]">
                    Nama Klien:
                  </span>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {delegating.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    {delegating.kontrak || "Bulanan"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/70 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    {delegating.type || "Badan"}
                  </span>
                </div>
              </div>
              {delegating.pic && (
                <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-white/5">
                  PIC Default Terdaftar:{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {delegating.pic}
                  </span>
                </div>
              )}
            </div>

            <form className="space-y-4" onSubmit={submitDelegate}>
              {/* 4 Layanan Utama Klien (PPH 25, PPH FINAL, PPN, PPH 21) */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Pilihan Layanan Pajak (Bisa Pilih Banyak) *
                    </label>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      {delegateForm.services.length} dipilih
                    </span>
                  </div>

                  {/* Tombol Aksi Cepat */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const activeList = CORE_CLIENT_SERVICES.filter((cs) =>
                          Boolean(delegating[cs.key]),
                        ).map((cs) => cs.service);
                        if (
                          (delegating?.kontrak || "")
                            .toLowerCase()
                            .includes("tahun")
                        ) {
                          const isBadan = (delegating?.type || "Badan")
                            .toLowerCase()
                            .includes("badan");
                          activeList.push(
                            isBadan ? "SPT Badan" : "SPT Orang Pribadi",
                          );
                        }
                        setDelegateForm((prev) => ({
                          ...prev,
                          services: Array.from(new Set(activeList)),
                        }));
                      }}
                      className="font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                    >
                      Pilih Yang Aktif
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allFour = CORE_CLIENT_SERVICES.map(
                          (cs) => cs.service,
                        );
                        setDelegateForm((prev) => ({
                          ...prev,
                          services: allFour,
                        }));
                      }}
                      className="font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Pilih 4 Layanan
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDelegateForm((prev) => ({ ...prev, services: [] }))
                      }
                      className="font-medium text-rose-500 hover:text-rose-700"
                    >
                      Batal
                    </button>
                  </div>
                </div>

                {/* 4 Card Pilihan Layanan Pajak */}
                <div className="grid grid-cols-2 gap-2">
                  {CORE_CLIENT_SERVICES.map((item) => {
                    const isClientActive = Boolean(delegating[item.key]);
                    const isSelected = delegateForm.services.includes(
                      item.service,
                    );

                    return (
                      <label
                        key={item.service}
                        className={`relative flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer select-none ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-slate-800/60 dark:hover:border-white/20"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setDelegateForm((prev) => {
                              const current = prev.services || [];
                              const updated = checked
                                ? [...current, item.service]
                                : current.filter((s) => s !== item.service);
                              return { ...prev, services: updated };
                            });
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {item.label}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              0.25 pt
                            </span>
                          </div>
                          <div className="mt-1">
                            {isClientActive ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <Check className="h-3 w-3 mr-0.5" /> TRUE (Aktif)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800">
                                FALSE
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Tambahan jika Klien Kontrak Tahunan */}
                {(delegating?.kontrak || "").toLowerCase().includes("tahun") &&
                  (() => {
                    const isBadan = (delegating?.type || "Badan")
                      .toLowerCase()
                      .includes("badan");
                    const tahunanSrv = isBadan
                      ? "SPT Badan"
                      : "SPT Orang Pribadi";
                    const isSelected =
                      delegateForm.services.includes(tahunanSrv);
                    return (
                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer select-none mt-2 ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/40 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-slate-800/60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setDelegateForm((prev) => {
                              const current = prev.services || [];
                              const updated = checked
                                ? [...current, tahunanSrv]
                                : current.filter((s) => s !== tahunanSrv);
                              return { ...prev, services: updated };
                            });
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                              {isBadan
                                ? "SPT Tahunan Badan"
                                : "SPT Tahunan Orang Pribadi"}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              0.25 pt
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                              ✓ Kontrak Tahunan
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })()}

                {/* Section Tambah Layanan Kategori Lain */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowOtherCategories(!showOtherCategories)}
                    className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <span>
                      {showOtherCategories ? "− Tutup" : "+ Tambah"} Layanan dari Kategori Lain
                    </span>
                    <span className="text-[10px] text-slate-400">
                      (Coretax, Akuntansi, Perizinan, dll)
                    </span>
                  </button>

                  {showOtherCategories && (
                    <div className="mt-2.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-white/10 dark:bg-slate-800/40 space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Pilih Kategori:
                        </label>
                        <select
                          className={selectClass}
                          value={delegateForm.category}
                          onChange={(e) =>
                            setDelegateForm((prev) => ({
                              ...prev,
                              category: e.target.value,
                            }))
                          }
                        >
                          {categories.map((cat) => (
                            <option key={cat.category} value={cat.category}>
                              {cat.category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Pilih Layanan dalam {delegateForm.category}:
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                          {categories
                            .find((c) => c.category === delegateForm.category)
                            ?.services.map((srv) => {
                              const isSelected =
                                delegateForm.services.includes(srv.name);
                              return (
                                <button
                                  key={srv.name}
                                  type="button"
                                  onClick={() => {
                                    setDelegateForm((prev) => {
                                      const current = prev.services || [];
                                      const updated = isSelected
                                        ? current.filter((s) => s !== srv.name)
                                        : [...current, srv.name];
                                      return { ...prev, services: updated };
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                                    isSelected
                                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-white/10"
                                  }`}
                                >
                                  {srv.name} ({srv.basePoints} pt){" "}
                                  {isSelected ? "✓" : "+"}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PIC Selector */}
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Tugaskan Kepada (PIC) *
                  </label>
                  <div className="flex items-center gap-2">
                    {currentUser?.name && (
                      <button
                        type="button"
                        onClick={() => {
                          setDelegateForm((prev) => ({
                            ...prev,
                            pic: currentUser.name,
                          }));
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                      >
                        Tugaskan ke Saya ({currentUser.name})
                      </button>
                    )}
                    {delegateForm.pic && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Terpilih: {delegateForm.pic}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {data?.users
                    ?.filter(
                      (u) =>
                        u.role !== "owner" &&
                        u.name.toLowerCase() !== "tegar" &&
                        u.name.toLowerCase() !== "owner",
                    )
                    .map((user) => {
                      const isSelected = isPicSelected(
                        delegateForm.pic,
                        user.name,
                      );
                      return (
                        <label
                          key={user.id}
                          className={`cursor-pointer select-none rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={(e) => {
                              let currentPics = delegateForm.pic
                                ? delegateForm.pic
                                    .split(/[,/&\-–—]|\bdan\b/i)
                                    .map((p) => p.trim())
                                    .filter(Boolean)
                                : [];

                              if (e.target.checked) {
                                if (
                                  !isPicSelected(delegateForm.pic, user.name)
                                ) {
                                  currentPics.push(user.name);
                                }
                              } else {
                                currentPics = currentPics.filter(
                                  (p) => !isPicSelected(p, user.name),
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

              {/* Deadline */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Tenggat Waktu (Opsional)
                </label>
                <Input
                  type="date"
                  value={delegateForm.deadline}
                  onChange={(e) =>
                    setDelegateForm({
                      ...delegateForm,
                      deadline: e.target.value,
                    })
                  }
                />
              </div>

              {/* Submit / Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDelegating(null)}
                  className="w-1/3"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={delegateForm.services.length === 0}
                  className="w-2/3 flex items-center justify-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {delegateForm.services.length === 0
                      ? "Pilih Minimal 1 Layanan"
                      : delegateForm.services.length === 1
                      ? `Buat 1 Task`
                      : `Buat ${delegateForm.services.length} Task Sekaligus`}
                  </span>
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
