import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center dark:bg-slate-900">
      <div className="mb-4 text-9xl font-bold text-slate-200 dark:text-slate-800">
        404
      </div>
      <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-slate-200">
        Halaman Tidak Ditemukan
      </h1>
      <p className="mb-8 max-w-md text-slate-500 dark:text-slate-400">
        Maaf, halaman yang Anda tuju tidak ada atau Anda tidak memiliki akses ke rute tersebut.
      </p>
      <Link to="/dashboard">
        <Button>Kembali ke Dashboard</Button>
      </Link>
    </div>
  );
}
