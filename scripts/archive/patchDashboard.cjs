const fs = require('fs');
const path = '/home/idk/Documents/Project Umaratax/management-umara/src/pages/DashboardPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove active/completed TaxWorks and change picCount
content = content.replace(
  `  const activeTaxWorks = data.taxWorks.filter((w) => w.status !== "Selesai");
  const completedTaxWorks = data.taxWorks.filter((w) => w.status === "Selesai");
  const picCount = new Set(data.taxWorks.map((w) => w.pic).filter(Boolean))
    .size;`,
  `  const picCount = new Set(data.tasks.map((w) => w.pic).filter(Boolean)).size;`
);

// 2. Modify stats array
content = content.replace(
  `    { label: "Total Client", value: data.clients.length, icon: Users },
    { label: "PIC Aktif", value: picCount, icon: Users },
    {
      label: "Layanan Pajak",
      value: taxServiceDefinitions.reduce((s, g) => s + g.services.length, 0),
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
      value: data.tasks.filter((t) => t.status === "done").length,
      icon: CheckCircle2,
    },
    { label: "Kehadiran", value: \`\${averageAttendance}%\`, icon: BellRing },
    {
      label: "Total Point",
      value: data.users.reduce((s, u) => s + u.points, 0),
      icon: Medal,
    },`,
  `    { label: "Total Client", value: data.clients.length, icon: Users },
    { label: "PIC Aktif", value: picCount, icon: Users },
    {
      label: "Layanan Pajak",
      value: taxServiceDefinitions.reduce((s, g) => s + g.services.length, 0),
      icon: ShieldCheck,
    },
    { 
      label: "Task Berjalan", 
      value: data.tasks.filter((t) => t.status !== "done").length, 
      icon: Clock3 
    },
    {
      label: "Task Selesai",
      value: data.tasks.filter((t) => t.status === "done").length,
      icon: CheckCircle2,
    },
    { label: "Kehadiran", value: \`\${averageAttendance}%\`, icon: BellRing },
    {
      label: "Total Point",
      value: data.users.reduce((s, u) => s + u.points, 0),
      icon: Medal,
    },`
);

// 3. Update PieData
content = content.replace(
  `  const pieData = [
    { name: "Selesai", value: completedTaxWorks.length },
    {
      name: "Berjalan",
      value: data.taxWorks.filter((w) => w.status === "Berjalan").length,
    },
    {
      name: "Review",
      value: data.taxWorks.filter((w) => w.status === "Review").length,
    },
    {
      name: "Draft",
      value: data.taxWorks.filter((w) => w.status === "Draft").length,
    },
  ].filter((d) => d.value > 0);`,
  `  const pieData = [
    { name: "Selesai (Done)", value: data.tasks.filter((w) => w.status === "done").length },
    {
      name: "Dikerjakan (In Progress)",
      value: data.tasks.filter((w) => w.status === "in_progress").length,
    },
    {
      name: "Menunggu (To Do)",
      value: data.tasks.filter((w) => w.status === "todo").length,
    }
  ].filter((d) => d.value > 0);`
);

// 4. Update texts in UI
content = content.replace('title="Pekerjaan Selesai per Bulan"', 'title="Task Selesai per Bulan"');
content = content.replace('subtitle="Tren penyelesaian pekerjaan pajak"', 'subtitle="Tren penyelesaian task"');
content = content.replace('title="Status Pekerjaan Pajak"', 'title="Status Task Pekerjaan"');
content = content.replace('{ item: "Pajak", score: data.taxWorks.length }', '{ item: "Task", score: data.tasks.length }');

fs.writeFileSync(path, content, 'utf8');
console.log('DashboardPage.jsx successfully refactored to remove TaxWorks!');
