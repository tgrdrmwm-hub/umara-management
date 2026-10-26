import { X, Info, CheckCircle2, AlertTriangle, Calculator, Clock, Calendar } from "lucide-react";
import { formatRupiah } from "../../utils/payrollCalculator";
import { Button } from "../ui/Button";

export function AuditFormulaModal({ isOpen, onClose, payrollItem, monthStr }) {
  if (!isOpen || !payrollItem) return null;

  const item = payrollItem;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-white/10 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Audit & Transparansi Rumus Penggajian
              </h3>
              <p className="text-xs text-slate-500">
                Staf: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.staffName}</span> • Periode {monthStr}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* Quick Summary Banner */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">
                Skenario & Jabatan
              </span>
              <span className="font-bold text-sm text-slate-100">
                {item.scenarioName} (Simbol {item.positionSymbol}: {item.positionTitle})
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">
                Total Gaji Bersih
              </span>
              <span className="font-black text-lg text-emerald-400">
                {formatRupiah(item.totalGaji)}
              </span>
            </div>
          </div>

          {/* Audit Cards per Formula */}
          <div className="space-y-3">
            {/* 1. Gaji Pokok */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-slate-800/40">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>1. Gaji Pokok</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatRupiah(item.gajiPokok)}
                </span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                • Target standar: 26 hari kerja ({formatRupiah(item.gajiPokokStandar)} / bulan).
                <br />
                • Tarif per hari kerja masuk: <strong className="text-slate-800 dark:text-slate-200">{formatRupiah(item.dailyRate)}</strong>.
                <br />
                • Realisasi kehadiran staf: <strong className="text-slate-800 dark:text-slate-200">{item.hariMasuk} hari</strong>.
                <br />
                • <strong>Perhitungan:</strong> {item.hariMasuk >= 26 ? `Mencapai target penuh (>= 26 hari) → Rp ${item.gajiPokokStandar.toLocaleString("id-ID")}` : `${item.hariMasuk} hari masuk x ${formatRupiah(item.dailyRate)} = ${formatRupiah(item.gajiPokok)}`}
              </p>
            </div>

            {/* 2. Uang Makan */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-slate-800/40">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>2. Tunjangan Uang Makan</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatRupiah(item.uangMakan)}
                </span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                • Tarif: <strong className="text-slate-800 dark:text-slate-200">{formatRupiah(item.uangMakanPerHari)} / hari</strong>.
                <br />
                • <span className="text-amber-700 dark:text-amber-400 font-medium">Aturan Khusus:</span> Jika terlambat pada hari itu, uang makan <strong className="text-rose-600 dark:text-rose-400">HANGUS</strong>.
                <br />
                • Hari hadir tepat waktu: <strong className="text-emerald-700 dark:text-emerald-400">{item.hariTepatWaktu} hari</strong> (Dapat Uang Makan).
                <br />
                • Hari terlambat: <strong className="text-rose-600 dark:text-rose-400">{item.hariTerlambat} hari</strong> (Hangus {formatRupiah(item.uangMakanHangus)}).
                <br />
                • <strong>Perhitungan:</strong> {item.hariTepatWaktu} x {formatRupiah(item.uangMakanPerHari)} = {formatRupiah(item.uangMakan)}
              </p>
            </div>

            {/* 3. Uang Transport */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-slate-800/40">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>3. Tunjangan Uang Transport</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatRupiah(item.uangTransport)}
                </span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                • Tarif: <strong className="text-slate-800 dark:text-slate-200">{formatRupiah(item.transportPerHari)} / hari</strong>.
                <br />
                • <span className="text-amber-700 dark:text-amber-400 font-medium">Aturan Khusus:</span> Jika terlambat pada hari itu, uang transport <strong className="text-amber-600 dark:text-amber-400">DIPOTONG 50%</strong> (sisa {formatRupiah(item.transportPerHari * 0.5)}).
                <br />
                • Hari tepat waktu: {item.hariTepatWaktu} x {formatRupiah(item.transportPerHari)} = {formatRupiah(item.hariTepatWaktu * item.transportPerHari)}
                <br />
                • Hari terlambat: {item.hariTerlambat} x {formatRupiah(item.transportPerHari * 0.5)} = {formatRupiah(item.hariTerlambat * item.transportPerHari * 0.5)}
                <br />
                • <strong>Perhitungan:</strong> {formatRupiah(item.hariTepatWaktu * item.transportPerHari)} + {formatRupiah(item.hariTerlambat * item.transportPerHari * 0.5)} = {formatRupiah(item.uangTransport)}
              </p>
            </div>

            {/* 4. Uang Tertib */}
            <div className={`p-3.5 rounded-xl border ${item.isOrderlyForfeited ? "border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20" : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"}`}>
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  4. Uang Tertib (Disiplin Waktu)
                  {item.isOrderlyForfeited ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300">
                      HANGUS
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      DITERIMA UTUH
                    </span>
                  )}
                </span>
                <span className={`font-bold ${item.isOrderlyForfeited ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {formatRupiah(item.uangTertib)}
                </span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                • Besaran standar: <strong className="text-slate-800 dark:text-slate-200">Rp 260.000 / bulan</strong>.
                <br />
                • <span className="font-semibold text-slate-700 dark:text-slate-300">Aturan Mutlak:</span> Jika terlambat <strong>1 kali saja</strong> dalam periode bulan ini, uang tertib <strong>HANGUS menjadi Rp 0</strong>.
                <br />
                • Status staf: {item.isOrderlyForfeited ? (
                  <span className="text-rose-700 dark:text-rose-400 font-semibold">
                    Tercatat {item.hariTerlambat}x terlambat pada log presensi → Uang tertib tidak dapat dicairkan.
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    Tertib sempurna 0x terlambat → Berhak menerima penuh Rp 260.000.
                  </span>
                )}
              </p>
            </div>

            {/* 5. Uang Jabatan */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-slate-800/40">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>5. Uang Jabatan (Simbol {item.positionSymbol})</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatRupiah(item.uangJabatan)}
                </span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                • Dipilih langsung oleh Bu Uma menggunakan kode simbol jabatan:
                <br />
                - Simbol A (Staff Admin / Administrative Assistant): Rp 250.000
                <br />
                - Simbol B (Tax Assistant / Tax Junior): Rp 400.000
                <br />
                - Simbol C (Tax Associate / Junior Consultant / HRD): Rp 550.000
                <br />
                - Simbol D (Tax Senior / Senior Consultant): Rp 800.000
              </p>
            </div>

            {/* 6. Uang Lembur */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-slate-800/40">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>6. Uang Lembur (Overtime)</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatRupiah(item.uangLembur)}
                </span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                • <strong>Formula Ketenagakerjaan:</strong> 1/173 x (Gaji Pokok + Total Tunjangan Tetap Standar).
                <br />
                • Basis Upah per Jam = {formatRupiah(item.upahDasarLembur)} / 173 = <strong className="text-slate-800 dark:text-slate-200">{formatRupiah(item.rateLemburPerJam)} / jam</strong>.
                <br />
                • Total Jam Lembur: <strong className="text-slate-800 dark:text-slate-200">{item.jamLembur} Jam</strong>.
                <br />
                • <strong>Perhitungan:</strong> {item.jamLembur} jam x {formatRupiah(item.rateLemburPerJam)} = {formatRupiah(item.uangLembur)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-white/10 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup Audit
          </Button>
        </div>
      </div>
    </div>
  );
}
