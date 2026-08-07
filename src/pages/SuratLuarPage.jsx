import { CheckCircle2, Clock, FilePlus } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

const stats = [
  {
    label: "Surat Baru",
    value: 8,
    icon: FilePlus,
    color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10",
    badge: { label: "Belum diproses", tone: "amber" },
  },
  {
    label: "Sudah Diproses",
    value: 41,
    icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
    badge: { label: "Selesai", tone: "green" },
  },
  {
    label: "Menunggu Tanda Tangan",
    value: 5,
    icon: Clock,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
    badge: { label: "Pending", tone: "blue" },
  },
];

export function SuratLuarPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Surat Keluar
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Pantau pengajuan, status, dan arsip surat keluar.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-center justify-between">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}
              >
                <stat.icon className="h-4 w-4" />
              </div>
              <Badge tone={stat.badge.tone}>{stat.badge.label}</Badge>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
          </Card>
        ))}
      </div>

      {/* Placeholder */}
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/8">
          <FilePlus className="h-6 w-6 text-slate-400" />
        </div>
        <h2 className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Manajemen Surat Keluar
        </h2>
        <p className="mt-1 max-w-xs text-xs text-slate-400">
          Buat, lacak, dan arsipkan surat keluar dengan mudah. Fitur lengkap
          sedang dalam pengembangan.
        </p>
      </Card>
    </div>
  );
}
