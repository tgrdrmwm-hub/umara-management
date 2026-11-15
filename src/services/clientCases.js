import { supabase } from "./supabase";

const LOCAL_STORAGE_KEY = "umara_client_cases_v2";

export const INITIAL_CLIENT_CASES = [
  {
    id: "case-070",
    nomor_surat: "S-289/WPJ.3202/2024",
    jenis_surat: "SP2DK",
    tahun_pajak: "2020",
    wajib_pajak: "CV Mulya Jaya (PT Berkah Jaya)",
    pic: "Mbak Titin",
    tanggal: "2024-09-13",
    ar_name: "Bpk Joko Santoso",
    skk: true,
    ttd: false,
    ba: false,
    sj: false,
    uraian: "Transaksi penagihan lawan, PPh Badan, PPh impor/pasal 22, PPh 21, Faktur Pajak.",
    penyelesaian: "Berkas sedang dikumpulkan staf, menunggu kelengkapan data klien.",
    status: "Case Berjalan",
    created_at: "2024-09-13T09:00:00.000Z",
    updated_at: "2024-09-13T09:00:00.000Z",
    closed_at: null,
  },
  {
    id: "case-071",
    nomor_surat: "S-375/WPJ./KP.3202/2024",
    jenis_surat: "SP2DK",
    tahun_pajak: "2020",
    wajib_pajak: "Yardan Oktaryani (PT Berkah - Aini)",
    pic: "Aini",
    tanggal: "2024-09-19",
    ar_name: "Dariyanto",
    skk: true,
    ttd: true,
    ba: true,
    sj: false,
    uraian: "Penghasilan neto final & bebas. Rekening yang telah diinput.",
    penyelesaian: "Sudah clear menunggu BA. Ada pembayaran PPh Pengalihan Rp 455.000.",
    status: "Case Berjalan",
    created_at: "2024-09-19T08:30:00.000Z",
    updated_at: "2024-10-02T14:15:00.000Z",
    closed_at: null,
  },
  {
    id: "case-072",
    nomor_surat: "P-1588/P2H/KP.3202/2024",
    jenis_surat: "P2H / Pemeriksaan",
    tahun_pajak: "2023",
    wajib_pajak: "Tentony (PT Berkah - Sigit)",
    pic: "Sigit",
    tanggal: "2024-09-23",
    ar_name: "Teguh Adi Purnawan",
    skk: true,
    ttd: true,
    ba: false,
    sj: false,
    uraian: "Terkait laporan yang telah diajukan, menolak jaminan (SPT).",
    penyelesaian: "Penyusunan draft SPT pembetulan & pembahasan tindak lanjut.",
    status: "Case Berjalan",
    created_at: "2024-09-23T10:00:00.000Z",
    updated_at: "2024-10-01T11:20:00.000Z",
    closed_at: null,
  },
  {
    id: "case-073",
    nomor_surat: "S.00161/SP2DK-01/WPJ.3202/2024",
    jenis_surat: "SP2DK",
    tahun_pajak: "2021-2022",
    wajib_pajak: "PT Sriyono Asty Sentosa",
    pic: "Sdr. Anggun",
    tanggal: "2024-09-23",
    ar_name: "AR KPP Pratama",
    skk: true,
    ttd: true,
    ba: false,
    sj: false,
    uraian: "SPT sudah PTS, klarifikasi pos biaya operasional.",
    penyelesaian: "Berkas sedang diproses oleh staf. Belum cetak BA.",
    status: "Case Berjalan",
    created_at: "2024-09-23T11:30:00.000Z",
    updated_at: "2024-10-05T15:00:00.000Z",
    closed_at: null,
  },
  {
    id: "case-074",
    nomor_surat: "S-579/WPJ.3202/2024",
    jenis_surat: "Pemberitahuan",
    tahun_pajak: "2021-2022",
    wajib_pajak: "Tio Anggun",
    pic: "Sdr. Anggun",
    tanggal: "2024-10-16",
    ar_name: "AR KPP Pratama",
    skk: true,
    ttd: true,
    ba: true,
    sj: false,
    uraian: "SPT sudah PTS, RJT sudah di-acc oleh AR.",
    penyelesaian: "BA dan berkas telah ditandatangani. BA dan file dikirim ke AR tgl 16/10/2024.",
    status: "Case Berjalan",
    created_at: "2024-10-16T09:15:00.000Z",
    updated_at: "2024-10-16T16:00:00.000Z",
    closed_at: null,
  },
  {
    id: "case-075",
    nomor_surat: "S-434/KPP.3202/2024",
    jenis_surat: "Pemberitahuan",
    tahun_pajak: "2021-2022",
    wajib_pajak: "Hermanto Tri Pratomo",
    pic: "Sdr. Anggun",
    tanggal: "2024-10-19",
    ar_name: "AR KPP Pratama",
    skk: true,
    ttd: true,
    ba: true,
    sj: false,
    uraian: "SPT sudah PTS, RJT dan file ke AR telah di-acc.",
    penyelesaian: "BA dan file dsb dikirim ke AR tgl 26/10/2024.",
    status: "Case Berjalan",
    created_at: "2024-10-19T10:00:00.000Z",
    updated_at: "2024-10-26T17:00:00.000Z",
    closed_at: null,
  },
  {
    id: "case-068",
    nomor_surat: "S-112/WPJ.3202/2024",
    jenis_surat: "SP2DK",
    tahun_pajak: "2021",
    wajib_pajak: "PT Indo Makmur Cemerlang",
    pic: "Aini",
    tanggal: "2024-08-01",
    ar_name: "Bpk Bambang",
    skk: true,
    ttd: true,
    ba: true,
    sj: true,
    uraian: "Pemeriksaan selisih omzet PPN dan SPT Tahunan 2021.",
    penyelesaian: "Surat Jawaban (SJ) dan Berita Acara LHP2DK terbit tgl 28/08/2024. Kasus tuntas.",
    status: "Case Close",
    created_at: "2024-08-01T08:00:00.000Z",
    updated_at: "2024-08-28T11:00:00.000Z",
    closed_at: "2024-08-28T11:00:00.000Z",
  },
];

