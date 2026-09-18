import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
  LayoutPanelLeft,
  LayoutDashboard,
  BriefcaseBusiness,
  ClipboardList,
  CalendarCheck,
  Medal,
  MoreHorizontal,
} from "lucide-react";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("umara_theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("umara_theme", dark ? "dark" : "light");
  }, [dark]);

  const filteredNav = navigation.filter((item) => {
    const isAdmin = ["owner", "developer", "manager", "admin"].includes(
      user?.role,
    );

    const isDeveloper = user?.role === "developer";

    if (item.label === "Users" && !isDeveloper) {
      return false;
    }

    if (item.label === "Report" && !isAdmin) {
      return false;
    }

    if (user?.role === "magang" || user?.role === "staff_magang") {
      return [
        "Dashboard",
        "Kalender Kegiatan",
        "Kategori & Layanan",
        "Task",
        "Tugas Magang",
        "Client",
        "Absensi",
        "Point",
      ].includes(item.label);
    }
    if (user?.role === "staff") {
      return [
        "Dashboard",
        "Kalender Kegiatan",
        "Kategori & Layanan",
        "Client",
        "Staff",
        "Task",
        "Tugas Magang",
        "Absensi",
        "Point",
      ].includes(item.label);
    }
    if (user?.role === "owner") {
      return [
        "Dashboard",
        "Kalender Kegiatan",
        "Kategori & Layanan",
        "Client",
        "Staff",
        "Task",
        "Tugas Magang",
        "Absensi",
        "Point",
        "Report",
        "Settings",
      ].includes(item.label);
    }
    return true;
  });

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-x-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-white/8 dark:bg-slate-900",
          sidebarOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "lg:w-16" : "lg:w-64 w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-white/8 overflow-hidden">
          <div className="flex items-center w-full justify-center lg:justify-start">
            <img 
              src="https://umaratax.com/wp-content/uploads/2025/07/image-1.png" 
              alt="Umaratax Logo" 
              className={cn("h-10 w-auto object-contain transition-opacity duration-200", sidebarCollapsed ? "hidden lg:hidden" : "block")} 
            />
            {sidebarCollapsed && (
              <div className="hidden lg:flex mx-auto font-bold text-xl text-slate-900 dark:text-white">U</div>
            )}
          </div>
          <button
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden dark:hover:bg-white/8 absolute right-4"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 overflow-x-hidden">
          <div className="space-y-1">
            {filteredNav.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-lg transition-colors overflow-hidden",
                    sidebarCollapsed ? "justify-center py-3 px-0" : "gap-2.5 px-3 py-2.5",
                    isActive
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100",
                  )
                }
              >
                <item.icon className={cn("shrink-0", sidebarCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                {!sidebarCollapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User info at bottom */}
        <div className="shrink-0 border-t border-slate-100 p-3 dark:border-white/8">
          <div className={cn("flex items-center rounded-lg py-2", sidebarCollapsed ? "justify-center px-0" : "gap-2.5 px-2")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              {userInitials}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {user?.name}
                </p>
                <p className="truncate text-[10px] capitalize text-slate-500 dark:text-slate-400">
                  {user?.role?.replace("_", " ")}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn("transition-all duration-300 min-w-0", sidebarCollapsed ? "lg:pl-16" : "lg:pl-64")}>
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 sm:gap-3 border-b border-slate-200/80 bg-white/95 px-3 sm:px-4 backdrop-blur-md dark:border-white/8 dark:bg-slate-950/95">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden shrink-0 h-9 w-9"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex shrink-0 h-9 w-9"
            aria-label="Toggle sidebar"
          >
            <LayoutPanelLeft className="h-4 w-4" />
          </Button>

          <div className="relative max-w-xs flex-1 hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari..." className="pl-8 h-8 text-xs" />
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => setDark((v) => !v)}
              aria-label="Toggle theme"
            >
              {dark ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" aria-label="Notifications">
              <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </Button>
            <div className="mx-0.5 sm:mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={logout}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-screen-xl min-w-0 px-3 py-4 sm:px-5 sm:py-6 lg:px-8 pb-20 lg:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 px-1 py-1.5 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors select-none",
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )
            }
          >
            <LayoutDashboard className="h-4 w-4 mb-0.5" />
            <span>Beranda</span>
          </NavLink>

          <NavLink
            to="/clients"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors select-none",
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )
            }
          >
            <BriefcaseBusiness className="h-4 w-4 mb-0.5" />
            <span>Client</span>
          </NavLink>

          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors select-none",
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )
            }
          >
            <ClipboardList className="h-4 w-4 mb-0.5" />
            <span>Task</span>
          </NavLink>

          <NavLink
            to="/attendance"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors select-none",
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )
            }
          >
            <CalendarCheck className="h-4 w-4 mb-0.5" />
            <span>Absensi</span>
          </NavLink>

          <NavLink
            to="/points"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors select-none",
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )
            }
          >
            <Medal className="h-4 w-4 mb-0.5" />
            <span>Point</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 select-none"
          >
            <MoreHorizontal className="h-4 w-4 mb-0.5" />
            <span>Semua</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
