import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { User, Eye } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import {
  PALETTE,
  CustomTooltip,
  axisTick,
  gridStyle,
  animationProps,
} from "../components/ui/ChartWrapper";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";
import { StaffProfileModal } from "../components/StaffProfileModal";

export function StaffPage() {
  const { data } = useAppData();
  const { user: currentUser } = useAuth();
  const [selectedStaff, setSelectedStaff] = useState(null);

  const staffUsers = useMemo(() => {
    const list =
      data?.users?.filter((u) =>
        [
          "staff",
          "manager",
          "staff_magang",
          "magang",
          "owner",
          "developer",
        ].includes(u.role),
      ) || [];

    if (currentUser) {
      return [...list].sort((a, b) => {
        const aIsMe = a.id === currentUser.id || a.email === currentUser.email;
        const bIsMe = b.id === currentUser.id || b.email === currentUser.email;
        if (aIsMe && !bIsMe) return -1;
        if (!aIsMe && bIsMe) return 1;
        return 0;
      });
    }
    return list;
  }, [data?.users, currentUser]);

  // Hanya staf bersangkutan (sesuai akun login) yang bisa mengisi biodatanya,
  // dan developer memiliki akses penuh untuk memeriksa & mengedit biodata semua staf.
  const canEditStaff = Boolean(
    currentUser?.role === "developer" ||
      (selectedStaff && currentUser?.id === selectedStaff?.id),
  );

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
            Staff
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Manager, staff, dan magang — point, presensi, dan ranking.
          </p>
        </div>
        <Badge tone="blue">{staffUsers.length} anggota</Badge>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
      >
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/8">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    Point
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    Presensi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                    Biodata
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/8">
                {staffUsers.map((user, index) => {
                  const roleLabel =
                    user.role === "developer"
                      ? "Developer & Staff"
                      : user.role.replace("_", " ");
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedStaff(user)}
                    >
                      <td className="px-4 py-3 text-xs font-medium text-slate-400">
                        #{index + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2.5">
                          {user.avatar &&
                          (user.avatar.startsWith("http") ||
                            user.avatar.startsWith("data:image")) ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-white/10"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                              {user.name
                                ? user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()
                                : "U"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                              {user.name}
                            </span>
                            {user.phone && (
                              <span className="text-[11px] text-slate-400 block truncate">
                                {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="slate" className="capitalize text-[10px]">
                          {roleLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {Number(user.points ?? 0).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                        {user.attendanceRate}%
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="green" className="text-[10px]">
                          {user.status || "Aktif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStaff(user);
                          }}
                          className="text-xs gap-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Profil</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Staff Profile Modal */}
      <StaffProfileModal
        user={selectedStaff}
        isOpen={Boolean(selectedStaff)}
        onClose={() => setSelectedStaff(null)}
        canEdit={canEditStaff}
      />

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
      >
        <Card className="p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Point Staff
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Perbandingan total point antar staff
            </p>
          </div>
          {staffUsers.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              Belum ada data staff
            </div>
          ) : (
            <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={staffUsers}
                  margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
                >
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{
                      ...axisTick,
                      angle: -45,
                      textAnchor: "end",
                      height: 40,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<CustomTooltip />} cursor={{ fill: "var(--tw-colors-slate-500)", opacity: 0.05, rx: 4 }}
                    formatter={(v) => [v.toLocaleString(), "Point"]}
                  />
                  <Bar
                    dataKey="points"
                    name="Point"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={56}
                    {...animationProps}
                  >
                    {staffUsers.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PALETTE[i % PALETTE.length]}
                        fillOpacity={0.88}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
