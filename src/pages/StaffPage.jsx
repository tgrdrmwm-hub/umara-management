import { Award, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { useAppData } from "../hooks/useAppData";

export function StaffPage() {
  const { data } = useAppData();
  
  // Tampilkan role staff, manager, staff_magang, magang, owner
  // Khusus tegar@umaratax.com ditampilkan meskipun rolenya developer
  const staffUsers = data?.users?.filter(user => 
    ['staff', 'manager', 'staff_magang', 'magang', 'owner'].includes(user.role) || 
    user.email === 'tegar@umaratax.com'
  ) || [];
  const staffCount = staffUsers.length;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola Manager, Staff, Staff Magang, point, absensi, dan ranking.
          </p>
        </div>
        <Badge tone="blue" className="mt-1">Total: {staffCount} Staff</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {staffUsers.map((user, index) => (
          <Card key={user.id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-green-700 font-bold text-white">
                {user.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">{user.name}</h2>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <Badge tone="green">#{index + 1}</Badge>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <Metric
                icon={<Award className="h-4 w-4" />}
                label="Point"
                value={user.points}
              />
              <Metric
                icon={<TrendingUp className="h-4 w-4" />}
                label="Absensi"
                value={`${user.attendanceRate}%`}
              />
              <Metric 
                label="Role" 
                value={user.email === 'tegar@umaratax.com' && user.role === 'developer' ? 'Developer & Staff' : user.role.replace("_", " ")} 
              />
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <h2 className="mb-4 font-bold">Grafik Point Staff</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={staffUsers}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="points" fill="#15803d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="rounded-md bg-slate-50 p-3 dark:bg-white/5">
      <div className="flex items-center gap-1 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-bold capitalize">{value}</p>
    </div>
  );
}
