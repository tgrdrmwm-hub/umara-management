import { Card } from "../components/ui/Card";

export function SuratLuarPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Surat Keluar</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pantau pengajuan, status, dan arsip surat keluar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4">
          <h2 className="font-semibold">Surat Baru</h2>
          <p className="mt-2 text-3xl font-bold">8</p>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Sudah Diproses</h2>
          <p className="mt-2 text-3xl font-bold">41</p>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Menunggu Tanda Tangan</h2>
          <p className="mt-2 text-3xl font-bold">5</p>
        </Card>
      </div>
    </div>
  );
}
