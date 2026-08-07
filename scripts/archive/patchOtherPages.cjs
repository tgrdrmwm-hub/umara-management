const fs = require('fs');

const pages = [
  '/home/idk/Documents/Project Umaratax/management-umara/src/pages/AttendancePage.jsx',
  '/home/idk/Documents/Project Umaratax/management-umara/src/pages/PointsPage.jsx',
  '/home/idk/Documents/Project Umaratax/management-umara/src/pages/StaffPage.jsx'
];

for (const path of pages) {
  let content = fs.readFileSync(path, 'utf8');

  // Replace import
  content = content.replace(
    /import \{\s*PALETTE,\s*tooltipStyle,\s*axisTick,\s*gridStyle,\s*animationProps\s*\} from "\.\.\/components\/ui\/ChartWrapper";/g,
    'import { PALETTE, CustomTooltip, axisTick, gridStyle, animationProps } from "../components/ui/ChartWrapper";'
  );
  
  // Replace missing animationProps if there's lineAnimationProps
  content = content.replace(
    /import \{\s*PALETTE,\s*tooltipStyle,\s*axisTick,\s*gridStyle,\s*animationProps,\s*lineAnimationProps\s*\} from "\.\.\/components\/ui\/ChartWrapper";/g,
    'import { PALETTE, CustomTooltip, axisTick, gridStyle, animationProps, lineAnimationProps } from "../components/ui/ChartWrapper";'
  );

  // Replace <Tooltip {...tooltipStyle} />
  content = content.replace(
    /<Tooltip \{\.\.\.tooltipStyle\} \/>/g,
    '<Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--tw-colors-slate-500)", opacity: 0.05, rx: 4 }} />'
  );

  fs.writeFileSync(path, content, 'utf8');
}
console.log('Other pages patched successfully!');
