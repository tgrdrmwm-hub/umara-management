# Aturan Pengembangan Project Umara Tax

## KEAMANAN DATA DATABASE (MUTLAK / CRITICAL)
1. **Dilarang Keras Menghapus Data Eksisting**:
   - Setiap kali melakukan update fitur, perbaikan bug, atau penambahan skema baru, **JANGAN PERNAH** menghapus, mereset, men-truncate, atau me-drop tabel di dalam database yang sudah berisi data staff dan klien.
2. **Migrasi Selalu Non-Destructive**:
   - Selalu gunakan format query aman:
     - `CREATE TABLE IF NOT EXISTS ...`
     - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
   - Dilarang menjalankan query `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, atau `DELETE` tanpa kondisi spesifik yang diminta secara eksplisit oleh user.
3. **Mekanisme Simpan / Update Aman (UPSERT)**:
   - Gunakan pengecekan data eksisting atau `UPSERT` bertarget (berdasarkan ID atau kombinasi kunci unik) agar record lama tidak terhapus atau tertimpa secara tidak sengaja.
4. **Backward Compatibility**:
   - Fitur atau modul lama jangan dihilangkan saat membuat modul baru, agar data input lama staff tetap bisa diakses dan tidak hilang.
