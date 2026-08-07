/**
 * Shared chart configuration for consistent, animated, professional styling.
 * Custom tooltips and responsive styling for light/dark mode.
 */

export const PALETTE = [
  "#6366f1", // indigo-500
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ec4899", // pink-500
  "#8b5cf6", // violet-500
  "#14b8a6", // teal-500
  "#f43f5e", // rose-500
];

export function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {entry.name}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export const axisTick = { fontSize: 11, fill: "currentColor", opacity: 0.4, fontWeight: 500 };

export const gridStyle = { stroke: "currentColor", strokeOpacity: 0.06, strokeDasharray: "4 4" };

export const animationProps = {
  isAnimationActive: true,
  animationBegin: 0,
  animationDuration: 1000,
  animationEasing: "ease-out",
};

export const lineAnimationProps = {
  isAnimationActive: true,
  animationBegin: 100,
  animationDuration: 1400,
  animationEasing: "ease-out",
};