function normalizeRow(raw) {
  if (!raw) return null;
  return {
    id: raw.id || `case-${Date.now()}`,
    nomor_surat: raw.nomor_surat || raw.case_number || "",
    jenis_surat: raw.jenis_surat || raw.tax_letter_type || "SP2DK",
    tahun_pajak: raw.tahun_pajak || raw.tax_year || "",
    wajib_pajak: raw.wajib_pajak || raw.client_name || "",
    pic: raw.pic || raw.pic_name || "",
    tanggal: raw.tanggal || raw.received_date || new Date().toISOString().split("T")[0],
    ar_name: raw.ar_name || "",
    skk: raw.skk !== undefined ? Boolean(raw.skk) : Boolean(raw.stage_dk),
    ttd: raw.ttd !== undefined ? Boolean(raw.ttd) : Boolean(raw.stage_ar_meeting),
    ba: raw.ba !== undefined ? Boolean(raw.ba) : Boolean(raw.stage_ba),
    sj: raw.sj !== undefined ? Boolean(raw.sj) : Boolean(raw.stage_close),
    uraian: raw.uraian || raw.notes || "",
    penyelesaian: raw.penyelesaian || "",
    status: raw.status || (raw.sj ? "Case Close" : "Case Berjalan"),
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
    closed_at: raw.closed_at || null,
  };
}

export function getLocalClientCases() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_CLIENT_CASES));
      return INITIAL_CLIENT_CASES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizeRow);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_CLIENT_CASES));
    return INITIAL_CLIENT_CASES;
  } catch (err) {
    console.warn("Failed to read client cases from localStorage:", err);
    return INITIAL_CLIENT_CASES;
  }
}

export function saveLocalClientCases(cases) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cases));
  } catch (err) {
    console.warn("Failed to save client cases to localStorage:", err);
  }
}

export async function fetchClientCases() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("client_cases")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const normalized = data.map(normalizeRow);
        saveLocalClientCases(normalized);
        return normalized;
      }

      if (error && (error.code === "PGRST205" || error.code === "42P01")) {
        console.info("Table client_cases not found in Supabase, using local fallback storage.");
      }
    } catch (err) {
      console.warn("Supabase fetchClientCases failed, falling back to local:", err);
    }
  }

  return getLocalClientCases();
}

