const fs = require('fs');
const path = '/home/idk/Documents/Project Umaratax/management-umara/src/pages/DashboardPage.jsx';

let content = fs.readFileSync(path, 'utf8');

// Replace picCount definition
content = content.replace(
  'const picCount = new Set(data.tasks.map((w) => w.pic).filter(Boolean)).size;',
  'const staffCount = data.users.length;'
);

// Replace "PIC Aktif" label
content = content.replace(
  '{ label: "PIC Aktif", value: picCount, icon: Users },',
  '{ label: "Total Staff", value: staffCount, icon: Users },'
);

// Replace PIC in Radar Chart
content = content.replace(
  '{ item: "PIC", score: picCount },',
  '{ item: "Staff", score: staffCount },'
);

fs.writeFileSync(path, content, 'utf8');
console.log('PIC Aktif replaced with Total Staff');
