import { motion } from "framer-motion";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Medal,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { taxServiceDefinitions } from "../constants/taxServices";
import { useAppData } from "../hooks/useAppData";

const colors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"];
const statColors = [
  "bg-blue-100 text-blue-700 ring-blue-700/10 group-hover:bg-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
  "bg-purple-100 text-purple-700 ring-purple-700/10 group-hover:bg-purple-600 dark:bg-purple-500/20 dark:text-purple-300",
  "bg-amber-100 text-amber-700 ring-amber-700/10 group-hover:bg-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 ring-emerald-700/10 group-hover:bg-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-pink-100 text-pink-700 ring-pink-700/10 group-hover:bg-pink-600 dark:bg-pink-500/20 dark:text-pink-300",
  "bg-indigo-100 text-indigo-700 ring-indigo-700/10 group-hover:bg-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
  "bg-rose-100 text-rose-700 ring-rose-700/10 group-hover:bg-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-teal-100 text-teal-700 ring-teal-700/10 group-hover:bg-teal-600 dark:bg-teal-500/20 dark:text-teal-300",
];

export function DashboardPage() {
  const { data } = useAppData();
  if (!data) return null;

  const activeTaxWorks = data.taxWorks.filter(
    (work) => work.status !== "Selesai",
  );
  const completedTaxWorks = data.taxWorks.filter(
    (work) => work.status === "Selesai",
  );
  const picCount = new Set(
    data.taxWorks.map((work) => work.pic).filter(Boolean),
  ).size;
  const averageAttendance = data.users.length
    ? Math.round(
        data.users.reduce((sum, user) => sum + user.attendanceRate, 0) /
          data.users.length,
      )
    : 0;
  const taxCategoryChart = taxServiceDefinitions.map((group) => ({
    category: group.category.replace("Aktivasi ", ""),
    layanan: group.services.length,
    point: group.services.reduce((sum, service) => sum + service.basePoints, 0),
    aktif: data.taxWorks.filter(
      (work) => work.category === group.category && work.status !== "Selesai",
    ).length,
  }));

  const stats = [
    { label: "Total Client", value: data.clients.length, icon: Users },
    { label: "PIC Aktif", value: picCount, icon: Users },
    {
      label: "Layanan Pajak",
      value: taxServiceDefinitions.reduce(
        (sum, group) => sum + group.services.length,
        0,
      ),
      icon: ShieldCheck,
    },
    { label: "Pajak Berjalan", value: activeTaxWorks.length, icon: Clock3 },
    {
      label: "Pajak Selesai",
      value: completedTaxWorks.length,
      icon: CheckCircle2,
    },
    {
      label: "Task Selesai",
      value: data.tasks.filter((task) => task.status === "done").length,
      icon: CheckCircle2,
    },
    { label: "Kehadiran", value: `${averageAttendance}%`, icon: BellRing },
    {
      label: "Point",
      value: data.users.reduce((sum, user) => sum + user.points, 0),
      icon: Medal,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur dark:border-white/10 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-800">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Dashboard Operasional
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ringkasan operasional UMARA TAX hari ini.
            </p>
          </div>
          <Badge tone="blue">0 reminder deadline minggu ini</Badge>
        </div>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card className="group p-5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(15,23,42,0.10)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition group-hover:text-white ${statColors[index % statColors.length]}`}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold">{stat.value}</p>
            </Card>
          </motion.div>
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Pekerjaan Selesai" dotColor="bg-blue-500">
          <LineChart data={data.analytics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="done"
              stroke="#3b82f6"
              strokeWidth={3}
            />
          </LineChart>
        </ChartCard>
        <ChartCard title="Kategori & Point Layanan" dotColor="bg-purple-500">
          <BarChart data={taxCategoryChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="layanan" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Status Pajak" dotColor="bg-amber-500">
          <PieChart>
            <Pie
              data={[
                { name: "Selesai", value: completedTaxWorks.length },
                {
                  name: "Berjalan",
                  value: data.taxWorks.filter(
                    (work) => work.status === "Berjalan",
                  ).length,
                },
                {
                  name: "Review",
                  value: data.taxWorks.filter(
                    (work) => work.status === "Review",
                  ).length,
                },
                {
                  name: "Draft",
                  value: data.taxWorks.filter((work) => work.status === "Draft")
                    .length,
                },
              ]}
              dataKey="value"
              nameKey="name"
              outerRadius={90}
            >
              {colors.map((color) => (
                <Cell key={color} fill={color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ChartCard>
        <ChartCard title="Point Staff" dotColor="bg-emerald-500">
          <AreaChart data={data.analytics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="points"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartCard>
        <ChartCard title="Radar Operasional" dotColor="bg-pink-500">
          <RadarChart
            data={[
              { item: "Client", score: data.clients.length },
              { item: "PIC", score: picCount },
              { item: "Pajak", score: data.taxWorks.length },
              { item: "Absensi", score: data.attendance.length },
              {
                item: "Point",
                score: data.users.reduce((sum, user) => sum + user.points, 0),
              },
            ]}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="item" />
            <Radar
              dataKey="score"
              stroke="#ec4899"
              fill="#ec4899"
              fillOpacity={0.2}
            />
          </RadarChart>
        </ChartCard>
      </section>
    </div>
  );
}

function ChartCard({ title, children, dotColor = "bg-blue-500" }) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">{title}</h2>
        <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
