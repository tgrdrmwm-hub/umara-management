import { ShieldCheck, Plus, UserX, UserCheck, AlertCircle, Trash2, KeyRound, Pencil, IdCard } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import { StaffProfileModal } from "../components/StaffProfileModal";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../services/supabase";

const addUserSchema = z.object({
  name: z.string().min(3, "Nama terlalu pendek"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum([
    "owner",
    "developer",
    "manager",
    "staff",
    "staff_magang",
    "magang",
  ]),
});

const editUserSchema = z.object({
  name: z.string().min(3, "Nama terlalu pendek"),
  email: z.string().email("Email tidak valid"),
  role: z.enum([
    "owner",
    "developer",
    "manager",
    "staff",
    "staff_magang",
    "magang",
  ]),
});

export function UsersManagementPage() {
  const queryClient = useQueryClient();
  const { data } = useAppData();
  const { user: currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("12345678");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [selectedBiodataUser, setSelectedBiodataUser] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(addUserSchema),
    defaultValues: { role: "staff" },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
    reset: resetEdit,
  } = useForm({
    resolver: zodResolver(editUserSchema),
  });

  if (!data) return null;

  // Hanya membolehkan akses jika user adalah developer
  const hasAccess = currentUser?.role === "developer";

  if (!hasAccess) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Akses ditolak. Anda tidak memiliki izin untuk melihat halaman ini.
        </p>
      </div>
    );
  }

  const onSubmit = async (values) => {
    try {
      const cleanEmail = values.email.toLowerCase().trim();
      // Memanggil fungsi SQL (RPC) di Supabase
      const { error } = await supabase.rpc("admin_create_user", {
        p_email: cleanEmail,
        p_password: values.password,
        p_name: values.name.trim(),
        p_role: values.role,
      });

      if (error) {
        if (error.message.includes("already exists")) {
          throw new Error("Email tersebut sudah terdaftar.");
        }
        throw error;
      }

      toast.success("User berhasil dibuat!");
      setShowModal(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    } catch (err) {
      toast.error(
        err.message ||
          "Gagal membuat user. Pastikan Anda telah menjalankan script SQL setup_admin_rpc di Supabase.",
      );
      console.error(err);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const { error } = await supabase
        .from("users")
        .update({ status: newStatus })
        .eq("id", userId);

      if (error) throw error;
      toast.success(
        `User berhasil di-${newStatus === "active" ? "aktifkan" : "nonaktifkan"}!`,
      );
      queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    } catch (err) {
      toast.error("Gagal mengubah status user.");
      console.error(err);
    }
  };

  const confirmDelete = (userId) => {
    setUserToDelete(userId);
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.rpc("admin_delete_user", {
        p_user_id: userToDelete,
      });

      if (error) throw error;
      toast.success("User berhasil dihapus secara permanen!");
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    } catch (err) {
      toast.error(err.message || "Gagal menghapus user. Pastikan script SQL sudah dijalankan di Supabase.");
      console.error("Delete user error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmResetPassword = (user) => {
    setUserToResetPassword(user);
    setResetPasswordValue("12345678");
  };

  const executeResetPassword = async () => {
    if (!userToResetPassword) return;
    setIsResettingPassword(true);

    try {
      const { error } = await supabase.rpc("admin_reset_password", {
        p_user_id: userToResetPassword.id,
        p_new_password: resetPasswordValue || "12345678",
      });

      if (error) throw error;

      toast.success(
        `Password untuk ${userToResetPassword.name} berhasil direset ke password awal!`,
      );
      setUserToResetPassword(null);
      setResetPasswordValue("12345678");
      queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    } catch (err) {
      toast.error(
        err.message ||
          "Gagal mereset password user. Pastikan script SQL admin_reset_password sudah dijalankan di Supabase.",
      );
      console.error("Reset password error:", err);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const startEditUser = (user) => {
    setUserToEdit(user);
    resetEdit({
      name: user.name,
      email: user.email,
      role: user.role,
    });
  };

  const onSubmitEdit = async (values) => {
    if (!userToEdit) return;
    try {
      const cleanEmail = values.email.toLowerCase().trim();
      const { error } = await supabase.rpc("admin_update_user", {
        p_user_id: userToEdit.id,
        p_name: values.name.trim(),
        p_email: cleanEmail,
        p_role: values.role,
      });

      if (error) {
        if (error.message.includes("already exists")) {
          throw new Error("Email tersebut sudah digunakan oleh akun lain.");
        }
        throw error;
      }

      toast.success("Data user berhasil diperbarui!");
      setUserToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
    } catch (err) {
      toast.error(
        err.message ||
          "Gagal memperbarui user. Pastikan script SQL admin_update_user sudah dijalankan di Supabase.",
      );
      console.error("Update user error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            User Management
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Kelola akses dan akun pengguna sistem.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="px-3 md:px-4">
          <Plus className="h-4 w-4 md:mr-1" />
          <span className="hidden md:inline">Tambah User</span>
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/8 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Nama Lengkap</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/8">
              {data.users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-white/5"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2.5">
                      {u.avatar &&
                      (u.avatar.startsWith("http") ||
                        u.avatar.startsWith("data:image")) ? (
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-white/10"
                        />
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                          {u.name
                            ? u.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                            : "U"}
                        </div>
                      )}
                      <span>{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.status === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                        }`}
                      >
                        {u.status === "active" ? "Aktif" : "Nonaktif"}
                      </span>
                      {u.is_first_login && (
                        <span className="inline-flex items-center text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Password Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        onClick={() => setSelectedBiodataUser(u)}
                        className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                        title="Lihat & Edit Biodata Staf"
                      >
                        <IdCard className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        onClick={() => startEditUser(u)}
                        className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        title="Edit User"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {u.id !== currentUser.id && (
                        <>
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            onClick={() => confirmResetPassword(u)}
                            className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            onClick={() => toggleUserStatus(u.id, u.status)}
                            className={
                              u.status === "active"
                                ? "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                            }
                            title={u.status === "active" ? "Nonaktifkan User" : "Aktifkan User"}
                          >
                            {u.status === "active" ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            onClick={() => confirmDelete(u.id)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                            title="Hapus User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <Card className="relative w-full max-w-md p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Tambah User Baru
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Akun akan langsung aktif dengan password default.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nama Lengkap
                </label>
                <Input placeholder="John Doe" {...register("name")} />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <Input
                  placeholder="user@example.com"
                  type="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Input
                  placeholder="Password minimal 6 karakter"
                  type="text"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Role
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20 dark:focus:ring-white/8"
                  {...register("role")}
                >
                  <option value="owner">Owner</option>
                  <option value="developer">Developer</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="staff_magang">Staff Magang</option>
                  <option value="magang">Magang</option>
                </select>
                {errors.role && (
                  <p className="text-xs text-red-500">{errors.role.message}</p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan User"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => !isDeleting && setUserToDelete(null)}
          />
          <Card className="relative w-full max-w-sm p-5 sm:p-6">
            <div className="mb-5 sm:mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Hapus User
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus user ini secara permanen? Semua data yang terkait dengan user ini juga mungkin akan terhapus.
            </p>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button 
                onClick={executeDelete} 
                disabled={isDeleting}
                className="w-full sm:w-auto bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 border-transparent"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {userToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => !isResettingPassword && setUserToResetPassword(null)}
          />
          <Card className="relative w-full max-w-md p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Reset Password User
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Kembalikan password akun ke kondisi awal default.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-white/5 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Nama:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {userToResetPassword.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Email:</span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {userToResetPassword.email}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password Awal (Default: 12345678)
                </label>
                <Input
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="12345678"
                  type="text"
                />
              </div>

              <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-300 space-y-1">
                <p className="font-medium">Informasi Penting:</p>
                <p>
                  Setelah di-reset, status akun akan dikembalikan ke kondisi awal (<strong>is_first_login = true</strong>). Pengguna akan langsung diwajibkan membuat password baru saat login ke sistem.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => setUserToResetPassword(null)}
                  disabled={isResettingPassword}
                >
                  Batal
                </Button>
                <Button
                  onClick={executeResetPassword}
                  disabled={isResettingPassword || !resetPasswordValue}
                  className="w-full sm:w-auto bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 border-transparent"
                >
                  {isResettingPassword ? "Mereset..." : "Reset Password"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => !isSubmittingEdit && setUserToEdit(null)}
          />
          <Card className="relative w-full max-w-md p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Edit Data User
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Perubahan nama, email, dan role akan langsung tersinkron ke database.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nama Lengkap
                </label>
                <Input placeholder="Nama Lengkap" {...registerEdit("name")} />
                {errorsEdit.name && (
                  <p className="text-xs text-red-500">{errorsEdit.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <Input
                  placeholder="user@example.com"
                  type="email"
                  {...registerEdit("email")}
                />
                {errorsEdit.email && (
                  <p className="text-xs text-red-500">{errorsEdit.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Role
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-white/20 dark:focus:ring-white/8 disabled:opacity-50"
                  {...registerEdit("role")}
                  disabled={userToEdit.id === currentUser.id}
                >
                  <option value="owner">Owner</option>
                  <option value="developer">Developer</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="staff_magang">Staff Magang</option>
                  <option value="magang">Magang</option>
                </select>
                {userToEdit.id === currentUser.id && (
                  <p className="text-[11px] text-slate-400">
                    Role akun Anda sendiri dikunci agar tidak kehilangan akses developer.
                  </p>
                )}
                {errorsEdit.role && (
                  <p className="text-xs text-red-500">{errorsEdit.role.message}</p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => setUserToEdit(null)}
                  disabled={isSubmittingEdit}
                >
                  Batal
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmittingEdit}>
                  {isSubmittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Staff Biodata & Profile Modal for Developer */}
      {selectedBiodataUser && (
        <StaffProfileModal
          user={selectedBiodataUser}
          isOpen={Boolean(selectedBiodataUser)}
          onClose={() => setSelectedBiodataUser(null)}
          canEdit={true}
        />
      )}
    </div>
  );
}
