import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { CheckCircle2, Mail, UserPlus, LogIn, ArrowLeft, KeyRound, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const loginSchema = z.object({
  email: z.string().min(1, "Username atau Email wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

const signupSchema = z.object({
  username: z
    .string()
    .min(2, "Nama / Username minimal 2 karakter")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username hanya boleh huruf, angka, titik, atau strip"),
  personalEmail: z.string().email("Format email pribadi tidak valid"),
});

export function AuthPage({ mode = "login" }) {
  const { login, sendPasswordReset, user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isConfirmedParam = searchParams.get("confirmed") === "1";
  const confirmedUsernameParam = searchParams.get("u") || "";

  const [activeTab, setActiveTab] = useState(() => (mode === "signup" ? "signup" : mode === "forgot" ? "forgot" : "login"));
  const [signupSuccessData, setSignupSuccessData] = useState(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Login
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    setValue: setLoginValue,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: confirmedUsernameParam, password: "" },
  });

  // Form Sign Up
  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    formState: { errors: signupErrors },
    reset: resetSignupForm,
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: "", personalEmail: "" },
  });

  // Form Forgot
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "signup") setActiveTab("signup");
    else if (mode === "forgot") setActiveTab("forgot");
    else setActiveTab("login");
  }, [mode]);

  useEffect(() => {
    if (confirmedUsernameParam) {
      setLoginValue("email", confirmedUsernameParam);
    }
    if (isConfirmedParam) {
      toast.success(`Akun "${confirmedUsernameParam}" berhasil dikonfirmasi! Silakan masukkan kata sandi yang telah dikirim ke email pribadi Anda.`);
    }
  }, [confirmedUsernameParam, isConfirmedParam, setLoginValue]);

  useEffect(() => {
    if (!loading && user) {
      navigate(user.is_first_login ? "/change-password" : "/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  // Handler Submit Login
  const onLoginSubmit = async (values) => {
    try {
      const user = await login(values.email, values.password, true);
      navigate(user.is_first_login ? "/change-password" : "/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Login gagal: Terjadi kesalahan yang tidak diketahui";
      toast.error(errorMessage);
    }
  };

  // Handler Submit Sign Up
  const onSignupSubmit = async (values) => {
    setIsSigningUp(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          personalEmail: values.personalEmail,
          origin: window.location.origin,
        }),
      });

      let data = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = {};
        }
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
          (res.status === 404 || res.status === 405
            ? "Layanan server pendaftaran tidak merespons (Status " + res.status + "). Pastikan backend/serverless function telah aktif."
            : `Gagal mendaftar akun baru (Status: ${res.status}).`)
        );
      }

      setSignupSuccessData(data);
      resetSignupForm();
      toast.success("Pendaftaran berhasil! Email konfirmasi dan kredensial login telah dikirim.");
    } catch (err) {
      toast.error(err.message || "Terjadi kesalahan saat pendaftaran");
    } finally {
      setIsSigningUp(false);
    }
  };

  // Handler Submit Forgot Password
  const onForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Email wajib diisi");
      return;
    }
    setIsForgotSubmitting(true);
    try {
      await sendPasswordReset(forgotEmail.trim());
      toast.success("Instruksi reset password telah dikirim ke email Anda.");
      setActiveTab("login");
    } catch (err) {
      toast.error(err.message || "Gagal mengirim instruksi reset password");
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1a1a2e] p-3 sm:p-6 lg:p-8">
      <div className="flex w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl lg:max-w-5xl xl:max-w-[1100px]">
        {/* ── Left: Image Panel ── */}
        <section className="relative hidden w-[46%] shrink-0 items-center justify-center overflow-hidden bg-slate-50 p-8 lg:flex xl:p-12 border-r border-slate-100">
          <div className="flex flex-col items-center text-center max-w-sm">
            <img
              src="/logo-umara-horizontal.png"
              alt="Umara Tax Logo"
              className="w-full max-w-[280px] object-contain drop-shadow-xs mb-7"
            />
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800">
                UMARA TAX CONSULTANT
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sistem Manajemen Jadwal, Kegiatan Presensi Staf, dan Layanan Kepatuhan Perpajakan Terpadu.
              </p>
            </div>
          </div>
        </section>

        {/* ── Right: Form Panel ── */}
        <section className="flex w-full flex-col px-5 py-8 sm:px-8 sm:py-10 lg:w-[54%] xl:px-14 xl:py-12">
          {/* Center form */}
          <div className="my-auto w-full max-w-sm self-center">
            
            {/* Confirmation Banner jika datang dari link email */}
            {isConfirmedParam && activeTab === "login" && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-start gap-2.5 shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                    Akun Berhasil Dikonfirmasi!
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                    Silakan masukkan kata sandi yang telah dikirim ke email pribadi Anda untuk masuk ke sistem.
                  </p>
                </div>
              </div>
            )}

            {/* Tab Navigasi Masuk / Daftar */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setSignupSuccessData(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "login"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Masuk</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup");
                  setSignupSuccessData(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "signup"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Daftar Akun Baru</span>
              </button>
            </div>

            {/* ─── TAB 1: LOGIN ─── */}
            {activeTab === "login" && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                    Selamat Datang
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Masuk ke Umaratax Management
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Username atau Email
                    </label>
                    <input
                      type="text"
                      placeholder="Username atau Email Akun"
                      {...registerLogin("email")}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                    {loginErrors.email && (
                      <span className="mt-1 block text-xs text-red-500">
                        {loginErrors.email.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Kata Sandi
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveTab("forgot")}
                        className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                      >
                        Lupa sandi?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Kata Sandi"
                        {...registerLogin("password")}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                        aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                        title={showPassword ? "Sembunyikan password" : "Lihat password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4.5 w-4.5 text-slate-600" />
                        ) : (
                          <Eye className="h-4.5 w-4.5 text-slate-600" />
                        )}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <span className="mt-1 block text-xs text-red-500">
                        {loginErrors.password.message}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoginSubmitting}
                    className="mt-2 h-11 w-full rounded-xl bg-[#1a1a2e] text-sm font-semibold text-white shadow-lg shadow-slate-900/25 transition hover:bg-[#2d2d4e] disabled:opacity-60 cursor-pointer"
                  >
                    {isLoginSubmitting ? "Memeriksa Kredensial..." : "Masuk ke Sistem"}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs text-slate-500">
                  Belum punya akun staf?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("signup")}
                    className="font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Daftar di sini
                  </button>
                </p>
              </div>
            )}

            {/* ─── TAB 2: SIGN UP ─── */}
            {activeTab === "signup" && (
              <div>
                {signupSuccessData ? (
                  /* Tampilan Sukses Registrasi */
                  <div className="text-center py-2 animate-in fade-in duration-300">
                    <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs">
                      <Mail className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Email Konfirmasi Terkirim!
                    </h3>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      Kami telah mengirimkan tautan konfirmasi serta informasi <strong>Username</strong> dan <strong>Password</strong> login ke email pribadi Anda:
                    </p>
                    <div className="my-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-mono text-slate-800 select-all font-semibold break-all">
                      {signupSuccessData.personalEmail}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-5">
                      Silakan periksa kotak masuk (inbox) atau folder spam email Anda, lalu klik tombol <strong>"Konfirmasi Akun & Masuk Sekarang"</strong> pada email tersebut.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginValue("email", signupSuccessData.username);
                        setActiveTab("login");
                        setSignupSuccessData(null);
                      }}
                      className="h-11 w-full rounded-xl bg-[#1a1a2e] text-sm font-semibold text-white transition hover:bg-[#2d2d4e] cursor-pointer"
                    >
                      Buka Halaman Masuk →
                    </button>
                  </div>
                ) : (
                  /* Form Input Registrasi */
                  <div>
                    <div className="text-center mb-5">
                      <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                        Daftar Akun Baru
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-500">
                        Registrasi staf & pengguna Umaratax
                      </p>
                    </div>

                    <form onSubmit={handleSignupSubmit(onSignupSubmit)} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Nama / Username
                        </label>
                        <input
                          type="text"
                          placeholder="Masukkan nama / username (misal: budi_santoso)"
                          {...registerSignup("username")}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                        />
                        {signupErrors.username && (
                          <span className="mt-1 block text-xs text-red-500">
                            {signupErrors.username.message}
                          </span>
                        )}
                        <p className="mt-1 text-[11px] text-slate-400">
                          Nama ini akan digunakan sebagai username login Anda.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Email Pribadi (Untuk Verifikasi & Kredensial)
                        </label>
                        <input
                          type="email"
                          placeholder="misal: nama.staf@gmail.com"
                          {...registerSignup("personalEmail")}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                        />
                        {signupErrors.personalEmail && (
                          <span className="mt-1 block text-xs text-red-500">
                            {signupErrors.personalEmail.message}
                          </span>
                        )}
                        <div className="mt-2 p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800 leading-relaxed">
                          💡 <strong>Pemberitahuan:</strong> Tautan tombol konfirmasi akun beserta <strong>Username</strong> dan <strong>Password</strong> login akan dikirimkan otomatis ke email pribadi ini.
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSigningUp}
                        className="mt-2 h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSigningUp ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Mendaftarkan & Mengirim Email...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            <span>Daftar & Kirim Konfirmasi</span>
                          </>
                        )}
                      </button>
                    </form>

                    <p className="mt-5 text-center text-xs text-slate-500">
                      Sudah memiliki akun?{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("login")}
                        className="font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        Masuk di sini
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB 3: FORGOT PASSWORD ─── */}
            {activeTab === "forgot" && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                    Lupa Password
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Masukkan email Anda untuk reset password
                  </p>
                </div>

                <form onSubmit={onForgotSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Alamat Email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Email Akun atau Email Pribadi"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isForgotSubmitting}
                    className="mt-2 h-11 w-full rounded-xl bg-[#1a1a2e] text-sm font-semibold text-white shadow-lg shadow-slate-900/25 transition hover:bg-[#2d2d4e] disabled:opacity-60 cursor-pointer"
                  >
                    {isForgotSubmitting ? "Mengirim..." : "Kirim Instruksi Reset"}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Kembali ke Halaman Masuk</span>
                  </button>
                </p>
              </div>
            )}

            <p className="mt-7 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} Umaratax Management. All rights reserved.
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
