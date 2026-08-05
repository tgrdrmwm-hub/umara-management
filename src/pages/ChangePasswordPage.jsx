import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Minimal 8 karakter")
      .regex(/[A-Z]/, "Harus ada huruf besar")
      .regex(/[a-z]/, "Harus ada huruf kecil")
      .regex(/[0-9]/, "Harus ada angka")
      .regex(/[^A-Za-z0-9]/, "Harus ada simbol"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Konfirmasi password tidak sama",
  });

export function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    try {
      await changePassword(values.password);
      toast.success("Password berhasil diperbarui.");
      navigate("/dashboard");
    } catch {
      toast.error("Gagal memperbarui password. Coba lagi.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-100">
            <KeyRound className="h-5 w-5 text-white dark:text-slate-900" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
            Buat Password Baru
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Akun Anda perlu password baru sebelum bisa masuk.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/8 dark:bg-slate-900">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Password Baru
              </label>
              <Input
                type="password"
                placeholder="Min. 8 karakter, huruf besar, angka, simbol"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Konfirmasi Password
              </label>
              <Input
                type="password"
                placeholder="Ulangi password baru"
                {...register("confirm")}
              />
              {errors.confirm && (
                <p className="text-xs text-red-500">{errors.confirm.message}</p>
              )}
            </div>

            {/* Password requirements */}
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">Syarat password:</p>
              <ul className="space-y-0.5">
                {[
                  "Minimal 8 karakter",
                  "Huruf besar (A–Z)",
                  "Huruf kecil (a–z)",
                  "Angka (0–9)",
                  "Simbol (!@#$...)",
                ].map((req) => (
                  <li key={req} className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/20 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} Umaratax Management
        </p>
      </div>
    </main>
  );
}
