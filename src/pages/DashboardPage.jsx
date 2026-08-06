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
  Legend,
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
import {
  PALETTE,
  tooltipStyle,
  axisTick,
  gridStyle,
  animationProps,
  lineAnimationProps,
} from "../components/ui/ChartWrapper";
import { taxServiceDefinitions } from "../constants/taxServices";
import { useAppData } from "../hooks/useAppData";

const statConfig = [
  { color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
  { color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10" },
  { color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  { color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-500/10" },
  { color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-500/10" },
  { color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-500/10" },
  { color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-500/10" },
];

export function DashboardPage() {
  const { data } = useAppData();
  if (!data) return null;

  const activeTaxWorks = data.taxWorks.filter((w) => w.status !== "Selesai");
  const completedTaxWorks = data.taxWorks.filter((w) => w.status === "Selesai");
  const picCount = new Set(data.taxWorks.map((w) => w.pic).filter(Boolean)).size;
  const averageAttendance = data.users.length
    ? Math.round(data.users.reduce((s, u) => s + u.attendanceRate, 0) / data.users.length)
    : 0;

  const taxCategoryChart = taxServiceDefinitions.map((g) => ({
    category: g.category.replace("Aktivasi ", ""),
    layanan: g.services.length,
  }));

  const stats = [
    { label: "Total Client", value: data.clients.length, icon: Users },
    { label: "PIC Aktif", value: picCount, icon: Users },
    { label: "Layanan Pajak", value: taxServiceDefinitions.reduce((s, g) => s + g.services.length, 0), icon: ShieldCheck },
    { label: "Pajak Berjalan", value: activeTaxWorks.length, icon: Clock3 },
    { label: "Pajak Selesai", value: completedTaxWorks.length, icon: CheckCircle2 },
    { label: "Task Selesai", value: data.tasks.filter((t) => t.status === "done").length, icon: CheckCircle2 },
    { label: "Kehadiran", value: `${averageAttendance}%`, icon: BellRing },
    { label: "Total Point", value: data.users.reduce((s, u) => s + u.points, 0), icon: Medal },
  ];

  const pieData = [
    { name: "Selesai", value: completedTaxWorks.length },
    { name: "Berjalan", value: data.taxWorks.filter((w) => w.status === "Berjalan").length },
    { name: "Review", value: data.taxWorks.filter((w) => w.status === "Review").length },
    { name: "Draft", value: data.taxWorks.filter((w) => w.status === "Draft").length },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Dashboard Operasional
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Ringkasan operasional UMARA TAX — hari ini.
          </p>
        </div>
        <Badge tone="blue">
          <BellRing className="h-3 w-3" />
          0 deadline minggu ini
        </Badge>
      </motion.div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
          >
            <Card className="p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${statConfig[i % statConfig.length].bg}`}>
                  <stat.icon className={`h-4 w-4 ${statConfig[i % statConfig.length].color}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {stat.value}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {/* Line chart */}
        <ChartCard title="Pekerjaan Selesai per Bulan" subtitle="Tren penyelesaian pekerjaan pajak" delay={0}>
          <LineChart data={data.analytics} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
            <defs>
              <filter id="lineShadow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={PALETTE[0]} floodOpacity="0.3" />
              </filter>
            </defs>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Line
              type="monotone"
              dataKey="done"
              name="Selesai"
              stroke={PALETTE[0]}
              strokeWidth={3}
              dot={{ r: 4, fill: "#fff", stroke: PALETTE[0], strokeWidth: 2.5 }}
              activeDot={{ r: 6, fill: PALETTE[0], stroke: "#fff", strokeWidth: 2 }}
              {...lineAnimationProps}
            />
          </LineChart>
        </ChartCard>

        {/* Bar chart layanan */}
        <ChartCard title="Kategori Layanan Pajak" subtitle="Jumlah layanan per kategori" delay={0.1}>
          <BarChart data={taxCategoryChart} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="category" tick={{ ...axisTick, angle: -45, textAnchor: "end", height: 40 }} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="layanan" name="Layanan" radius={[6, 6, 0, 0]} maxBarSize={52} {...animationProps}>
              {taxCategoryChart.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.88} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        {/* Donut Pie */}
        <ChartCard title="Status Pekerjaan Pajak" subtitle="Distribusi status saat ini" delay={0.2}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              innerRadius={52}
              paddingAngle={4}
              strokeWidth={0}
              {...animationProps}
              animationDuration={1000}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ fontSize: 11, color: "#64748b" }}>{value}</span>
              )}
            />
          </PieChart>
        </ChartCard>

        {/* Area chart point */}
        <ChartCard title="Tren Point Staff" subtitle="Akumulasi point bulanan" delay={0.3}>
          <AreaChart data={data.analytics} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
            <defs>
              <linearGradient id="gradPoints" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETTE[2]} stopOpacity={0.25} />
                <stop offset="100%" stopColor={PALETTE[2]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Area
              type="monotone"
              dataKey="points"
              name="Point"
              stroke={PALETTE[2]}
              strokeWidth={3}
              fill="url(#gradPoints)"
              dot={{ r: 4, fill: "#fff", stroke: PALETTE[2], strokeWidth: 2.5 }}
              activeDot={{ r: 6, fill: PALETTE[2], stroke: "#fff", strokeWidth: 2 }}
              {...lineAnimationProps}
            />
          </AreaChart>
        </ChartCard>

        {/* Radar */}
        <ChartCard title="Radar Operasional" subtitle="Performa lintas dimensi" className="xl:col-span-2" delay={0.4}>
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="72%"
            data={[
              { item: "Client", score: data.clients.length },
              { item: "PIC", score: picCount },
              { item: "Pajak", score: data.taxWorks.length },
              { item: "Absensi", score: data.attendance.length },
              { item: "Point", score: Math.max(1, Math.round(data.users.reduce((s, u) => s + u.points, 0) / 100)) },
            ]}
          >
            <defs>
              <linearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETTE[4]} stopOpacity={0.3} />
                <stop offset="100%" stopColor={PALETTE[4]} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="item" tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }} />
            <Radar
              dataKey="score"
              stroke={PALETTE[4]}
              fill="url(#radarGrad)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#fff", stroke: PALETTE[4], strokeWidth: 2 }}
              {...lineAnimationProps}
            />
            <Tooltip {...tooltipStyle} />
          </RadarChart>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + delay, duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      <Card className="p-5 h-full">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  );
}
