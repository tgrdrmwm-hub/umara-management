import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";

const loginSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export function AuthPage({ mode }) {
  const { login, sendPasswordReset } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    if (mode !== "login") {
      await sendPasswordReset(values.email);
      toast.success("Instruksi reset password telah dikirim ke email Anda.");
      navigate("/login");
      return;
    }
    try {
      const user = await login(values.email, values.password, true);
      navigate(user.is_first_login ? "/change-password" : "/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : "Login gagal: Terjadi kesalahan yang tidak diketahui";
      toast.error(errorMessage);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1a1a2e] p-4 sm:p-8">
      <div className="flex w-full max-w-[1100px] overflow-hidden rounded-[2rem] bg-white shadow-2xl sm:rounded-[2.5rem]">
        {/* ── Left: Image Panel ── */}
        <section className="relative hidden w-[48%] shrink-0 overflow-hidden rounded-[2rem] bg-slate-50 lg:flex items-center justify-center p-12">
          <img
            src="https://umaratax.com/wp-content/uploads/2025/07/image-1.png"
            alt="Umara Tax Logo"
            className="w-full max-w-[80%] object-contain drop-shadow-sm"
          />
        </section>

        {/* ── Right: Form Panel ── */}
        <section className="flex w-full flex-col px-8 py-10 sm:px-12 lg:w-[52%] xl:px-16 xl:py-12">
          {/* Center form */}
          <div className="my-auto w-full max-w-[340px] self-center">
            <div className="text-center">
              <h2 className="text-[2.5rem] font-extrabold leading-tight text-slate-900">
                {mode === "login"
                  ? "Selamat Datang"
                  : mode === "forgot"
                    ? "Lupa Password"
                    : "Reset Password"}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Masuk ke Umaratax Management
              </p>
            </div>

            <form className="mt-9" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-3.5">
                <div>
                  <input
                    type="email"
                    placeholder="Alamat Email"
                    {...register("email")}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />

                  {errors.email && (
                    <span className="mt-1 block text-xs text-red-500">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                {mode !== "forgot" && (
                  <div>
                    <input
                      type="password"
                      placeholder="Kata Sandi"
                      {...register("password")}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />

                    {errors.password && (
                      <span className="mt-1 block text-xs text-red-500">
                        {errors.password.message}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {mode === "login" && (
                <div className="mt-3 text-right">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#e53e3e] transition hover:text-[#c53030]"
                  >
                    Lupa password ?
                  </Link>
                </div>
              )}

              {/* Login button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-7 h-12 w-full rounded-xl bg-[#1a1a2e] text-sm font-semibold text-white shadow-lg shadow-slate-900/25 transition hover:bg-[#2d2d4e] disabled:opacity-60"
              >
                {isSubmitting
                  ? "Memeriksa..."
                  : mode === "login"
                    ? "Masuk"
                    : "Kirim Instruksi"}
              </button>
            </form>

            <p className="mt-7 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} Umaratax Management. All rights
              reserved.
            </p>
          </div>

          {/* Footer info */}
          <p className="mt-6 text-center text-[11px] text-slate-400">
            Sistem Manajemen Perpajakan Terintegrasi
          </p>
        </section>
      </div>
    </main>
  );
}
