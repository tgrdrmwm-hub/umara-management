import { ShieldCheck, Plus, UserX, UserCheck, AlertCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
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
    "admin",
    "staff",
    "staff_magang",
    "magang",
  ]),
});

export function UsersManagementPage() {
  const { data } = useAppData();
  const { user: currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(addUserSchema),
    defaultValues: { role: "staff" },
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
      // Memanggil fungsi SQL (RPC) di Supabase
      const { error } = await supabase.rpc("admin_create_user", {
        p_email: values.email,
        p_password: values.password,
        p_name: values.name,
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
    } catch (err) {
      toast.error(
        err.message ||
          "Gagal membuat user. Pastikan Anda telah menjalankan script SQL setup_admin_rpc.",
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
    } catch (err) {
      toast.error("Gagal menghapus user.");
      console.error(err);
    } finally {
      setIsDeleting(false);
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
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Tambah User
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
                    {u.name}
                  </td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.status === "active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                      }`}
                    >
                      {u.status === "active" ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== currentUser.id && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => toggleUserStatus(u.id, u.status)}
                          className={
                            u.status === "active"
                              ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                              : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          }
                        >
                          {u.status === "active" ? (
                            <>
                              <UserX className="h-3.5 w-3.5" />
                              Nonaktifkan
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              Aktifkan
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => confirmDelete(u.id)}
                          className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </Button>
                      </div>
                    )}
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
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="staff_magang">Staff Magang</option>
                  <option value="magang">Magang</option>
                </select>
                {errors.role && (
                  <p className="text-xs text-red-500">{errors.role.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
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
          <Card className="relative w-full max-w-sm p-6">
            <div className="mb-6 flex items-center gap-3">
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button 
                onClick={executeDelete} 
                disabled={isDeleting}
                className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 border-transparent"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
