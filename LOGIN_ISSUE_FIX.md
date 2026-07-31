# Fix untuk Masalah Login "Profil user belum ada di tabel users"

## Masalah
Aplikasi mengalami masalah login dengan error "Profil user belum ada di tabel users". Ini terjadi karena:
- User sudah terdaftar di Supabase Auth (auth.users)
- Tetapi belum terdaftar di tabel public.users
- Sistem mencoba mencari profil user di public.users setelah login berhasil, tetapi tidak menemukannya

## Solusi

### 1. Sinkronisasi User dari auth.users ke public.users
Jalankan script berikut untuk menyinkronkan semua user dari auth.users ke public.users:

```bash
node sync-auth-users.js
```

Script ini akan:
- Mengambil semua user dari auth.users
- Memeriksa apakah user sudah ada di public.users
- Membuat user yang belum ada di public.users dengan data default

### 2. Set Password untuk User
Setelah sinkronisasi, Anda bisa set password untuk user menggunakan SQL script:

1. Buka Supabase SQL Editor
2. Jalankan script `supabase/set_passwords.sql`
3. Setelah script dijalankan, Anda bisa set password untuk user tertentu dengan:

```sql
SELECT set_user_password('email@contoh.com', 'password_baru_123');
```

### 3. Periksa Status User
Untuk melihat daftar semua user dan statusnya, jalankan:

```sql
SELECT * FROM list_users_with_status();
```

## Perubahan yang Dilakukan

### 1. Peningkatan Error Handling
- Error message login sekarang lebih informatif
- Pesan error spesifik untuk berbagai kasus (email/password salah, email belum dikonfirmasi, dll)
- Pesan error untuk user yang belum ada di public.users sekarang memberikan instruksi yang jelas

### 2. Validasi Form Login
- Password sekarang wajib diisi (sebelumnya optional)
- Validasi dilakukan di level schema menggunakan Zod

### 3. Script Pendukung
- `sync-auth-users.js`: Script untuk menyinkronkan user dari auth.users ke public.users
- `supabase/set_passwords.sql`: Script SQL untuk membantu set password dan memeriksa status user

## Cara Menggunakan

1. **Sinkronkan user terlebih dahulu**:
   ```bash
   node sync-auth-users.js
   ```

2. **Set password untuk user** (opsional, jika diperlukan):
   ```sql
   SELECT set_user_password('email@contoh.com', 'password_baru_123');
   ```

3. **Coba login kembali**

## Catatan
- Pastikan environment variables `VITE_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` sudah terisi dengan benar di file `.env`
- Script menggunakan service role key yang memiliki akses admin, jadi pastikan untuk menjaga kerahasiaan key ini
- Setelah sinkronisasi, user akan diminta untuk mengganti password pada login pertama