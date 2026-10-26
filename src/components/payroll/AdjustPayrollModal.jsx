import { useState, useEffect } from "react";
import { X, Clock, Award, MinusCircle, FileText, Check } from "lucide-react";
import { formatRupiah } from "../../utils/payrollCalculator";
import { Button } from "../ui/Button";

export function AdjustPayrollModal({
  isOpen,
  onClose,
  payrollItem,
  monthStr,
  onSave,
}) {
  const [jamLembur, setJamLembur] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (payrollItem) {
      setJamLembur(payrollItem.jamLembur || 0);
      setBonus(payrollItem.bonus || 0);
      setDeductions(payrollItem.deductions || 0);
      setNotes(payrollItem.notes || "");
    }
  }, [payrollItem]);

  if (!isOpen || !payrollItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        manualOvertimeHours: Number(jamLembur) || 0,
        bonus: Number(bonus) || 0,
        deductions: Number(deductions) || 0,
        notes: notes.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedRate = payrollItem.rateLemburPerJam || 0;
  const estimatedOvertimeTotal = Math.round(Number(jamLembur || 0) * estimatedRate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-white/10 overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Penyesuaian Gaji Staf
            </h3>
            <p className="text-xs text-slate-500">
              Staf: <span className="font-semibold text-slate-700 dark:text-slate-300">{payrollItem.staffName}</span> • {monthStr}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Jam Lembur */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              Jumlah Jam Lembur (Jam):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                value={jamLembur}
                onChange={(e) => setJamLembur(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                placeholder="0"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Tarif: {formatRupiah(estimatedRate)}/jam. Total uang lembur: <strong className="text-slate-700 dark:text-slate-300">{formatRupiah(estimatedOvertimeTotal)}</strong>. (Lembur presensi dihitung otomatis mulai dari jam 18:00 ke atas).
            </p>
          </div>

          {/* Bonus / Insentif */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-emerald-500" />
              Bonus / Insentif Tambahan (Rp):
            </label>
            <input
              type="number"
              step="50000"
              min="0"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              placeholder="0"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Diterima: <strong className="text-emerald-600 dark:text-emerald-400">{formatRupiah(bonus)}</strong>.
            </p>
          </div>

          {/* Potongan Kasbon / Lain */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <MinusCircle className="h-3.5 w-3.5 text-rose-500" />
              Potongan Lain / Kasbon (Rp):
            </label>
            <input
              type="number"
              step="50000"
              min="0"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              placeholder="0"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Dipotong: <strong className="text-rose-600 dark:text-rose-400">-{formatRupiah(deductions)}</strong>.
            </p>
          </div>

          {/* Catatan Slip */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              Catatan Pada Slip Gaji:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Contoh: Insentif penyelesaian project Coretax klien PT XYZ..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button size="sm" type="submit" loading={isSubmitting} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <Check className="h-3.5 w-3.5" />
              Simpan Penyesuaian
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
