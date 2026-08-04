import { Bell, LogOut, Menu, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { navigation } from "../constants/navigation";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../utils/cn";

export function AppLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("umara_theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("umara_theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/35 lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] overflow-y-auto border-r border-white/10 bg-[#1a1a2e] text-white shadow-2xl shadow-slate-950/20 transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 font-bold text-white shadow-lg shadow-black/20">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold">Umaratax</p>
            <p className="text-[11px] text-slate-300">Management System</p>
          </div>
        </div>
        <div className="mx-4 mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Workspace
          </p>
          <p className="mt-1 text-sm font-bold">UMARA TAX</p>
          <p className="mt-1 text-xs text-slate-400">
            Pajak, staff, absensi, dan point.
          </p>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navigation.filter(item => {
            if (user?.role === 'magang' || user?.role === 'staff_magang') {
              // Menu khusus magang
              return ["Dashboard", "UMARA TAX", "Task", "Client", "Absensi", "Point"].includes(item.label);
            }
            if (user?.role === 'owner') {
              // Menu khusus owner
              return ["Dashboard", "UMARA TAX", "Client", "Staff", "Task", "Absensi", "Point", "Report"].includes(item.label);
            }
            // Menu full untuk developer, manager, staff
            return true;
          }).map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-h-screen bg-slate-50 lg:pl-72 dark:bg-slate-950">
        <header className="sticky top-0 z-30 flex h-16 flex-wrap items-center gap-3 border-b border-slate-200/70 bg-white/78 px-4 shadow-sm shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/72">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative w-full max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search client, task, staff..."
              className="pl-9"
            />
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setDark((value) => !value)}
              aria-label="Toggle theme"
            >
              {dark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button variant="secondary" size="icon" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="hidden rounded-xl border border-slate-200/80 bg-white/70 px-3 py-1.5 text-right shadow-sm dark:border-white/10 dark:bg-white/5 sm:block">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                {user?.role.replace("_", " ")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