export async function createClientCase(caseData) {
  const isClose = caseData.status === "Case Close" || Boolean(caseData.sj);
  const newRecord = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `case-${Date.now()}`,
    nomor_surat: (caseData.nomor_surat || caseData.case_number || "").trim(),
    jenis_surat: caseData.jenis_surat || caseData.tax_letter_type || "SP2DK",
    tahun_pajak: (caseData.tahun_pajak || caseData.tax_year || "").trim(),
    wajib_pajak: (caseData.wajib_pajak || caseData.client_name || "").trim(),
    pic: (caseData.pic || caseData.pic_name || "").trim(),
    tanggal: caseData.tanggal || caseData.received_date || new Date().toISOString().split("T")[0],
    ar_name: (caseData.ar_name || "").trim(),
    skk: Boolean(caseData.skk),
    ttd: Boolean(caseData.ttd),
    ba: Boolean(caseData.ba),
    sj: Boolean(caseData.sj),
    uraian: (caseData.uraian || "").trim(),
    penyelesaian: (caseData.penyelesaian || "").trim(),
    status: isClose ? "Case Close" : "Case Berjalan",
    created_by: caseData.created_by || "Staff",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    closed_at: isClose ? new Date().toISOString() : null,
  };

  // Try Supabase first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("client_cases")
        .insert({
          id: newRecord.id,
          case_number: newRecord.nomor_surat,
          jenis_surat: newRecord.jenis_surat,
          tahun_pajak: newRecord.tahun_pajak,
          wajib_pajak: newRecord.wajib_pajak,
          pic: newRecord.pic,
          tanggal: newRecord.tanggal,
          ar_name: newRecord.ar_name,
          skk: newRecord.skk,
          ttd: newRecord.ttd,
          ba: newRecord.ba,
          sj: newRecord.sj,
          uraian: newRecord.uraian,
          penyelesaian: newRecord.penyelesaian,
          status: newRecord.status,
          created_by: newRecord.created_by,
        })
        .select()
        .single();

      if (!error && data) {
        const norm = normalizeRow(data);
        const currentList = getLocalClientCases();
        saveLocalClientCases([norm, ...currentList]);
        return norm;
      }
    } catch (err) {
      console.warn("Supabase createClientCase failed, saving to local fallback:", err);
    }
  }

  // Fallback local
  const currentList = getLocalClientCases();
  const updatedList = [newRecord, ...currentList];
  saveLocalClientCases(updatedList);
  return newRecord;
}

export async function updateClientCase(id, updates) {
  const isClose =
    updates.status !== undefined
      ? updates.status === "Case Close"
      : updates.sj !== undefined
        ? Boolean(updates.sj)
        : undefined;

  const payload = {
    ...updates,
    ...(isClose !== undefined ? { status: isClose ? "Case Close" : "Case Berjalan" } : {}),
    ...(isClose === true ? { closed_at: updates.closed_at || new Date().toISOString() } : {}),
    ...(isClose === false ? { closed_at: null } : {}),
    updated_at: new Date().toISOString(),
  };

  if (supabase && !id.startsWith("case-")) {
    try {
      const dbPayload = {
        ...(payload.nomor_surat !== undefined ? { case_number: payload.nomor_surat } : {}),
        ...(payload.jenis_surat !== undefined ? { jenis_surat: payload.jenis_surat } : {}),
        ...(payload.tahun_pajak !== undefined ? { tahun_pajak: payload.tahun_pajak } : {}),
        ...(payload.wajib_pajak !== undefined ? { wajib_pajak: payload.wajib_pajak } : {}),
        ...(payload.pic !== undefined ? { pic: payload.pic } : {}),
        ...(payload.tanggal !== undefined ? { tanggal: payload.tanggal } : {}),
        ...(payload.ar_name !== undefined ? { ar_name: payload.ar_name } : {}),
        ...(payload.skk !== undefined ? { skk: payload.skk } : {}),
        ...(payload.ttd !== undefined ? { ttd: payload.ttd } : {}),
        ...(payload.ba !== undefined ? { ba: payload.ba } : {}),
        ...(payload.sj !== undefined ? { sj: payload.sj } : {}),
        ...(payload.uraian !== undefined ? { uraian: payload.uraian } : {}),
        ...(payload.penyelesaian !== undefined ? { penyelesaian: payload.penyelesaian } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.closed_at !== undefined ? { closed_at: payload.closed_at } : {}),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("client_cases")
        .update(dbPayload)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        const norm = normalizeRow(data);
        const currentList = getLocalClientCases();
        const nextList = currentList.map((item) => (item.id === id ? { ...item, ...norm } : item));
        saveLocalClientCases(nextList);
        return norm;
      }
    } catch (err) {
      console.warn("Supabase updateClientCase failed, using local update:", err);
    }
  }

  // Fallback local
  const currentList = getLocalClientCases();
  const nextList = currentList.map((item) => (item.id === id ? { ...item, ...payload } : item));
  saveLocalClientCases(nextList);
  return nextList.find((item) => item.id === id);
}

export async function deleteClientCase(id) {
  if (supabase && !id.startsWith("case-")) {
    try {
      const { error } = await supabase.from("client_cases").delete().eq("id", id);
      if (!error) {
        const currentList = getLocalClientCases();
        saveLocalClientCases(currentList.filter((item) => item.id !== id));
        return true;
      }
    } catch (err) {
      console.warn("Supabase deleteClientCase failed:", err);
    }
  }

  const currentList = getLocalClientCases();
  saveLocalClientCases(currentList.filter((item) => item.id !== id));
  return true;
}
