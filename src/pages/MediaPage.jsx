import { Card } from "../components/ui/Card";

export function MediaPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Media</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola konten media, publikasi, dan dokumentasi kegiatan.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4">
          <h2 className="font-semibold">Posting Hari Ini</h2>
          <p className="mt-2 text-3xl font-bold">6</p>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">File Terupload</h2>
          <p className="mt-2 text-3xl font-bold">128</p>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Kategori Media</h2>
          <p className="mt-2 text-3xl font-bold">9</p>
        </Card>
      </div>
    </div>
  );
}
