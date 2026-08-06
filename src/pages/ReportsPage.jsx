import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAppData } from "../hooks/useAppData";

const reportMeta = {
  Pajak: { desc: "Rekap pekerjaan pajak — kategori, layanan, status, PIC, deadline.", color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
  Staff: { desc: "Data lengkap staff — nama, role, point, dan kehadiran.", color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
  Absensi: { desc: "Log absensi — jam masuk, pulang, durasi, dan status.", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
  Client: { desc: "Database client — NPWP, tipe, PIC, status, email.", color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
  Point: { desc: "Ranking point staff dari pekerjaan pajak dan task.", color: "text-rose-600 bg-rose-50 dark:bg-rose-500/10" },
  Task: { desc: "Rekap task kanban — judul, PIC, deadline, status, point.", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10" },
};

export function ReportsPage() {
  const { data } = useAppData();
  if (!data) return null;

  function getRowsByType(type) {
    const rowsByType = {
      Pajak: [
        ["Kategori", "Layanan", "Client", "PIC", "Deadline", "Status"],
        ...data.taxWorks.map((i) => [i.category, i.service, i.client, i.pic, i.deadline, i.status]),
      ],
      Staff: [
        ["Nama", "Email", "Role", "Status", "Point", "Absensi"],
        ...data.users.map((u) => [u.name, u.email, u.role, u.status, String(u.points), String(u.attendanceRate)]),
      ],
      Absensi: [
        ["Staff", "Tanggal", "Masuk", "Pulang", "Status"],
        ...data.attendance.map((r) => [r.staff, r.date, r.checkIn, r.checkOut, r.status]),
      ],
      Client: [
        ["Nama", "NPWP", "Type", "PIC", "Status", "Email"],
        ...data.clients.map((c) => [c.name, c.npwp, c.type, c.pic, c.status, c.email]),
      ],
      Point: [
        ["Nama", "Role", "Point"],
        ...data.users.map((u) => [u.name, u.role, String(u.points)]),
      ],
      Task: [
        ["Judul", "Client", "PIC", "Deadline", "Status", "Point"],
        ...data.tasks.map((t) => [t.title, t.client, t.pic, t.deadline, t.status, String(t.points)]),
      ],
    };
    return rowsByType[type] ?? [["Data"], ["Belum ada data"]];
  }

  function exportCsv(type) {
    downloadCsv(`report-${type.toLowerCase()}-umara.csv`, getRowsByType(type));
  }

  function exportPdf(type) {
    const rows = getRowsByType(type);
    const html = `
      <html>
        <head>
          <title>Laporan ${type} - UMARA TAX</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            h1 { text-align: center; margin-bottom: 20px; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; }
            tr:nth-child(even) { background-color: #f8fafc; }
            @media print {
              @page { size: landscape; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Laporan ${type} - UMARA TAX</h1>
          <table>
            <thead>
              <tr>${rows[0].map(h => "<th>" + h + "</th>").join('')}</tr>
            </thead>
            <tbody>
              ${rows.slice(1).map(row => "<tr>" + row.map(cell => "<td>" + (cell || '-') + "</td>").join('') + "</tr>").join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => { 
              setTimeout(() => { window.print(); window.close(); }, 250);
            }
          </script>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '', 'width=1000,height=800');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      alert("Gagal membuka jendela print. Mohon izinkan popup di browser Anda.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Laporan</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Ekspor data sebagai CSV atau cetak ke PDF untuk semua modul.
        </p>
      </div>

      {/* Report cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(data.reportTypes ?? Object.keys(reportMeta)).map((type) => {
          const meta = reportMeta[type] ?? { desc: `Data ${type}`, color: "text-slate-600 bg-slate-100 dark:bg-white/8" };
          return (
            <Card key={type} className="p-5">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">Laporan {type}</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{meta.desc}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => exportPdf(type)}>
                  <Printer className="h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button size="sm" onClick={() => exportCsv(type)}>
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
