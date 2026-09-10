# LAPORAN FITUR & SPESIFIKASI SISTEM
## **UMARA TAX MANAGEMENT SYSTEM**

---

### 1. Ringkasan Eksekutif (Executive Summary)

**Umara Tax Management System** adalah platform web aplikasi internal terpadu (*Enterprise Resource Planning & CRM*) yang dirancang khusus untuk memodernisasi, mengotomasi, dan mengamankan seluruh alur kerja operasional di **Kantor Konsultan Pajak Umara**.

Platform ini mengintegrasikan manajemen data wajib pajak (klien), penugasan staf dan anak magang, administrasi surat/dokumen, pencatatan presensi real-time, evaluasi performa berbasis gamifikasi poin, hingga sistem pencadangan data otomatis (*cloud backup*).

* **Teknologi Utama**: React 19, Vite, Tailwind CSS, Supabase (PostgreSQL & Row Level Security), TanStack React Query, Recharts, Framer Motion.
* **Skalabilitas**: Berbasis *cloud serverless*, responsif diakses dari desktop maupun tablet, dan mendukung backup otomatis berkala.

---

### 2. Keamanan & Kontrol Akses (Role-Based Access Control / RBAC)

Aplikasi dilengkapi dengan sistem otentikasi ketat dan pembagian hak akses bertingkat (6 level role) untuk menjaga kerahasiaan data perpajakan klien:

1. **Developer**: Akses teknis penuh, pemeliharaan skema database, dan diagnostik sistem.
2. **Owner**: Akses eksekutif ke seluruh laporan keuangan, performa tim, data rahasia klien, dan manajemen user.
3. **Manager**: Memonitor operasional harian, mendelegasikan tugas perpajakan, mengelola data klien, dan mereview hasil kerja.
4. **Staff**: Mengerjakan tugas pajak yang didelegasikan, memperbarui progres klien, mencatat presensi, dan melihat poin kinerja pribadi.
5. **Staff Magang**: Menerima penugasan pendukung dengan pembatasan akses data sensitif klien.
6. **Magang**: Fokus pada penugasan khusus magang (*intern tasks*) yang dipantau oleh pembimbing.

> [!NOTE]
> **Fitur Keamanan Tambahan:**
> - **Force Password Change**: Pengguna baru diwajibkan mengganti password pada login pertama kali.
> - **Row Level Security (RLS)**: Enkripsi dan isolasi data di tingkat database PostgreSQL agar data tidak bocor antar pengguna tidak berwenang.

---

### 3. Rincian Fitur & Modul Utama

```
┌────────────────────────────────────────────────────────────────────────┐
│                      UMARA TAX MANAGEMENT SYSTEM                       │
├─────────────────┬───────────────────┬─────────────────┬────────────────┤
│   OPERASIONAL   │    CRM & PAJAK    │    SDM & TIM    │  ADMINISTRASI  │
├─────────────────┼───────────────────┼─────────────────┼────────────────┤
│ • Dashboard KPI │ • CRM Klien Pajak │ • Presensi Absen│ • Surat Keluar │
│ • Task Kanban   │ • Layanan Coretax │ • Gamifikasi Poin│ • Media Arsip │
│ • Intern Tasks  │ • SP2DK & SPT     │ • Manajemen Staf│ • User & Role  │
│ • Admin Dosen   │ • CSV Import/Exp  │ • Leaderboard   │ • Auto Backup  │
└─────────────────┴───────────────────┴─────────────────┴────────────────┘
```

#### Modul 1: Dashboard Eksekutif & Analitik Data (`DashboardPage`)
- **Kartu Metrik Kunci (KPI)**: Menampilkan total klien aktif, jumlah staf, katalog layanan pajak yang aktif, jumlah tugas berjalan, serta tugas selesai secara *real-time*.
- **Grafik Interaktif (Recharts)**:
  - *Distribusi Kategori Pajak*: Visualisasi beban layanan berdasarkan kategori (Aktivasi Coretax, SPT Masa, SPT Tahunan, SP2DK).
  - *Statistik Performa & Kehadiran*: Rata-rata tingkat kehadiran tim dan grafik produktivitas kerja.

#### Modul 2: CRM & Database Klien Pajak (`ClientsPage`)
- **Penyimpanan Data Sensitif Pajak Terpusat**:
  - Profil Wajib Pajak: Badan vs Orang Pribadi (OP).
  - Kredensial Resmi: NPWP, NIK, EFIN, akun DJP Online, akun Coretax, passphrase sertifikat elektronik, dan kode aktivasi.
  - Data PIC & Kontak: Email, nomor telepon, alamat penanggung jawab (PJ).
  - Arsip Dokumen: Tautan langsung ke Google Drive berkas klien dan pelaporan SPT Tahunan.
- **Manajemen Kontrak**: Pencatatan tanggal mulai dan akhir kontrak kerja sama dengan klien (Aktif, Prospek, Nonaktif).
- **Delegasi Cepat (*Quick Task Assignment*)**: Fitur langsung dari kartu klien untuk membuat tugas baru dan menunjuk staf penanggung jawab (PIC) beserta deadline.
- **Import & Export CSV**: Fitur import data massal klien dari file Excel/CSV (menggunakan PapaParse) serta download data cadangan seketika.

#### Modul 3: Katalog Layanan Perpajakan (`TaxPage`)
- **Kategori Layanan Standar Kantor**:
  1. *Aktivasi Coretax DJP*
  2. *SP2DK & Pendampingan Pemeriksaan*
  3. *SPT Masa (PPh 21, PPh 23, PPN, dll)*
  4. *SPT Tahunan (Badan & Orang Pribadi)*
