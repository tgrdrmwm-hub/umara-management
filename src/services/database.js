import { getTaxServicePoint } from "../constants/taxServices";
import { supabase } from "./supabase";

export const emptyAppData = {
  analytics: [],
  attendance: [],
  clients: [],
  reportTypes: ["Pajak", "Staff", "Absensi", "Client", "Point", "Task"],
  tasks: [],
  taxWorks: [],
  users: [],
};

export async function fetchAppData() {
  if (!supabase) {
    // Return dummy data when Supabase is not configured
    return {
      ...emptyAppData,
      users: [],
      clients: [],
      tasks: [],
      taxWorks: [],
      attendance: [],
      analytics: [],
    };
  }

  const [usersResult, clientsResult, tasksResult, attendanceResult, taxResult] =
    await Promise.all([
      supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("deadline", { ascending: true }),
      supabase
        .from("attendance")
        .select("*")
        .order("date", { ascending: false }),
      supabase.from("tax").select("*").order("deadline", { ascending: true }),
    ]);

  const firstError = [
    usersResult,
    clientsResult,
    tasksResult,
    attendanceResult,
    taxResult,
  ].find((result) => result.error)?.error;

  // If error or all data is empty, return empty arrays (fallback to dummy in useAppData)
  if (firstError) {
    console.error("Supabase error:", firstError);
    return {
      ...emptyAppData,
      users: [],
      clients: [],
      tasks: [],
      taxWorks: [],
      attendance: [],
      analytics: [],
    };
  }

  const users = (usersResult.data ?? []).map(toUser);
  const tasks = (tasksResult.data ?? []).map(toTask);

  return {
    analytics: buildAnalytics(clientsResult.data ?? [], tasks, users),
    attendance: (attendanceResult.data ?? []).map(toAttendance),
    clients: (clientsResult.data ?? []).map(toClient),
    reportTypes: emptyAppData.reportTypes,
    tasks,
    taxWorks: (taxResult.data ?? []).map(toTaxWork),
    users,
  };
}

export async function fetchUserProfile(email) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    if (
      error.code === "PGRST205" ||
      error.message.includes("Could not find the table 'public.users'")
    ) {
      throw new Error(
        "Tabel public.users belum dibuat di Supabase. Jalankan supabase/schema.sql di SQL Editor.",
      );
    }
    throw error;
  }
  return data ? toUser(data) : null;
}

