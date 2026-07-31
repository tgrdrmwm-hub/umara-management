import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAppData } from "../hooks/useAppData";

export function ReportsPage() {
  const { data } = useAppData();
  if (!data) return null;
  const appData = data;

  function exportCsv(type) {
    const rowsByType = {
      Pajak: [
        ["Kategori", "Layanan", "Client", "PIC", "Deadline", "Status"],
        ...appData.taxWorks.map((item) => [
          item.category,
          item.service,
          item.client,
          item.pic,
          item.deadline,
          item.status,
        ]),
      ],
      Staff: [
        ["Nama", "Email", "Role", "Status", "Point", "Absensi"],
        ...appData.users.map((user) => [
          user.name,
          user.email,
          user.role,
          user.status,
          String(user.points),
          String(user.attendanceRate),
        ]),
      ],
      Absensi: [
        ["Staff", "Tanggal", "Masuk", "Pulang", "Status"],
        ...appData.attendance.map((row) => [
          row.staff,
          row.date,
          row.checkIn,
          row.checkOut,
          row.status,
        ]),
      ],
      Client: [
        ["Nama", "NPWP", "Type", "PIC", "Status", "Email"],
        ...appData.clients.map((client) => [
          client.name,
          client.npwp,
          client.type,
          client.pic,
          client.status,
          client.email,
        ]),
      ],
      Point: [
        ["Nama", "Role", "Point"],
        ...appData.users.map((user) => [
          user.name,
          user.role,
          String(user.points),
        ]),
      ],
      Task: [
        ["Judul", "Client", "PIC", "Deadline", "Status", "Point"],
        ...appData.tasks.map((task) => [
          task.title,
          task.client,
          task.pic,
          task.deadline,
          task.status,
          String(task.points),
        ]),
      ],
    };
    downloadCsv(
      `report-${type.toLowerCase()}-umara.csv`,
      rowsByType[type] ?? [["Data"], ["Belum ada data"]],
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Report</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          PDF & Excel untuk Pajak, Staff, Absensi, Client, Point, dan Task.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {appData.reportTypes.map((type) => (
          <Card key={type} className="p-4">
            <FileSpreadsheet className="h-6 w-6 text-green-700" />
            <h2 className="mt-3 font-bold">Report {type}</h2>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => window.print()}>
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportCsv(type)}
              >
                <Download className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
