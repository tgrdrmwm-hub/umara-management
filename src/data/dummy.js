export const users = [
  { id: "1", name: "Tegar Developer", email: "tegar@umaratax.com", role: "developer", phone: "081234567890", status: "Aktif", points: 1500, attendanceRate: 95 },
  { id: "2", name: "Andi Manager", email: "andi@umaratax.com", role: "manager", phone: "081234567891", status: "Aktif", points: 1200, attendanceRate: 90 },
  { id: "3", name: "Budi Staff", email: "budi@umaratax.com", role: "staff", phone: "081234567892", status: "Aktif", points: 800, attendanceRate: 85 },
  { id: "4", name: "Citra Staff", email: "citra@umaratax.com", role: "staff", phone: "081234567893", status: "Aktif", points: 600, attendanceRate: 80 },
  { id: "5", name: "Dedi Magang", email: "dedi@umaratax.com", role: "magang", phone: "081234567894", status: "Aktif", points: 300, attendanceRate: 75 },
  { id: "6", name: "Eka Staff", email: "eka@umaratax.com", role: "staff", phone: "081234567895", status: "Aktif", points: 450, attendanceRate: 70 },
];

export const clients = [
  { id: "1", name: "PT. Maju Mundur", npwp: "01.234.567.8-012.000", type: "Badan", status: "Aktif", pic: "Andi Manager", email: "pt.maju@email.com" },
  { id: "2", name: "CV. Sumber Rejeki", npwp: "02.345.678.9-023.000", type: "Badan", status: "Aktif", pic: "Budi Staff", email: "cv.sumber@email.com" },
  { id: "3", name: "Toko Makmur", npwp: "03.456.789.0-034.000", type: "OP", status: "Aktif", pic: "Citra Staff", email: "toko.makmur@email.com" },
  { id: "4", name: "UD. Sejahtera", npwp: "04.567.890.1-045.000", type: "OP", status: "Prospek", pic: "Dedi Magang", email: "ud.sejahtera@email.com" },
];

export const tasks = [
  { id: "1", title: "Buat SPT Tahunan", client: "PT. Maju Mundur", pic: "Andi Manager", deadline: "2024-12-31", status: "done", points: 500, notes: "SPT Masa PPh 21" },
  { id: "2", title: "Lapor Pajak Bulanan", client: "CV. Sumber Rejeki", pic: "Budi Staff", deadline: "2024-11-30", status: "progress", points: 300, notes: "PPN Masa November" },
  { id: "3", title: "Pendaftaran NPWP", client: "Toko Makmur", pic: "Citra Staff", deadline: "2024-12-15", status: "review", points: 200, notes: "NPWP Badan Usaha" },
  { id: "4", title: "Pembetulan SPT", client: "UD. Sejahtera", pic: "Dedi Magang", deadline: "2024-12-20", status: "todo", points: 150, notes: "Koreksi data" },
  { id: "5", title: "Lapor PPh 23", client: "PT. Maju Mundur", pic: "Andi Manager", deadline: "2024-12-25", status: "done", points: 400, notes: "Pemotongan PPh 23" },
];

export const taxWorks = [
  { id: "1", category: "Aktivasi Coretax", service: "Pembuatan NPWP", client: "PT. Maju Mundur", pic: "Andi Manager", deadline: "2024-12-31", status: "Selesai", attachment: "", notes: "" },
  { id: "2", category: "Aktivasi Coretax", service: "Pendaftaran PKP", client: "CV. Sumber Rejeki", pic: "Budi Staff", deadline: "2024-11-30", status: "Berjalan", attachment: "", notes: "" },
  { id: "3", category: "SPT Masa", service: "PPN Masa", client: "Toko Makmur", pic: "Citra Staff", deadline: "2024-12-15", status: "Draft", attachment: "", notes: "" },
  { id: "4", category: "SPT Tahunan", service: "PPh Badan", client: "UD. Sejahtera", pic: "Dedi Magang", deadline: "2024-12-20", status: "Review", attachment: "", notes: "" },
];

export const attendance = [
  { id: "1", staff: "Andi Manager", date: "2024-08-01", checkIn: "08:00", checkOut: "17:00", status: "Hadir" },
  { id: "2", staff: "Budi Staff", date: "2024-08-01", checkIn: "08:15", checkOut: "17:30", status: "Hadir" },
  { id: "3", staff: "Citra Staff", date: "2024-08-01", checkIn: "08:30", checkOut: "17:00", status: "Terlambat" },
  { id: "4", staff: "Dedi Magang", date: "2024-08-01", checkIn: "08:00", checkOut: "16:00", status: "Hadir" },
  { id: "5", staff: "Eka Staff", date: "2024-08-01", checkIn: "09:00", checkOut: "17:00", status: "Terlambat" },
  { id: "6", staff: "Tegar Developer", date: "2024-08-01", checkIn: "07:30", checkOut: "18:00", status: "Hadir" },
];

export const analytics = [
  { month: "Jul", clients: 4, done: 8, running: 4, points: 2400 },
  { month: "Agu", clients: 4, done: 10, running: 2, points: 2800 },
  { month: "Sep", clients: 4, done: 6, running: 6, points: 2000 },
  { month: "Okt", clients: 4, done: 4, running: 8, points: 1600 },
  { month: "Nov", clients: 4, done: 2, running: 10, points: 1200 },
  { month: "Des", clients: 4, done: 0, running: 12, points: 800 },
];

export const reportTypes = [
  "Pajak",
  "Staff",
  "Absensi",
  "Client",
  "Point",
  "Task",
];