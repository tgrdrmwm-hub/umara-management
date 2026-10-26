import { useState, useRef, useEffect } from "react";
import {
  X,
  Camera,
  Trash2,
  User,
  Mail,
  Phone,
  MapPin,
  HeartHandshake,
  Award,
  CalendarCheck,
  Calendar,
  Check,
  Shield,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";
import { updateUserBiodata } from "../services/database";
import { useAuth } from "../hooks/useAuth";
import { determineScenarioFromJoinDate, calculateTenure } from "../utils/payrollCalculator";

export function StaffProfileModal({ user, isOpen, onClose, canEdit = true }) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const isSelf = Boolean(currentUser && user && currentUser.id === user.id);
  const isDeveloper = currentUser?.role === "developer";
  const isOwner = currentUser?.role === "owner";
  const userCanEdit = Boolean(canEdit && (isSelf || isDeveloper || isOwner));

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    personalEmail: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    avatar: "",
    joinDate: "",
  });

  const [avatarPreview, setAvatarPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        personalEmail: user.personalEmail || "",
        address: user.address || "",
        emergencyContactName: user.emergencyContactName || "",
        emergencyContactPhone: user.emergencyContactPhone || "",
        avatar: user.avatar || "",
        joinDate: user.joinDate || user.join_date || "",
      });
      setAvatarPreview(user.avatar || "");
    }
  }, [user]);

  if (!isOpen || !user) return null;

  // Handler untuk kompresi dan upload foto profil lokal
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, atau WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Kompresi menggunakan HTML5 Canvas ke ukuran optimal (maks 400x400)
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setAvatarPreview(dataUrl);
        setFormData((prev) => ({ ...prev, avatar: dataUrl }));
        toast.success("Foto profil berhasil dipilih!");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarPreview("");
    setFormData((prev) => ({ ...prev, avatar: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Foto profil dihapus");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!userCanEdit) {
      toast.error("Anda tidak memiliki izin untuk mengubah biodata staf ini.");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Nama lengkap tidak boleh kosong");
      return;
    }

    setIsSaving(true);
    try {
      await updateUserBiodata(user.id, formData);
      toast.success("Biodata profil staff berhasil disimpan!");
      void queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
      onClose();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan biodata");
      console.error("Save biodata error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const roleLabel =
    user.role === "developer"
      ? "Developer & Staff"
      : (user.role || "staff").replace("_", " ");

  const hasCustomAvatar =
    avatarPreview &&
    (avatarPreview.startsWith("http") || avatarPreview.startsWith("data:image"));

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ST";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={() => !isSaving && onClose()}
      />

      <Card className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl z-10 border border-slate-200 dark:border-white/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSaving}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/8 dark:hover:text-slate-200 transition-colors"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Profil */}
        <div className="mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-5 border-b border-slate-100 dark:border-white/8">
          {/* Avatar Container with Upload */}
          <div className="relative group shrink-0">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden ring-4 ring-slate-100 dark:ring-white/10 shadow-md flex items-center justify-center bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-bold text-2xl">
              {hasCustomAvatar ? (
                <img
                  src={avatarPreview}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {userCanEdit && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-slate-950/60 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer backdrop-blur-xs"
                  title="Upload Foto Baru"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-[10px] font-medium">Ubah Foto</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* User Overview Info */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                {user.name}
              </h2>
              <Badge tone="blue" className="capitalize text-[10px]">
                {roleLabel}
              </Badge>
              <Badge
                tone={user.status === "active" ? "green" : "red"}
                className="text-[10px]"
              >
                {user.status === "active" ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.email} (Email Akun)</span>
            </p>

            {/* Quick Stats Chips */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Award className="h-3.5 w-3.5" />
                <span>{Number(user.points ?? 0).toLocaleString()} Poin</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
                <CalendarCheck className="h-3.5 w-3.5" />
                <span>Presensi: {user.attendanceRate ?? 0}%</span>
              </div>
              {hasCustomAvatar && userCanEdit && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 px-1 py-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Hapus Foto</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Akses / Permission Banner */}
        <div className="mb-4">
          {!userCanEdit && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs text-slate-600 dark:border-white/8 dark:bg-white/4 dark:text-slate-300 flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-slate-400 shrink-0" />
              <span>
                <strong>Mode Hanya Lihat:</strong> Biodata ini hanya dapat diisi dan diubah oleh staf yang bersangkutan ({user.name}), Bu Uma (Owner), atau Developer.
              </span>
            </div>
          )}
          {isOwner && !isSelf && (
            <div className="rounded-xl border border-purple-200/80 bg-purple-50/70 p-3 text-xs text-purple-900 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-300 flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>
                <strong>Akses Owner (Bu Uma):</strong> Anda memiliki wewenang penuh untuk memeriksa dan menetapkan tanggal bergabung serta biodata staf ini.
              </span>
            </div>
          )}
          {isDeveloper && !isSelf && !isOwner && (
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/70 p-3 text-xs text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Akses Developer:</strong> Anda memiliki wewenang untuk memeriksa dan mengedit biodata staff ini.
              </span>
            </div>
          )}
          {isSelf && (
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 flex items-center gap-2.5">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>Profil Akun Anda:</strong> Silakan lengkapi tanggal bergabung, foto profil, email pribadi, alamat lengkap, dan kontak saudara Anda.
              </span>
            </div>
          )}
        </div>

        {/* Biodata Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Biodata Pribadi & Masa Kerja</span>
          </div>

          {/* Section Tanggal Bergabung */}
          {(() => {
            const tenurePreview = formData.joinDate
              ? determineScenarioFromJoinDate(formData.joinDate)
              : null;

            return (
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/50 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Tanggal Bergabung (Mulai Bekerja di Umara)</span>
                  </label>
                  {tenurePreview?.tenure?.hasJoined && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white text-blue-800 dark:bg-slate-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      Masa Kerja: {tenurePreview.tenure.tenureText}
                    </span>
                  )}
                </div>
                <Input
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) =>
                    setFormData({ ...formData, joinDate: e.target.value })
                  }
                  disabled={!userCanEdit || isSaving}
                  className="bg-white dark:bg-slate-800 text-xs font-medium"
                />
                <div className="flex flex-wrap items-center justify-between gap-1 pt-0.5 text-[11px]">
                  <p className="text-slate-500 dark:text-slate-400">
                    Sistem otomatis: &lt; 3 bln (Training) • 3-6 bln (Tahap 2) • ≥ 6 bln (Tahap 1).
                  </p>
                  {tenurePreview?.tenure?.hasJoined && (
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Rekomendasi → {tenurePreview.badgeText}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nama Lengkap
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={!userCanEdit || isSaving}
                placeholder="Nama lengkap staff"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nomor Telepon / WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  disabled={!userCanEdit || isSaving}
                  placeholder="08123456789"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Email Pribadi</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Kontak email pribadi staf)
                </span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  type="email"
                  value={formData.personalEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, personalEmail: e.target.value })
                  }
                  disabled={!userCanEdit || isSaving}
                  placeholder="contoh: nama.pribadi@gmail.com"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>Alamat Lengkap</span>
            </label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              disabled={!userCanEdit || isSaving}
              rows={2}
              placeholder="Masukkan alamat tempat tinggal lengkap..."
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20 dark:focus:ring-white/8 disabled:opacity-50"
            />
          </div>

          {/* Section Kontak Saudara / Darurat */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/8 dark:bg-white/4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <HeartHandshake className="h-4 w-4 text-rose-500" />
              <span>Saudara / Kontak yang Bisa Dihubungi</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Informasi saudara atau keluarga terdekat yang dapat dihubungi saat keadaan darurat.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nama Saudara
                </label>
                <Input
                  value={formData.emergencyContactName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContactName: e.target.value,
                    })
                  }
                  disabled={!userCanEdit || isSaving}
                  placeholder="cth: Budi Hartono (Kakak)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nomor Telepon Saudara
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    value={formData.emergencyContactPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContactPhone: e.target.value,
                      })
                    }
                    disabled={!userCanEdit || isSaving}
                    placeholder="cth: 081298765432"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/8">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Tutup
            </Button>
            {userCanEdit && (
              <Button
                type="submit"
                disabled={isSaving}
                loading={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? "Menyimpan..." : "Simpan Biodata"}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
