import { Bell, LogOut, Menu, Moon, Search, Sun, X, LayoutPanelLeft } from "lucide-react";
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
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-white/8 dark:bg-slate-900",
          sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
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
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden dark:hover:bg-white/8 absolute right-4"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
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
                    sidebarCollapsed ? "justify-center py-3 px-0" : "gap-2.5 px-3 py-2",
                    isActive
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
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
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
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
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "lg:pl-16" : "lg:pl-64")}>
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md dark:border-white/8 dark:bg-slate-950/95">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex"
            aria-label="Toggle sidebar"
          >
            <LayoutPanelLeft className="h-4 w-4" />
          </Button>

          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari..." className="pl-8 h-8 text-xs" />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDark((v) => !v)}
              aria-label="Toggle theme"
            >
              {dark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
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

        <main className="mx-auto w-full max-w-screen-xl min-w-0 px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
