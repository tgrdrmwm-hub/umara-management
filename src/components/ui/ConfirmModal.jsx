import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, X, AlertCircle, Info, Loader2 } from "lucide-react";
import { Button } from "./Button";
import { Card } from "./Card";

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Hapus",
  message = "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.",
  confirmText = "Hapus",
  cancelText = "Batal",
  variant = "danger", // 'danger' | 'warning' | 'primary'
  icon = "trash", // 'trash' | 'alert' | 'info'
  isLoading = false,
}) {
  const [internalLoading, setInternalLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen && !isLoading && !internalLoading) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoading, internalLoading]);

  if (!isOpen) return null;

  const busy = isLoading || internalLoading;

  const handleConfirm = async () => {
    if (busy) return;
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const getIcon = () => {
    if (icon === "trash" || variant === "danger") {
      return (
        <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-8 ring-rose-50 dark:ring-rose-500/5 flex items-center justify-center shrink-0">
          <Trash2 className="h-6 w-6" />
        </div>
      );
    }
    if (icon === "alert" || variant === "warning") {
      return (
        <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-8 ring-amber-50 dark:ring-amber-500/5 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-6 w-6" />
        </div>
      );
    }
    return (
      <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-8 ring-blue-50 dark:ring-blue-500/5 flex items-center justify-center shrink-0">
        <Info className="h-6 w-6" />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => !busy && onClose()}
        aria-hidden="true"
      />

      <Card className="relative w-full max-w-md p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 z-10 animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {getIcon()}

          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <div className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={handleConfirm}
            disabled={busy}
            loading={busy}
            className={`w-full sm:w-auto shadow-sm ${
              variant === "danger"
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : ""
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
}
