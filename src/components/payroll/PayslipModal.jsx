import { useRef } from "react";
import { Printer, X, Download, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { formatRupiah, terbilang } from "../../utils/payrollCalculator";
import { Button } from "../ui/Button";

export function PayslipModal({ isOpen, onClose, payrollItem, monthStr }) {
  const printRef = useRef(null);

  if (!isOpen || !payrollItem) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedMonth = (() => {
    if (!monthStr) return "";
    const [y, m] = monthStr.split("-");
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  })();

  const item = payrollItem;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-white/10 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Top Action Bar (hidden on print) */}
        <div className="print:hidden flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Slip Gaji Karyawan — {item.staffName}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-semibold"
            >
              <Printer className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              <span>Cetak / PDF</span>
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition"
              aria-label="Tutup modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100 print:p-0 print:m-0 print:overflow-visible">
          <div
            ref={printRef}
            className="payslip-printable bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs print:border-none print:shadow-none print:p-0"
          >
            {/* Header Perusahaan */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between pb-5 border-b-2 border-slate-900 gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-umara-horizontal.png"
                  alt="Umaratax Logo"
                  className="h-10 w-auto object-contain"
                />
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-950 uppercase">
                    UMARA TAX CONSULTANT
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Jasa Konsultasi Perpajakan, Akuntansi & Perizinan Usaha
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Website: umaratax.com • Email: info@umaratax.com
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <span className="inline-block px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border border-slate-200">
                  SLIP GAJI RESMI
                </span>
                <p className="text-xs font-semibold text-slate-700 mt-1">
                  Periode: {formattedMonth}
                </p>
              </div>
            </div>

            {/* Info Karyawan */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-4 border-b border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Nama Karyawan</span>
                <span className="font-bold text-slate-900 text-sm">{item.staffName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Jabatan</span>
                <span className="font-semibold text-slate-800">{item.jobTitle}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Masa Kerja</span>
                <span className="font-semibold text-slate-800">
                  {item.tenure?.hasJoined
                    ? `${item.tenure.formattedJoinDate} (${item.tenure.tenureText})`
                    : "Belum diisi"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Skenario Gaji</span>
                <span className="font-semibold text-slate-800">{item.scenarioName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Simbol Jabatan</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-xs bg-slate-100 text-slate-800 border border-slate-300">
                  Simbol {item.positionSymbol}
                </span>
              </div>
            </div>

            {/* Ringkasan Kehadiran */}
            <div className="my-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
              <div className="font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>REKAPITULASI PRESENSI BULAN INI:</span>
                <span className="font-normal text-slate-500">Standar Kerja: 26 Hari</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-slate-500 text-[11px]">Total Masuk</div>
                  <div className="font-bold text-slate-800 text-sm">{item.hariMasuk} Hari</div>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200 text-emerald-800">
                  <div className="text-[11px] text-emerald-600">Tepat Waktu</div>
                  <div className="font-bold text-sm">{item.hariTepatWaktu} Hari</div>
                </div>
                <div className={`bg-white p-2 rounded border ${item.hariTerlambat > 0 ? "border-rose-300 text-rose-800" : "border-slate-200 text-slate-800"}`}>
                  <div className="text-[11px] text-slate-500">Terlambat</div>
                  <div className="font-bold text-sm">{item.hariTerlambat} Hari</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-slate-500 text-[11px]">Lembur</div>
                  <div className="font-bold text-slate-800 text-sm">{item.jamLembur} Jam</div>
                </div>
              </div>
            </div>

            {/* Tabel Rincian Gaji & Tunjangan */}
            <div className="space-y-4 my-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded-t border-t border-x border-slate-300">
                  A. PENERIMAAN / PENGHASILAN
                </h4>
                <table className="w-full text-xs border border-slate-300 border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-medium text-slate-700">
                        1. Gaji Pokok
                        <span className="block text-[11px] text-slate-400">
                          {item.hariMasuk >= 26
                            ? `Penuh (Masuk ${item.hariMasuk} hari)`
                            : `Prorata: ${item.hariMasuk} hari x ${formatRupiah(item.dailyRate)}`}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900 w-36">
                        {formatRupiah(item.gajiPokok)}
                      </td>
                    </tr>

                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <td className="p-2.5 font-medium text-slate-700">
                        2. Tunjangan Uang Makan
                        <span className="block text-[11px] text-slate-400">
                          {item.hariTepatWaktu} hari tepat waktu x {formatRupiah(item.uangMakanPerHari)}
                          {item.hariTerlambat > 0 && ` (${item.hariTerlambat} hari terlambat: hangus)`}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatRupiah(item.uangMakan)}
                      </td>
                    </tr>

                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-medium text-slate-700">
                        3. Tunjangan Uang Transport
                        <span className="block text-[11px] text-slate-400">
                          {item.hariTepatWaktu} hari utuh ({formatRupiah(item.transportPerHari)}) + {item.hariTerlambat} hari potongan 50% ({formatRupiah(item.transportPerHari * 0.5)})
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatRupiah(item.uangTransport)}
                      </td>
                    </tr>

                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <td className="p-2.5 font-medium text-slate-700">
                        4. Tunjangan Uang Tertib
                        <span className="block text-[11px] text-slate-400">
                          {item.isOrderlyForfeited
                            ? `HANGUS (Staf tercatat terlambat ${item.hariTerlambat} kali)`
                            : "Diterima Penuh (Tidak ada keterlambatan)"}
                        </span>
                      </td>
                      <td className={`p-2.5 text-right font-bold ${item.isOrderlyForfeited ? "text-rose-600" : "text-slate-900"}`}>
                        {formatRupiah(item.uangTertib)}
                      </td>
                    </tr>

                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-medium text-slate-700">
                        5. Tunjangan Uang Jabatan
                        <span className="block text-[11px] text-slate-400">
                          Simbol {item.positionSymbol} — {item.positionTitle}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatRupiah(item.uangJabatan)}
                      </td>
                    </tr>

                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <td className="p-2.5 font-medium text-slate-700">
                        6. Upah Lembur
                        <span className="block text-[11px] text-slate-400">
                          {item.jamLembur} jam x {formatRupiah(item.rateLemburPerJam)} (Formula Depnaker 1/173 x Upah)
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatRupiah(item.uangLembur)}
                      </td>
                    </tr>

                    {item.bonus > 0 && (
                      <tr className="border-b border-slate-200">
                        <td className="p-2.5 font-medium text-emerald-700">
                          7. Bonus & Tunjangan Tambahan
                          <span className="block text-[11px] text-slate-400">
                            {item.notes ? `Catatan: ${item.notes}` : "Insentif / Tambahan khusus"}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">
                          +{formatRupiah(item.bonus)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Potongan jika ada */}
              {item.deductions > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-3 py-1.5 rounded-t border-t border-x border-rose-300">
                    B. POTONGAN
                  </h4>
                  <table className="w-full text-xs border border-rose-300 border-collapse">
                    <tbody>
                      <tr className="border-b border-rose-200">
                        <td className="p-2.5 font-medium text-rose-700">
                          Potongan Lain / Kasbon
                        </td>
                        <td className="p-2.5 text-right font-bold text-rose-700 w-36">
                          -{formatRupiah(item.deductions)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total Bersih */}
              <div className="bg-slate-900 text-white p-4 rounded-lg flex items-center justify-between border border-slate-950">
                <div>
                  <div className="text-xs text-slate-300 uppercase font-semibold tracking-wider">
                    TOTAL DITERIMA (TAKE HOME PAY)
                  </div>
                  <div className="text-[11px] text-slate-300 italic mt-0.5">
                    Terbilang: {item.totalGajiTerbilang}
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black tracking-tight text-emerald-400">
                  {formatRupiah(item.totalGaji)}
                </div>
              </div>
            </div>

            {/* Catatan / Keterangan */}
            {item.notes && (
              <div className="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-900">
                <strong>Catatan Khusus:</strong> {item.notes}
              </div>
            )}

            {/* Kolom Tanda Tangan */}
            <div className="grid grid-cols-2 gap-8 pt-8 mt-6 text-xs text-center border-t border-slate-200">
              <div>
                <p className="text-slate-500 mb-16">Penerima,</p>
                <p className="font-bold text-slate-900 border-b border-slate-400 inline-block px-8 pb-1">
                  {item.staffName}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{item.jobTitle}</p>
              </div>

              <div>
                <p className="text-slate-500 mb-16">
                  Surakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  <br />
                  <span className="font-semibold text-slate-700">UMARA TAX CONSULTANT</span>
                </p>
                <p className="font-bold text-slate-900 border-b border-slate-400 inline-block px-8 pb-1">
                  Umatun Markhumah
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Direktur / Owner</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info & close */}
        <div className="print:hidden px-6 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-500">
          <span>Format resmi siap cetak ke printer / simpan PDF A4.</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
