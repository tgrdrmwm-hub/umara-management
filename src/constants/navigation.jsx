import {
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  Medal,
  Settings,
  ShieldCheck,
  Users,
  FileText,
  UserCog,
} from "lucide-react";

export const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kategori & Layanan", href: "/tax", icon: ShieldCheck },
  { label: "Client", href: "/clients", icon: BriefcaseBusiness },
  { label: "Staff", href: "/staff", icon: Users },
  { label: "Absensi", href: "/attendance", icon: CalendarCheck },
  { label: "Point", href: "/points", icon: Medal },
  { label: "Task", href: "/tasks", icon: ClipboardList },
  { label: "Tugas Magang", href: "/intern-tasks", icon: FileText },
  { label: "Report", href: "/reports", icon: FileSpreadsheet },
  { label: "Users", href: "/users-management", icon: UserCog },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const chartTabs = [
  { label: "Line", icon: BarChart3 },
  { label: "Bar", icon: BarChart3 },
  { label: "Pie", icon: BarChart3 },
  { label: "Area", icon: BarChart3 },
  { label: "Radar", icon: BarChart3 },
];
