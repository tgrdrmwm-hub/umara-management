import { useEffect, useMemo, useState } from "react";
import { fetchUserProfile, updateUserFirstLogin } from "../services/database";
import { isSupabaseConfigured, supabase } from "../services/supabase";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const email = data.session?.user.email;
      if (email) {
        const profile = await fetchUserProfile(email);
        if (mounted) setUser(profile);
      }
      if (mounted) setIsLoading(false);
    }

    void loadSession();

    const subscription = supabase?.auth.onAuthStateChange(
      async (_, session) => {
        const email = session?.user.email;
        const profile = email ? await fetchUserProfile(email) : null;
        if (mounted) setUser(profile);
      },
    );

    return () => {
      mounted = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      async login(email, password, remember) {
        if (!supabase || !isSupabaseConfigured) {
          throw new Error(
            "Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.",
          );
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          // Provide more specific error messages
          const errorMsg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
          if (errorMsg.includes("Invalid login credentials")) {
            throw new Error("Email atau password salah. Silakan coba lagi.");
          } else if (errorMsg.includes("Email not confirmed")) {
            throw new Error("Email belum dikonfirmasi. Periksa email Anda untuk link konfirmasi.");
          } else if (errorMsg.includes("rate limit")) {
            throw new Error("Terlalu banyak percobaan login. Silakan tunggu beberapa saat.");
          } else if (errorMsg.includes("network")) {
            throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
          } else {
            throw new Error(`Login gagal: ${errorMsg}`);
          }
        }

         let profile = await fetchUserProfile(data.user.email ?? email);
         if (!profile) {
           // If user exists in auth but not in public.users, create the profile automatically
           console.log(`🔄 User ${data.user.email} tidak ditemukan di public.users, membuat profil otomatis...`);
           const { error: createError } = await supabase
             .from('users')
             .insert({
               id: data.user.id,
               name: data.user.email?.split('@')[0] || 'User',
               email: data.user.email || email,
               role: 'staff',
               status: 'active',
               is_first_login: true,
               points: 0,
               attendance_rate: 0
             });

           if (createError) {
             throw new Error(
               "Profil user belum ada di tabel users dan gagal membuat profil otomatis. " +
               "Silakan hubungi administrator untuk menyinkronkan akun Anda. Error: " + createError.message
             );
           }

           // Fetch the newly created profile
           profile = await fetchUserProfile(data.user.email ?? email);
           if (!profile) {
             throw new Error(
               "Profil user belum ada di tabel users. " +
               "Silakan hubungi administrator untuk menyinkronkan akun Anda."
             );
           }
         }
        setUser(profile);
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem("umara_token", data.session.access_token);
        return profile;
      },
      async logout() {
        await supabase?.auth.signOut();
        localStorage.removeItem("umara_token");
        setUser(null);
      },
      async changePassword(password) {
        if (!user) return;
        if (!supabase) {
          throw new Error("Supabase belum dikonfigurasi.");
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;

        await updateUserFirstLogin(user.id);
        const changedAt = new Date().toISOString();
        const nextUser = {
          ...user,
          is_first_login: false,
          password_changed_at: changedAt,
          updated_at: changedAt,
        };
        setUser(nextUser);
      },
      async sendPasswordReset(email) {
        if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
