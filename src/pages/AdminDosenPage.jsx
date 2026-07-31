import { Card } from "../components/ui/Card";

export function AdminDosenPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Admin Dosen</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola data dosen, jadwal, dan pengaturan administratif.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4">
          <h2 className="font-semibold">Dosen Aktif</h2>
          <p className="mt-2 text-3xl font-bold">24</p>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Jadwal Hari Ini</h2>
          <p className="mt-2 text-3xl font-bold">12</p>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Permintaan Perubahan</h2>
          <p className="mt-2 text-3xl font-bold">3</p>
        </Card>
      </div>
    </div>
  );
}
