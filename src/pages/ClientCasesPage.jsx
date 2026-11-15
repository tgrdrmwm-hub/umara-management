import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  Download,
  Eye,
  Calendar,
  User,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { useClientCases } from "../hooks/useClientCases";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";

const LETTER_TYPES = [
  "SP2DK",
  "P2H / Pemeriksaan",
  "Pemberitahuan",
  "Imbauan",
  "STP",
  "SKP",
  "Keberatan",
  "Lainnya",
];

const CHECKLIST_ITEMS = [
  { key: "skk", label: "SKK", desc: "Surat Kuasa Khusus" },
  { key: "ttd", label: "TTD", desc: "Tanda Tangan" },
  { key: "ba", label: "BA", desc: "Berita Acara" },
  { key: "sj", label: "SJ", desc: "Surat Jawaban" },
];

const emptyCaseForm = {
  nomor_surat: "",
  jenis_surat: "SP2DK",
  tahun_pajak: new Date().getFullYear().toString(),
  wajib_pajak: "",
  pic: "",
  tanggal: new Date().toISOString().split("T")[0],
  ar_name: "",
  skk: false,
  ttd: false,
  ba: false,
  sj: false,
  uraian: "",
  penyelesaian: "",
  status: "Case Berjalan",
};

export function ClientCasesPage() {
  const { user } = useAuth();
  const { data: appData } = useAppData();
  const {
    cases,
    isLoading,
    createCase,
    updateCase,
    deleteCase,
    isCreating,
    isUpdating,
    isDeleting,
  } = useClientCases();

  // URL Search Params: ?status=berjalan or ?status=close
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status");

  // Determine active status: "berjalan" (default) or "close"
  const isCloseView = statusParam === "close";

  // Search filter
  const [search, setSearch] = useState("");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [formData, setFormData] = useState(emptyCaseForm);
  const [detailCase, setDetailCase] = useState(null);
  const [caseToDelete, setCaseToDelete] = useState(null);

  // Close Confirmation Modal State
  const [caseToClose, setCaseToClose] = useState(null);
  const [closingNote, setClosingNote] = useState("");
  const [autoMarkSj, setAutoMarkSj] = useState(true);
  const [isClosingAction, setIsClosingAction] = useState(false);

  // Reopen Confirmation Modal State
  const [caseToReopen, setCaseToReopen] = useState(null);
  const [isReopeningAction, setIsReopeningAction] = useState(false);

  // Drag-to-scroll state (geser tabel pakai klik kiri tahan)
  const tableContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
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
    const handleResize = () => checkScrollPosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [checkScrollPosition, cases]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const handleMouseDown = (e) => {
    // Jangan drag jika yang diklik adalah tombol, input, link, atau modal
    if (e.target.closest("button, a, input, select, textarea, .no-drag")) return;
    setIsDragging(true);
    setStartX(e.pageX - (tableContainerRef.current?.offsetLeft || 0));
    setScrollLeftPos(tableContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !tableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - (tableContainerRef.current.offsetLeft || 0);
    const walk = (x - startX) * 1.5; // drag multiplier
    tableContainerRef.current.scrollLeft = scrollLeftPos - walk;
    checkScrollPosition();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const scrollTable = (direction) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
      setTimeout(checkScrollPosition, 350);
    }
  };

  // Suggestions for Form
  const clientOptions = useMemo(() => {
    const list = (appData?.clients || []).map((c) => c.name).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [appData?.clients]);

  const picOptions = useMemo(() => {
    const fromUsers = (appData?.users || []).map((u) => u.name).filter(Boolean);
    const fromCases = cases.map((c) => c.pic).filter(Boolean);
    return Array.from(new Set([...fromUsers, ...fromCases])).sort();
  }, [appData?.users, cases]);

  // Filtered List based on view (Case Berjalan vs Case Close) and search
  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      // Status filter
      if (isCloseView && item.status !== "Case Close") return false;
      if (!isCloseView && item.status === "Case Close") return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchSurat = item.nomor_surat?.toLowerCase().includes(q);
        const matchWP = item.wajib_pajak?.toLowerCase().includes(q);
        const matchPic = item.pic?.toLowerCase().includes(q);
        const matchAr = item.ar_name?.toLowerCase().includes(q);
        const matchJenis = item.jenis_surat?.toLowerCase().includes(q);
        const matchTahun = item.tahun_pajak?.toLowerCase().includes(q);
        const matchUraian = item.uraian?.toLowerCase().includes(q);
        const matchPenyelesaian = item.penyelesaian?.toLowerCase().includes(q);
        if (
          !matchSurat &&
          !matchWP &&
          !matchPic &&
          !matchAr &&
          !matchJenis &&
          !matchTahun &&
          !matchUraian &&
          !matchPenyelesaian
        ) {
          return false;
        }
      }

      return true;
    });
  }, [cases, isCloseView, search]);

  // Quick toggle for checklist columns: SKK, TTD, BA, SJ
  async function handleToggleChecklist(item, key) {
    const nextVal = !item[key];
    const updates = { [key]: nextVal };

    // If staff checks SJ, open close confirmation modal
    if (key === "sj" && nextVal && item.status === "Case Berjalan") {
      handlePromptClose(item);
      return;
    }

    try {
      await updateCase({ id: item.id, updates });
      toast.success(`${key.toUpperCase()} diperbarui untuk ${item.nomor_surat}`);
    } catch {
      toast.error(`Gagal mengubah ${key.toUpperCase()}`);
    }
  }

  // Open Close Confirmation Modal
  function handlePromptClose(item) {
    setCaseToClose(item);
    setClosingNote(item.penyelesaian || "");
    setAutoMarkSj(true);
  }

  // Execute Case Close Confirmation
  async function handleConfirmCloseCase() {
    if (!caseToClose) return;
    try {
      setIsClosingAction(true);
      const updates = {
        status: "Case Close",
        closed_at: new Date().toISOString(),
        penyelesaian: closingNote.trim() || caseToClose.penyelesaian,
      };
      if (autoMarkSj) {
        updates.sj = true;
      }

      await updateCase({
        id: caseToClose.id,
        updates,
      });

      toast.success(`Kasus ${caseToClose.nomor_surat} berhasil ditutup (Case Close).`);
      setCaseToClose(null);
      if (detailCase && detailCase.id === caseToClose.id) {
        setDetailCase({ ...detailCase, ...updates });
      }
    } catch (err) {
      toast.error(`Gagal menutup kasus: ${err?.message || "Terjadi kesalahan"}`);
    } finally {
      setIsClosingAction(false);
    }
  }

  // Execute Reopen Case Confirmation
  async function handleConfirmReopenCase() {
    if (!caseToReopen) return;
    try {
      setIsReopeningAction(true);
      const updates = {
        status: "Case Berjalan",
        closed_at: null,
      };

      await updateCase({
        id: caseToReopen.id,
        updates,
      });

      toast.success(`Kasus ${caseToReopen.nomor_surat} dibuka kembali ke Case Berjalan.`);
      setCaseToReopen(null);
      if (detailCase && detailCase.id === caseToReopen.id) {
        setDetailCase({ ...detailCase, ...updates });
      }
    } catch (err) {
      toast.error(`Gagal membuka kasus: ${err?.message || "Terjadi kesalahan"}`);
    } finally {
      setIsReopeningAction(false);
    }
  }

  // Open Form Modal
  function handleOpenForm(caseToEdit = null) {
    if (caseToEdit) {
      setEditingCase(caseToEdit);
      setFormData({
        nomor_surat: caseToEdit.nomor_surat || "",
        jenis_surat: caseToEdit.jenis_surat || "SP2DK",
        tahun_pajak: caseToEdit.tahun_pajak || "",
        wajib_pajak: caseToEdit.wajib_pajak || "",
        pic: caseToEdit.pic || "",
        tanggal: caseToEdit.tanggal || new Date().toISOString().split("T")[0],
        ar_name: caseToEdit.ar_name || "",
        skk: Boolean(caseToEdit.skk),
        ttd: Boolean(caseToEdit.ttd),
        ba: Boolean(caseToEdit.ba),
        sj: Boolean(caseToEdit.sj),
        uraian: caseToEdit.uraian || "",
        penyelesaian: caseToEdit.penyelesaian || "",
        status: caseToEdit.status || "Case Berjalan",
      });
    } else {
      setEditingCase(null);
      setFormData({
        ...emptyCaseForm,
        status: isCloseView ? "Case Close" : "Case Berjalan",
        pic: user?.name || user?.email || "",
      });
    }
    setIsFormModalOpen(true);
  }

  // Submit Form
  async function handleSubmitForm(e) {
    e.preventDefault();
    if (!formData.nomor_surat.trim()) {
      toast.error("Nomor Surat wajib diisi.");
      return;
    }
    if (!formData.wajib_pajak.trim()) {
      toast.error("Wajib Pajak (Klien) wajib diisi.");
      return;
    }

    try {
      if (editingCase) {
        await updateCase({
          id: editingCase.id,
          updates: formData,
        });
        toast.success(`Data kasus ${formData.nomor_surat} berhasil disimpan.`);
      } else {
        await createCase({
          ...formData,
          created_by: user?.name || user?.email || "Staff",
        });
        toast.success(`Kasus baru ${formData.nomor_surat} berhasil ditambahkan.`);
      }
      setIsFormModalOpen(false);
      setEditingCase(null);
    } catch (err) {
      toast.error(`Gagal menyimpan: ${err?.message || "Terjadi kesalahan"}`);
    }
  }

  // Delete
  async function handleConfirmDelete() {
    if (!caseToDelete) return;
    try {
      await deleteCase(caseToDelete.id);
      toast.success(`Kasus ${caseToDelete.nomor_surat} berhasil dihapus.`);
      setCaseToDelete(null);
    } catch {
      toast.error("Gagal menghapus data kasus.");
    }
  }

  // Export CSV
  function handleExportCsv() {
    if (!filteredCases.length) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }

    const headers = [
      "No",
      "Nomor Surat",
      "Jenis Surat",
      "Tahun Pajak",
      "Wajib Pajak",
      "PIC",
      "Tanggal",
      "SKK",
      "TTD",
      "BA",
      "SJ",
      "Uraian",
      "Penyelesaian",
      "Status",
    ];

    const rows = filteredCases.map((item, idx) => [
      idx + 1,
      `"${(item.nomor_surat || "").replace(/"/g, '""')}"`,
      `"${(item.jenis_surat || "").replace(/"/g, '""')}"`,
      `"${(item.tahun_pajak || "").replace(/"/g, '""')}"`,
      `"${(item.wajib_pajak || "").replace(/"/g, '""')}"`,
      `"${(item.pic || "").replace(/"/g, '""')}"`,
      item.tanggal || "",
      item.skk ? "V" : "-",
      item.ttd ? "V" : "-",
      item.ba ? "V" : "-",
      item.sj ? "V" : "-",
      `"${(item.uraian || "").replace(/"/g, '""')}"`,
      `"${(item.penyelesaian || "").replace(/"/g, '""')}"`,
      item.status || "Case Berjalan",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Umara_Cases_${isCloseView ? "Close" : "Berjalan"}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("File CSV berhasil diunduh.");
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Header Bersih & Ringkas */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm ${
              isCloseView ? "bg-emerald-600" : "bg-blue-600"
            }`}
          >
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {isCloseView ? "Case Close" : "Case Berjalan"}
              </h1>
              <Badge tone={isCloseView ? "green" : "blue"} className="text-[10px] font-bold">
                {filteredCases.length} Kasus
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isCloseView
                ? "Daftar berkas kasus surat pajak yang sudah selesai / tuntas ditangani."
                : "Daftar berkas surat masuk KPP yang sedang aktif diproses staf."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 h-8 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenForm()}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Kasus</span>
          </Button>
        </div>
      </div>

      {/* SEARCH BAR (Hanya Search) */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Cari nomor surat, jenis surat, wajib pajak, PIC, AR, uraian, penyelesaian..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* TABEL DATA KASUS */}
      {isLoading ? (
        <Card className="p-10 text-center text-slate-400">
          <Clock className="h-7 w-7 mx-auto animate-spin mb-2 text-blue-500" />
          <p className="text-xs">Memuat data kasus...</p>
        </Card>
      ) : filteredCases.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h3 className="mt-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
            {search ? "Tidak Ada Hasil Pencarian" : "Belum Ada Data Kasus"}
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500 max-w-sm mx-auto">
            {search
              ? "Tidak ditemukan data yang cocok dengan kata kunci pencarian."
              : isCloseView
                ? "Belum ada berkas kasus yang diselesaikan (Case Close)."
                : "Klik tombol '+ Tambah Kasus' untuk mulai mencatat surat masuk."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border-slate-200/80 dark:border-white/10 shadow-xs relative">
          {/* Baris Navigasi Scroll & Petunjuk Geser */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <MoveHorizontal className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>Geser tabel: <strong>klik kiri tahan lalu geser mouse</strong> ke samping</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollTable("left")}
                disabled={!canScrollLeft}
                className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none transition flex items-center gap-0.5 text-[10px]"
                title="Geser ke Kiri"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Kiri</span>
              </button>
              <button
                type="button"
                onClick={() => scrollTable("right")}
                disabled={!canScrollRight}
                className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none transition flex items-center gap-0.5 text-[10px]"
                title="Geser ke Kanan"
              >
                <span>Kanan</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={tableContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onScroll={checkScrollPosition}
            className={`overflow-x-auto relative select-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-200">
                  <th className="py-2.5 px-2.5 w-10 text-center font-bold">No</th>
                  <th className="py-2.5 px-3 min-w-[190px]">Nomor Surat</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Jenis Surat</th>
                  <th className="py-2.5 px-2.5 min-w-[90px] text-center">Tahun Pajak</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Wajib Pajak</th>
                  <th className="py-2.5 px-3 min-w-[110px]">PIC</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Tanggal</th>
                  <th
                    className="py-2.5 px-2 text-center w-12 bg-indigo-50/60 dark:bg-indigo-950/20 border-l border-slate-200 dark:border-white/10"
                    title="Surat Kuasa Khusus"
                  >
                    SKK
                  </th>
                  <th
                    className="py-2.5 px-2 text-center w-12 bg-indigo-50/60 dark:bg-indigo-950/20"
                    title="Tanda Tangan"
                  >
                    TTD
                  </th>
                  <th
                    className="py-2.5 px-2 text-center w-12 bg-indigo-50/60 dark:bg-indigo-950/20"
                    title="Berita Acara"
                  >
                    BA
                  </th>
                  <th
                    className="py-2.5 px-2 text-center w-12 bg-indigo-50/60 dark:bg-indigo-950/20 border-r border-slate-200 dark:border-white/10"
                    title="Surat Jawaban"
                  >
                    SJ
                  </th>
                  <th className="py-2.5 px-3 min-w-[220px]">Uraian</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Penyelesaian</th>
                  <th className="py-2.5 px-2.5 min-w-[120px] text-center">Status</th>
                  <th className="py-2.5 px-2.5 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredCases.map((item, index) => {
                  const isClosed = item.status === "Case Close";

                  return (
                    <tr
                      key={item.id}
                      className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isClosed ? "bg-slate-50/40 dark:bg-slate-900/40 opacity-90" : ""
                      }`}
                    >
                      {/* No */}
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-400">
                        {index + 1}
                      </td>

                      {/* Nomor Surat */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                          {item.nomor_surat}
                        </div>
                        {item.ar_name && (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                            <span className="text-slate-400">AR:</span> {item.ar_name}
                          </div>
                        )}
                      </td>

                      {/* Jenis Surat */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300">
                          {item.jenis_surat}
                        </span>
                      </td>

                      {/* Tahun Pajak */}
                      <td className="py-2.5 px-2.5 text-center font-medium text-slate-700 dark:text-slate-300">
                        {item.tahun_pajak || "-"}
                      </td>

                      {/* Wajib Pajak */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {item.wajib_pajak}
                        </div>
                      </td>

                      {/* PIC */}
                      <td className="py-2.5 px-3">
                        <Badge tone="purple" className="text-[11px]">
                          <User className="h-3 w-3" />
                          <span>{item.pic || "Unassigned"}</span>
                        </Badge>
                      </td>

                      {/* Tanggal */}
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{item.tanggal || "-"}</span>
                        </div>
                      </td>

                      {/* SKK */}
                      <td className="py-2.5 px-2 text-center bg-indigo-50/30 dark:bg-indigo-950/10 border-l border-slate-200 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(item, "skk")}
                          title={`SKK: ${item.skk ? "Sudah Ada" : "Belum Ada"} (Klik untuk ubah)`}
                          className={`h-6 w-6 mx-auto rounded flex items-center justify-center transition-all ${
                            item.skk
                              ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                              : "bg-slate-200 text-slate-400 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-500"
                          }`}
                        >
                          {item.skk ? (
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          ) : (
                            <span className="text-[10px] font-bold">-</span>
                          )}
                        </button>
                      </td>

                      {/* TTD */}
                      <td className="py-2.5 px-2 text-center bg-indigo-50/30 dark:bg-indigo-950/10">
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(item, "ttd")}
                          title={`TTD: ${item.ttd ? "Sudah TTD" : "Belum TTD"} (Klik untuk ubah)`}
                          className={`h-6 w-6 mx-auto rounded flex items-center justify-center transition-all ${
                            item.ttd
                              ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                              : "bg-slate-200 text-slate-400 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-500"
                          }`}
                        >
                          {item.ttd ? (
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          ) : (
                            <span className="text-[10px] font-bold">-</span>
                          )}
                        </button>
                      </td>

                      {/* BA */}
                      <td className="py-2.5 px-2 text-center bg-indigo-50/30 dark:bg-indigo-950/10">
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(item, "ba")}
                          title={`BA: ${item.ba ? "Sudah BA" : "Belum BA"} (Klik untuk ubah)`}
                          className={`h-6 w-6 mx-auto rounded flex items-center justify-center transition-all ${
                            item.ba
                              ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/20"
                              : "bg-slate-200 text-slate-400 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-500"
                          }`}
                        >
                          {item.ba ? (
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          ) : (
                            <span className="text-[10px] font-bold">-</span>
                          )}
                        </button>
                      </td>

                      {/* SJ */}
                      <td className="py-2.5 px-2 text-center bg-indigo-50/30 dark:bg-indigo-950/10 border-r border-slate-200 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(item, "sj")}
                          title={`SJ: ${item.sj ? "Sudah Terbit" : "Belum Terbit"} (Klik untuk ubah)`}
                          className={`h-6 w-6 mx-auto rounded flex items-center justify-center transition-all ${
                            item.sj
                              ? "bg-teal-600 text-white shadow-sm ring-2 ring-teal-500/20"
                              : "bg-slate-200 text-slate-400 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-500"
                          }`}
                        >
                          {item.sj ? (
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          ) : (
                            <span className="text-[10px] font-bold">-</span>
                          )}
                        </button>
                      </td>

                      {/* Uraian */}
                      <td className="py-2.5 px-3">
                        <div
                          onClick={() => setDetailCase(item)}
                          className="cursor-pointer max-w-xs group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        >
                          <p className="line-clamp-2 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                            {item.uraian || "-"}
                          </p>
                        </div>
                      </td>

                      {/* Penyelesaian */}
                      <td className="py-2.5 px-3">
                        <div
                          onClick={() => setDetailCase(item)}
                          className="cursor-pointer max-w-xs group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                        >
                          <p className="line-clamp-2 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {item.penyelesaian || "-"}
                          </p>
                        </div>
                      </td>

                      {/* Status & Konfirmasi */}
                      <td className="py-2.5 px-2.5 text-center">
                        {isClosed ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge tone="green" className="text-[10px] font-semibold gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Case Close</span>
                            </Badge>
                            <button
                              type="button"
                              onClick={() => setCaseToReopen(item)}
                              className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                              title="Buka kembali ke Case Berjalan"
                            >
                              <RotateCcw className="h-2.5 w-2.5" />
                              <span>Buka Kembali</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Badge tone="blue" className="text-[10px] font-semibold">
                              Case Berjalan
                            </Badge>
                            <button
                              type="button"
                              onClick={() => handlePromptClose(item)}
                              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-300/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition"
                              title="Tandai Selesai & Konfirmasi Case Close"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Close Case</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Lihat Detail"
                            onClick={() => setDetailCase(item)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Edit Kasus"
                            onClick={() => handleOpenForm(item)}
                            className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Hapus Kasus"
                            onClick={() => setCaseToDelete(item)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DETAIL MODAL */}
      {detailCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setDetailCase(null)}
            aria-hidden="true"
          />
          <Card className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 z-10">
            <button
              type="button"
              onClick={() => setDetailCase(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Badge tone={detailCase.status === "Case Close" ? "green" : "blue"}>
                {detailCase.status}
              </Badge>
              <span className="text-xs text-slate-400">
                Jenis: {detailCase.jenis_surat}
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {detailCase.nomor_surat}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Wajib Pajak:{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {detailCase.wajib_pajak}
              </strong>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/80 dark:border-white/5">
              <div>
                <span className="text-slate-400 block">PIC Staff</span>
                <span className="font-semibold text-purple-600 dark:text-purple-300">
                  {detailCase.pic || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Tanggal Masuk</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {detailCase.tanggal || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Tahun Pajak</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {detailCase.tahun_pajak || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">AR KPP</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {detailCase.ar_name || "-"}
                </span>
              </div>
            </div>

            {/* Checklist items status */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Status Checklist Dokumen
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CHECKLIST_ITEMS.map((chk) => {
                  const val = Boolean(detailCase[chk.key]);
                  return (
                    <div
                      key={chk.key}
                      className={`p-2 rounded-lg border text-center text-xs ${
                        val
                          ? "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-200"
                          : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/40 dark:border-white/5"
                      }`}
                    >
                      <div className="font-bold">{chk.label}</div>
                      <div className="text-[10px] mt-0.5">
                        {val ? "Sudah Ada" : "Belum Ada"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Uraian */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Uraian
              </h4>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {detailCase.uraian || "Belum ada uraian kasus."}
              </div>
            </div>

            {/* Penyelesaian */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Penyelesaian
              </h4>
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/30 text-xs text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed">
                {detailCase.penyelesaian || "Belum ada catatan penyelesaian."}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
              {detailCase.status === "Case Berjalan" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setDetailCase(null);
                    handlePromptClose(detailCase);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Konfirmasi Case Close</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDetailCase(null);
                    setCaseToReopen(detailCase);
                  }}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Buka Kembali (Reopen)</span>
                </Button>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDetailCase(null);
                    handleOpenForm(detailCase);
                  }}
                  className="gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Kasus</span>
                </Button>
                <Button type="button" size="sm" onClick={() => setDetailCase(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* CONFIRM CASE CLOSE MODAL */}
      {caseToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => !isClosingAction && setCaseToClose(null)}
            aria-hidden="true"
          />

          <Card className="relative w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 z-10 animate-in zoom-in-95 duration-150">
            <button
              type="button"
              disabled={isClosingAction}
              onClick={() => setCaseToClose(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Konfirmasi Case Close
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kasus ini akan ditandai selesai dan dipindahkan ke tab Case Close.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200/80 dark:border-white/5 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Surat:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {caseToClose.nomor_surat}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Wajib Pajak:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {caseToClose.wajib_pajak}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PIC Staff:</span>
                <span className="font-semibold text-purple-600 dark:text-purple-300">
                  {caseToClose.pic || "-"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-white/10">
                <span className="text-slate-500">Kelengkapan Dokumen:</span>
                <div className="flex gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      caseToClose.skk
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    SKK
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      caseToClose.ttd
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    TTD
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      caseToClose.ba
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    BA
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      caseToClose.sj || autoMarkSj
                        ? "bg-teal-100 text-teal-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    SJ
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Penyelesaian Akhir
                </label>
                <textarea
                  rows={3}
                  value={closingNote}
                  onChange={(e) => setClosingNote(e.target.value)}
                  placeholder="Tuliskan catatan penyelesaian akhir (contoh: BA LHP2DK terbit tgl ..., berkas diserahkan ke AR, case closed tanpa temuan/sanksi)..."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoMarkSj}
                  onChange={(e) => setAutoMarkSj(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Otomatis centang Surat Jawaban (SJ) sebagai selesai
                </span>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isClosingAction}
                onClick={() => setCaseToClose(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                loading={isClosingAction}
                onClick={handleConfirmCloseCase}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Konfirmasi Case Close</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* CONFIRM REOPEN MODAL */}
      <ConfirmModal
        isOpen={Boolean(caseToReopen)}
        onClose={() => setCaseToReopen(null)}
        onConfirm={handleConfirmReopenCase}
        title="Buka Kembali Kasus (Reopen)"
        message={`Apakah Anda yakin ingin membuka kembali kasus "${caseToReopen?.nomor_surat}" untuk Wajib Pajak "${caseToReopen?.wajib_pajak}" ke status Case Berjalan?`}
        confirmText="Buka Kembali"
        cancelText="Batal"
        variant="primary"
        icon="info"
        isLoading={isReopeningAction}
      />

      {/* CREATE / EDIT MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsFormModalOpen(false)}
            aria-hidden="true"
          />

          <Card className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 z-10 animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingCase ? "Edit Data Kasus" : "Input Kasus Surat Masuk"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lengkapi rincian berkas surat, PIC, checklist (SKK, TTD, BA, SJ),
                uraian, dan penyelesaian.
              </p>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nomor Surat */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor Surat *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Contoh: S-375/WPJ./KP.3202/2024"
                    value={formData.nomor_surat}
                    onChange={(e) =>
                      setFormData({ ...formData, nomor_surat: e.target.value })
                    }
                    className="text-xs h-9"
                  />
                </div>

                {/* Jenis Surat */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Surat *
                  </label>
                  <select
                    value={formData.jenis_surat}
                    onChange={(e) =>
                      setFormData({ ...formData, jenis_surat: e.target.value })
                    }
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {LETTER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tahun Pajak */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tahun Pajak
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: 2020, 2021-2022"
                    value={formData.tahun_pajak}
                    onChange={(e) =>
                      setFormData({ ...formData, tahun_pajak: e.target.value })
                    }
                    className="text-xs h-9"
                  />
                </div>

                {/* Wajib Pajak */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Wajib Pajak (Klien) *
                  </label>
                  <Input
                    type="text"
                    required
                    list="wp-suggestions"
                    placeholder="Nama Klien / Perusahaan"
                    value={formData.wajib_pajak}
                    onChange={(e) =>
                      setFormData({ ...formData, wajib_pajak: e.target.value })
                    }
                    className="text-xs h-9"
                  />
                  <datalist id="wp-suggestions">
                    {clientOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                {/* PIC */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    PIC Staff *
                  </label>
                  <Input
                    type="text"
                    required
                    list="staff-pic-suggestions"
                    placeholder="Nama PIC Staf"
                    value={formData.pic}
                    onChange={(e) =>
                      setFormData({ ...formData, pic: e.target.value })
                    }
                    className="text-xs h-9"
                  />
                  <datalist id="staff-pic-suggestions">
                    {picOptions.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                {/* Tanggal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Masuk *
                  </label>
                  <Input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal: e.target.value })
                    }
                    className="text-xs h-9"
                  />
                </div>

                {/* AR KPP (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama AR KPP (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: Dariyanto / Bpk Joko"
                    value={formData.ar_name}
                    onChange={(e) =>
                      setFormData({ ...formData, ar_name: e.target.value })
                    }
                    className="text-xs h-9"
                  />
                </div>

                {/* Status: Case Berjalan / Case Close */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Kasus
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Case Berjalan">Case Berjalan</option>
                    <option value="Case Close">Case Close</option>
                  </select>
                </div>
              </div>

              {/* Checklist 4 Dokumen: SKK, TTD, BA, SJ */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Checklist Tahapan (SKK, TTD, BA, SJ)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CHECKLIST_ITEMS.map((chk) => (
                    <label
                      key={chk.key}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                        formData[chk.key]
                          ? "bg-indigo-50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-200"
                          : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-white/10 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(formData[chk.key])}
                        onChange={(e) =>
                          setFormData({ ...formData, [chk.key]: e.target.checked })
                        }
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="font-semibold">{chk.label}</span>
                      <span className="text-[10px] text-slate-400">
                        ({chk.desc})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Uraian */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Uraian
                </label>
                <textarea
                  rows={3}
                  placeholder="Uraian temuan/materi pajak: transaksi lawan transaksi, PPh Badan, PPh 21, draft SPT, dll..."
                  value={formData.uraian}
                  onChange={(e) =>
                    setFormData({ ...formData, uraian: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Penyelesaian */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Penyelesaian
                </label>
                <textarea
                  rows={3}
                  placeholder="Tindak lanjut penyelesaian: BA telah ditandatangani, file dsb dikirim ke AR tgl ..., pembayaran PPh pengalihan, dll..."
                  value={formData.penyelesaian}
                  onChange={(e) =>
                    setFormData({ ...formData, penyelesaian: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsFormModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isCreating || isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingCase ? "Simpan Perubahan" : "Simpan Kasus"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(caseToDelete)}
        onClose={() => setCaseToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Kasus"
        message={`Apakah Anda yakin ingin menghapus data kasus "${caseToDelete?.nomor_surat}" untuk Wajib Pajak "${caseToDelete?.wajib_pajak}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
