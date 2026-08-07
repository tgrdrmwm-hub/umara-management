import { Image, LayoutGrid, Upload } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

const stats = [
  {
    label: "Posting Hari Ini",
    value: 6,
    icon: LayoutGrid,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
    badge: { label: "Hari ini", tone: "blue" },
  },
  {
    label: "File Terupload",
    value: 128,
    icon: Upload,
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
    badge: { label: "Total", tone: "green" },
  },
  {
    label: "Kategori Media",
    value: 9,
    icon: Image,
    color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10",
    badge: { label: "Kategori", tone: "purple" },
  },
];

export function MediaPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Media
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Kelola konten media, publikasi, dan dokumentasi kegiatan.
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
          <Image className="h-6 w-6 text-slate-400" />
        </div>
        <h2 className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Fitur Media Segera Hadir
        </h2>
        <p className="mt-1 max-w-xs text-xs text-slate-400">
          Upload, kelola, dan publikasi konten media dari satu tempat. Sedang
          dalam pengembangan.
        </p>
      </Card>
    </div>
  );
}
