const fs = require('fs');

const pages = [
  '/home/idk/Documents/Project Umaratax/management-umara/src/pages/AttendancePage.jsx',
  '/home/idk/Documents/Project Umaratax/management-umara/src/pages/PointsPage.jsx',
  '/home/idk/Documents/Project Umaratax/management-umara/src/pages/StaffPage.jsx'
];

for (const path of pages) {
  let content = fs.readFileSync(path, 'utf8');

  // Replace import
  content = content.replace(/\btooltipStyle,\b/g, 'CustomTooltip,');

  // Replace usage
  content = content.replace(/\{\.\.\.tooltipStyle\}/g, 'content={<CustomTooltip />} cursor={{ fill: "var(--tw-colors-slate-500)", opacity: 0.05, rx: 4 }}');

  fs.writeFileSync(path, content, 'utf8');
}
console.log('Other pages patched successfully (Fix)!');
