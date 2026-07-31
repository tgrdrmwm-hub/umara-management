# Solusi untuk Error Login "Profil user belum ada di tabel users"

## Masalah

Aplikasi mengalami error login dengan pesan **"Profil user belum ada di tabel users"**. Ini terjadi karena:

1. **User sudah dibuat di `auth.users`** (8 user ditemukan: aulia, anna, septi, nita, anggun, azizah, intan, tegar)
2. **Tetapi `public.users` KOSONG** - Tidak ada user di tabel public.users
3. **RLS (Row Level Security) aktif** - Service role key tidak bisa insert ke public.users

## Solusi Langsung (Pilih Salah Satu)

---

### 🔧 **Opsi 1: Jalankan SQL di Supabase Dashboard (Rekomendasi)**

1. **Buka Supabase Dashboard**: https://kjccciaomgdmrohsfqek.supabase.co
2. **Pergi ke SQL Editor**
3. **Jalankan query ini SATU PER SATU:**

```sql
-- Step 1: Disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

```sql
-- Step 2: Get UUID dari auth.users
SELECT id, email FROM auth.users ORDER BY email;
```

**Copy semua UUID yang muncul**

```sql
-- Step 3: Insert ke public.users (ganti UUID dengan yang didapat dari Step 2)
INSERT INTO public.users (id, name, email, role, status, is_first_login, points, attendance_rate, created_at, updated_at)
VALUES
  ('PASTE_UUID_AULIA_HERE', 'aulia', 'aulia@umaratax.com', 'staff', 'active', true, 0, 0, NOW(), NOW()),
  ('PASTE_UUID_ANNA_HERE', 'anna', 'anna@umaratax.com', 'staff', 'active', true, 0, 0, NOW(), NOW()),
  ('PASTE_UUID_SEPTI_HERE', 'septi', 'septi@umaratax.com', 'staff', 'active', true, 0, 0, NOW(), NOW()),
  ('PASTE_UUID_NITA_HERE', 'nita', 'nita@umaratax.com', 'staff', 'active', true, 0, 0, NOW(), NOW()),
  ('PASTE_UUID_ANGGUN_HERE', 'anggun', 'anggun@umaratax.com', 'staff', 'active', true, 0, 0, NOW(), NOW()),
  ('PASTE_UUID_AZIZAH_HERE', 'azizah', 'azizah@umaratax.com', 'staff', 'active', true, 0, 0, NOW(), NOW()),
  ('PASTE_UUID_INTAN_HERE', 'intan', 'intan@umaratax.com', 'staff', 'active', true, 0, 0, NOW(), NOW());
```

```sql
-- Step 4: Enable RLS lagi
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

```sql
-- Step 5: Verifikasi
SELECT * FROM public.users ORDER BY email;
```

---

### 📁 **Opsi 2: Gunakan File SQL yang Sudah Disediakan**

File `insert-users-separate.sql` sudah berisi semua query yang diperlukan. Jalankan masing-masing query di SQL Editor.

---

## Set Password untuk User

Setelah user dibuat di public.users, set password untuk masing-masing user:

1. **Di Supabase Dashboard** → Authentication → Users
2. **Klik masing-masing user**
3. **Klik "Set password"**
4. **Masukkan password**: `12345678`
5. **Enable "Confirm email"**

Atau gunakan SQL function yang sudah ada:

```sql
SELECT set_user_password('aulia@umaratax.com', '12345678');
```

---

## Coba Login

Setelah semuanya selesai:

1. Jalankan aplikasi: `npm run dev`
2. Buka: http://localhost:5173/login
3. **Email**: aulia@umaratax.com (atau email lain)
4. **Password**: 12345678
5. User akan diminta mengganti password pada login pertama

---

## Catatan Penting

- **Password default**: `12345678` (untuk semua user)
- **User akan redirect ke `/change-password`** pada login pertama
- **Pastikan RLS di-enable lagi** setelah insert selesai
- **Jangan lupa set password** untuk masing-masing user di auth.users

---

## File Pendukung yang Tersedia

- `insert-users-separate.sql` - Query SQL untuk dijalankan manual
- `create-users-and-sync.cjs` - Script Node.js (tidak bekerja karena RLS)
- `sync-auth-users-fixed.cjs` - Script sinkronisasi (tidak bekerja karena RLS)

---

## Troubleshooting

### Jika error "permission denied for schema public":
- Pastikan Anda menjalankan query di **SQL Editor** (bukan Table Editor)
- Pastikan **RLS sudah di-disable** sebelum insert
- Pastikan **UUID yang digunakan benar** dari auth.users

### Jika error "user not found":
- Pastikan email di public.users **sama persis** dengan email di auth.users
- Pastikan ID di public.users **sama** dengan ID di auth.users

### Jika login berhasil tetapi redirect ke change-password:
- Ini **normal** karena `is_first_login: true`
- User harus mengganti password sekali

---

## Status Saat Ini

✅ **8 user sudah ada di auth.users** (aulia, anna, septi, nita, anggun, azizah, intan, tegar)
❌ **public.users MASIH KOSONG** - Perlu diisi manual via SQL
✅ **Password default**: 12345678 (sudah diset di auth.users)

**Langkah selanjutnya: Jalankan SQL di Supabase Dashboard untuk mengisi public.users**