export async function updateUserFirstLogin(id) {
  if (!supabase) return;
  const changedAt = new Date().toISOString();
  const { error } = await supabase
    .from("users")
    .update({
      is_first_login: false,
      password_changed_at: changedAt,
      updated_at: changedAt,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function createClient(values) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.from("clients").insert({
    name: values.name,
    npwp: values.npwp,
    type: values.type,
    status: values.status,
    pic: values.pic,
    email: values.email,
  });
  if (error) throw error;
}

export async function updateClient(id, values) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase
    .from("clients")
    .update({
      name: values.name,
      npwp: values.npwp,
      type: values.type,
      status: values.status,
      pic: values.pic,
      email: values.email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteClient(id) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function createTask(values) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.from("tasks").insert(toTaskRow(values));
  if (error) throw error;
  if (values.status === "done")
    await awardPointsToPic(values.pic, values.points);
}

export async function updateTask(id, values, previousStatus) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase
    .from("tasks")
    .update({ ...toTaskRow(values), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  if (previousStatus !== "done" && values.status === "done")
    await awardPointsToPic(values.pic, values.points);
}

export async function deleteTask(id) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function createTaxWork(values) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.from("tax").insert(toTaxRow(values));
  if (error) throw error;
  if (values.status === "Selesai")
    await awardPointsToPic(
      values.pic,
      getTaxServicePoint(values.category, values.service),
    );
}

export async function updateTaxWork(id, values, previousStatus) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase
    .from("tax")
    .update({ ...toTaxRow(values), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  if (previousStatus !== "Selesai" && values.status === "Selesai") {
    await awardPointsToPic(
      values.pic,
      getTaxServicePoint(values.category, values.service),
    );
  }
}

export async function deleteTaxWork(id) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.from("tax").delete().eq("id", id);
  if (error) throw error;
}

export async function createAttendance(values) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase
    .from("attendance")
    .insert(toAttendanceRow(values));
  if (error) throw error;
}

export async function updateAttendance(id, values) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase
    .from("attendance")
    .update({
      ...toAttendanceRow(values),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAttendance(id) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.from("attendance").delete().eq("id", id);
  if (error) throw error;
}

export async function updateUserPoints(id, points) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase
    .from("users")
    .update({ points, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function awardPointsToPic(pic, points) {
  if (!supabase || !pic || points <= 0) return;
  
  // Pisahkan nama PIC menggunakan koma atau "dan" untuk mendukung banyak staf sekaligus
  const picNames = pic
    .split(/,|\bdan\b/i)
    .map(name => name.trim())
    .filter(Boolean);
    
  if (picNames.length === 0) return;

  const { data, error } = await supabase
    .from("users")
    .select("id,name,points")
    .in("name", picNames);
    
  if (error) throw error;
  if (!data || data.length === 0) return;

  // Berikan poin ke setiap PIC yang cocok
  for (const user of data) {
    const { error: updateError } = await supabase
      .from("users")
      .update({
        points: Number(user.points ?? 0) + points,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
      
    if (updateError) throw updateError;
  }
}

function toTaskRow(values) {
  return {
    title: values.title,
    client: values.client,
    pic: values.pic,
    deadline: values.deadline,
    status: values.status,
    points: values.points,
    notes: values.notes,
  };
}

function toTaxRow(values) {
  return {
    category: values.category,
    service: values.service,
    client: values.client,
    pic: values.pic,
    deadline: values.deadline,
    status: values.status,
    attachment: values.attachment,
    notes: values.notes,
  };
}

function toAttendanceRow(values) {
  return {
    staff: values.staff,
    date: values.date,
    check_in: values.checkIn || null,
    check_out: values.checkOut || null,
    status: values.status,
  };
}

function toUser(row) {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    role: String(row.role ?? "staff"),
    phone: String(row.phone ?? ""),
    avatar: String(
      row.avatar ?? initials(String(row.name ?? row.email ?? "U")),
    ),
    status: String(row.status ?? "active"),
    is_first_login: Boolean(row.is_first_login),
    password_changed_at: row.password_changed_at
      ? String(row.password_changed_at)
      : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    points: Number(row.points ?? 0),
    attendanceRate: Number(row.attendance_rate ?? row.attendanceRate ?? 0),
  };
}

function toClient(row) {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    npwp: String(row.npwp ?? ""),
    type: String(row.type ?? "Badan"),
    status: String(row.status ?? "Aktif"),
    pic: String(row.pic ?? ""),
    email: String(row.email ?? ""),
  };
}

function toTask(row) {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    client: String(row.client ?? ""),
    pic: String(row.pic ?? ""),
    deadline: String(row.deadline ?? ""),
    status: String(row.status ?? "todo"),
    points: Number(row.points ?? 0),
    notes: String(row.notes ?? ""),
  };
}

function toAttendance(row) {
  return {
    id: String(row.id),
    staff: String(row.staff ?? ""),
    date: String(row.date ?? ""),
    checkIn: String(row.check_in ?? row.checkIn ?? ""),
    checkOut: String(row.check_out ?? row.checkOut ?? ""),
    status: String(row.status ?? "Hadir"),
  };
}

function toTaxWork(row) {
  return {
    id: String(row.id),
    category: String(row.category ?? "SPT Masa"),
    service: String(row.service ?? ""),
    client: String(row.client ?? ""),
    pic: String(row.pic ?? ""),
    deadline: String(row.deadline ?? ""),
    status: String(row.status ?? "Draft"),
    attachment: String(row.attachment ?? ""),
    notes: String(row.notes ?? ""),
  };
}

function buildAnalytics(clients, tasks, users) {
  const done = tasks.filter((task) => task.status === "done").length;
  const running = tasks.filter((task) => task.status !== "done").length;
  const points = users.reduce((total, user) => total + user.points, 0);

  // If no data (empty clients, tasks, or users), generate fake data
  if (clients.length === 0 || tasks.length === 0 || users.length === 0) {
    return [
      { month: "Jan", clients: 5, done: 5, running: 3, points: 1000 },
      { month: "Feb", clients: 8, done: 8, running: 2, points: 1500 },
      { month: "Mar", clients: 10, done: 6, running: 4, points: 1200 },
      { month: "Apr", clients: 12, done: 10, running: 1, points: 1800 },
      { month: "Mei", clients: 15, done: 7, running: 5, points: 1400 },
      { month: "Jun", clients: 18, done: 9, running: 2, points: 1600 },
    ];
  }

  // Generate data for last 6 months
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: date.toLocaleString("id-ID", { month: "short" }),
      clients: clients.length,
      done: Math.max(0, Math.floor(done * (i / 5))),
      running: Math.max(0, Math.floor(running * (i / 5))),
      points: Math.max(0, Math.floor(points * (i / 5))),
    });
  }

  return months;
}

function initials(value) {
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
