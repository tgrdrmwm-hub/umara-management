import { getTaxServicePoint } from "../constants/taxServices";
import { supabase } from "./supabase";

export const emptyAppData = {
  analytics: [],
  attendance: [],
  clients: [],
  reportTypes: ["Pajak", "Staff", "Absensi", "Client", "Point", "Task"],
  tasks: [],
  internTasks: [],
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
      internTasks: [],
      taxWorks: [],
      attendance: [],
      analytics: [],
    };
  }

  const [usersResult, clientsResult, tasksResult, attendanceResult, taxResult, internTasksResult] =
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
      supabase.from("intern_tasks").select("*").order("date", { ascending: false }),
    ]);

  const firstError = [
    usersResult,
    clientsResult,
    tasksResult,
    attendanceResult,
    taxResult,
    internTasksResult,
  ].find((result) => result.error)?.error;

  // If error or all data is empty, return empty arrays (fallback to dummy in useAppData)
  if (firstError) {
    console.error("Supabase error:", firstError);
    return {
      ...emptyAppData,
      users: [],
      clients: [],
      tasks: [],
      internTasks: [],
      taxWorks: [],
      attendance: [],
      analytics: [],
    };
  }

  const users = (usersResult.data ?? []).map(toUser);
  const tasks = (tasksResult.data ?? []).map(toTask);
  const internTasks = (internTasksResult.data ?? []).map(toInternTask);

  const taxWorks = (taxResult.data ?? []).map(toTaxWork);
  const attendance = (attendanceResult.data ?? []).map(toAttendance);

  return {
    analytics: buildAnalytics(clientsResult.data ?? [], tasks, users, taxWorks, attendance),
    attendance,
    clients: (clientsResult.data ?? []).map(toClient),
    reportTypes: emptyAppData.reportTypes,
    tasks,
    internTasks,
    taxWorks,
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

export async function createInternTask(values) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.from("intern_tasks").insert(toInternTaskRow(values));
  if (error) throw error;
}

export async function updateInternTask(id, values) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase
    .from("intern_tasks")
    .update({ ...toInternTaskRow(values), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteInternTask(id) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.from("intern_tasks").delete().eq("id", id);
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

function toInternTaskRow(values) {
  return {
    assigner: values.assigner,
    intern: values.intern,
    date: values.date,
    title: values.title,
    attachment: values.attachment,
    status: values.status,
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

function toInternTask(row) {
  return {
    id: String(row.id),
    assigner: String(row.assigner ?? ""),
    intern: String(row.intern ?? ""),
    date: String(row.date ?? ""),
    title: String(row.title ?? ""),
    attachment: String(row.attachment ?? ""),
    status: String(row.status ?? "todo"),
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

function buildAnalytics(clients, tasks, users, taxWorks, attendance) {
  // Generate data for last 6 months using actual creation dates if available, or just empty arrays mapped.
  // We don't have created_at on tasks/taxWorks objects after map (toTask, toTaxWork). 
  // Let's use `deadline` for grouping since it exists. 
  // If no deadline, fallback to current month.
  
  const months = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = targetMonth.toLocaleString("id-ID", { month: "short" });
    const yearMonthStr = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
    
    // Hitung pekerjaan yang memiliki deadline di bulan ini (atau selesai di bulan ini)
    const monthlyTasks = tasks.filter(t => t.deadline && t.deadline.startsWith(yearMonthStr));
    const monthlyTaxWorks = taxWorks.filter(t => t.deadline && t.deadline.startsWith(yearMonthStr));
    
    // We will aggregate done tasks and running tasks for that month
    const doneTasks = monthlyTasks.filter(t => t.status === "done").length;
    const runningTasks = monthlyTasks.filter(t => t.status !== "done").length;
    
    // Untuk klien dan points, kita ambil nilai akumulatif/global, karena kita belum menyimpan riwayat per bulan.
    months.push({
      month: monthStr,
      clients: clients.length, // kumulatif
      done: doneTasks + monthlyTaxWorks.filter(w => w.status === "Selesai").length, // total task + tax selesai
      running: runningTasks + monthlyTaxWorks.filter(w => w.status !== "Selesai").length,
      points: users.reduce((sum, u) => sum + (u.points || 0), 0), // kumulatif saat ini
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