- **Katalog Berbasis Poin**: Setiap jenis pekerjaan memiliki bobot *base points* yang terintegrasi langsung dengan sistem reward kinerja staf.
- **Akses Pengelolaan**: Owner dan Developer dapat menambah, mengedit, atau menonaktifkan jenis layanan pajak sesuai regulasi perpajakan terbaru.

#### Modul 4: Manajemen Tugas Staf (`TasksPage`)
- **Pelacakan Alur Kerja (Workflow Tracking)**: Status tugas terbagi menjadi 4 tahap: `To Do` → `In Progress` → `Review` → `Done`.
- **Penetapan Deadline & PIC**: Memastikan tidak ada keterlambatan pelaporan pajak klien (*anti-denda pajak*).
- **Catatan & Lampiran**: Staf dapat menyematkan catatan teknis dan tautan berkas kerja untuk direview oleh Manager/Owner.

#### Modul 5: Manajemen Tugas Khusus Magang & Dosen (`InternTasksPage` & `AdminDosenPage`)
- **Papan Kanban Tugas Magang**: Memisahkan penugasan karyawan tetap dengan peserta magang agar alur kerja tidak tumpang tindih.
- **Penetapan Pembimbing (Assigner)**: Staf senior dapat memberikan tugas langsung ke peserta magang tertentu lengkap dengan tanggal dan file petunjuk.
- **Panel Koordinasi Akademik / Dosen**: Memfasilitasi pemantauan jadwal dan evaluasi peserta magang yang terhubung dengan kampus/pembimbing akademik.

#### Modul 6: Sistem Presensi Karyawan (`AttendancePage`)
- **Pencatatan Kehadiran Harian**: Waktu *Check-In* dan *Check-Out* harian staf.
- **Status Kehadiran Fleksibel**: Mendukung status `Hadir`, `Terlambat`, `Izin`, dan `Remote (WFA)`.
- **Kalkulasi Otomatis Tingkat Kehadiran (*Attendance Rate*)**: Rekap persentase kehadiran masing-masing staf yang diperbarui otomatis setiap hari.
- **Grafik Tren Kehadiran Mingguan**: Memudahkan pimpinan melihat kedisiplinan tim secara visual.

#### Modul 7: Evaluasi Kinerja Berbasis Gamifikasi (`PointsPage`)
- **Leaderboard Performa Tim**: Peringkat staf secara real-time berdasarkan perolehan poin dari tugas-tugas yang berhasil diselesaikan.
- **Podium Visual**: Apresiasi visual untuk Juara 1 (Emas), Juara 2 (Perak), dan Juara 3 (Perunggu).
- **Tingkatan Badge Karyawan**: Klasifikasi otomatis ke level `Elite`, `Pro`, dan `Rising Staff`.
- **Penyesuaian Poin Manual**: Pimpinan dapat memberikan bonus poin ekstra atas performa luar biasa staf.

#### Modul 8: Direktori Staf & Manajemen Tim (`StaffPage`)
- Informasi lengkap staf: jabatan/role, kontak telepon, email, status aktif, dan akumulasi poin kinerja.

#### Modul 9: Administrasi Surat & Arsip Media (`SuratLuarPage` & `MediaPage`)
- **Agenda Surat Keluar**: Pencatatan nomor surat, perihal, tujuan instansi/klien, dan tanggal pengiriman surat resmi kantor.
- **Arsip Media**: Penyimpanan aset visual, logo, dan dokumen pendukung kantor.

#### Modul 10: Laporan Rekapitulasi (`ReportsPage`)
- Penyajian ringkasan aktivitas kantor, rekap pekerjaan selesai per periode, dan bahan evaluasi rapat bulanan pimpinan.

#### Modul 11: Manajemen Pengguna & Keamanan Akun (`UsersManagementPage` & `SettingsPage`)
- Pendaftaran akun staf baru dengan role yang ditentukan.
- Pengaturan ganti password dan pembaruan profil pengguna.
- Fitur reset password dan penonaktifan akun staf yang sudah tidak bekerja di kantor.

#### Modul 12: Otomasi Pencadangan Data ke Telegram (`telegram_backup.js`)
- **Disaster Recovery Otomatis**: Script otomatis yang mengekstrak seluruh data tabel (users, clients, tasks, tax, attendance) menjadi file cadangan terstruktur (`backup.json`).
- **Integrasi Bot Telegram**: Mengirimkan file cadangan tersebut secara otomatis ke grup/channel privat Telegram pimpinan secara berkala tanpa perlu download manual.

---

### 4. Nilai Tambah & Efisiensi Bisnis untuk Kantor

1. **Zero Data Loss**: Data wajib pajak dan password DJP/Coretax klien tidak lagi tercecer di WhatsApp, buku tulis, atau sticky notes yang rawan hilang.
2. **Kepatuhan Deadline (*Punctuality*)**: Sistem deadline tugas mencegah keterlambatan pelaporan SPT yang berisiko denda bagi klien.
3. **Transparansi Kinerja**: Owner dapat melihat secara objektif siapa staf yang paling produktif melalui data poin dan riwayat tugas selesai.
4. **Efisiensi Biaya**: Menggantikan kebutuhan banyak software terpisah (software CRM, absensi online, dan task manager berbayar) menjadi satu sistem milik sendiri tanpa biaya langganan pihak ketiga yang mahal.
