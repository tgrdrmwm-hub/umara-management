# Aturan Pengembangan Project Umara Tax

## KEAMANAN DATA DATABASE (MUTLAK / CRITICAL)
1. **Dilarang Keras Menghapus Data Eksisting**:
   - Setiap kali melakukan update fitur, perbaikan bug, atau penambahan skema baru, **JANGAN PERNAH** menghapus, mereset, men-truncate, atau me-drop tabel di dalam database yang sudah berisi data staff dan klien.
   - **Pengecualian**: Hanya boleh dilakukan jika user secara **eksplisit** memerintahkannya.
2. **Wajib Analisis & Penjelasan Dampak (Impact Analysis)**:
   - Jika ada tindakan atau tugas yang berkaitan dengan penghapusan, modifikasi skema lama, atau perubahan data yang berisiko:
     - **Wajib diskusikan dan jelaskan dampaknya terlebih dahulu** sebelum eksekusi (data apa saja yang terdampak, dampaknya ke laporan/tampilan staff, potensi kehilangan relasi, dsb.).
     - Berikan opsi aman (seperti *backup*, *soft delete* via status, penambahan kolom baru daripada mengubah yang lama).
     - **Tunggu konfirmasi eksplisit dari user** sebelum menjalankan query atau perubahannya.
3. **Migrasi Selalu Non-Destructive**:
   - Selalu gunakan format query aman:
     - `CREATE TABLE IF NOT EXISTS ...`
     - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
   - Dilarang menjalankan query `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, atau `DELETE` tanpa perintah eksplisit dan konfirmasi user.
4. **Mekanisme Simpan / Update Aman (UPSERT)**:
   - Gunakan pengecekan data eksisting atau `UPSERT` bertarget (berdasarkan ID atau kombinasi kunci unik) agar record lama tidak terhapus atau tertimpa secara tidak sengaja.
5. **Backward Compatibility**:
   - Fitur atau modul lama jangan dihilangkan saat membuat modul baru, agar data input lama staff tetap bisa diakses dan tidak hilang.
