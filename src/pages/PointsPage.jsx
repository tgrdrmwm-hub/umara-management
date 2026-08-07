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
import { motion } from "framer-motion";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import {
  PALETTE,
  CustomTooltip,
  axisTick,
  gridStyle,
  animationProps,
} from "../components/ui/ChartWrapper";
import { useAppData } from "../hooks/useAppData";
import { updateUserPoints } from "../services/database";
import { useAuth } from "../hooks/useAuth";

const badgeConfig = {
  Elite: { tone: "indigo" },
  Pro: { tone: "blue" },
  Rising: { tone: "slate" },
};

function getBadge(points) {
  if (points > 800) return "Elite";
  if (points > 600) return "Pro";
  return "Rising";
}

// Gold, silver, bronze then palette - stronger colors
const podiumColors = ["#d97706", "#64748b", "#9a3412"];

export function PointsPage() {
  const { data, isLoading, error } = useAppData();
  const { user: currentUser } = useAuth();
  const isAdmin = ["owner", "developer", "manager", "admin"].includes(
    currentUser?.role,
  );
  const queryClient = useQueryClient();
  const [draftPoints, setDraftPoints] = useState({});

  const ranked = [...(data?.users ?? [])].sort((a, b) => b.points - a.points);
  const totalPoints = ranked.reduce((s, u) => s + u.points, 0);
  const topStaff = ranked[0];
  const avgPoints = ranked.length ? Math.round(totalPoints / ranked.length) : 0;

  async function savePoints(user) {
    const newPoints = draftPoints[user.id] ?? user.points;
    try {
      await updateUserPoints(user.id, newPoints);
      await queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
      toast.success("Point diperbarui");
    } catch {
      toast.error("Gagal memperbarui point");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Point & Leaderboard
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Point dari pekerjaan pajak dan task yang diselesaikan staff.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total Point", value: totalPoints.toLocaleString() },
          {
            label: "Staff Terunggul",
            value: topStaff?.name ?? "—",
            sub: topStaff ? `${topStaff.points} poin` : undefined,
          },
          { label: "Rata-rata Point", value: avgPoints.toLocaleString() },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
          >
            <Card className="p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 truncate">
                {stat.value}
              </p>
              {stat.sub && (
                <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
      >
        <Card className="p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Grafik Point Staff
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Peringkat dari tertinggi ke terendah
            </p>
          </div>
          {ranked.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              Belum ada data
            </div>
          ) : (
            <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ranked}
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
                    formatter={(v, _, props) => [
                      v.toLocaleString() + " pt",
                      props.payload.name,
                    ]}
                  />
                  <Bar
                    dataKey="points"
                    name="Point"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={56}
                    {...animationProps}
                  >
                    {ranked.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          i < 3 ? podiumColors[i] : PALETTE[i % PALETTE.length]
                        }
                        fillOpacity={i === 0 ? 1 : 0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
      >
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs sm:min-w-[560px] sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/8">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    Badge
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                    Point
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                      Edit
                    </th>
                  )}
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/8">
                {ranked.map((user, i) => {
                  const badge = getBadge(user.points);
                  return (
                    <tr
                      key={user.id}
                      className={
                        i === 0 ? "bg-amber-50/60 dark:bg-amber-500/5" : ""
                      }
                    >
                      <td className="px-4 py-3">
                        {i === 0 ? (
                          <span className="text-lg">🥇</span>
                        ) : i === 1 ? (
                          <span className="text-lg">🥈</span>
                        ) : i === 2 ? (
                          <span className="text-lg">🥉</span>
                        ) : (
                          <span className="text-sm font-medium text-slate-400">
                            #{i + 1}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-400">
                        {user.role.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={badgeConfig[badge].tone}>{badge}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-base font-semibold"
                          style={{ color: i < 3 ? podiumColors[i] : undefined }}
                        >
                          {user.points.toLocaleString()}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-24 h-8 text-xs"
                            value={draftPoints[user.id] ?? user.points}
                            onChange={(e) =>
                              setDraftPoints({
                                ...draftPoints,
                                [user.id]: Number(e.target.value),
                              })
                            }
                          />
                        </td>
                      )}
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void savePoints(user)}
                          >
                            Simpan
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
