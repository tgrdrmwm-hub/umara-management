/**
 * Shared chart configuration for consistent, animated, professional styling.
 * Used across all pages — konsultan pajak management system.
 */

export const PALETTE = [
  "#4f46e5", // indigo-600 (stronger)
  "#2563eb", // blue-600 (stronger)
  "#059669", // emerald-600 (stronger)
  "#d97706", // amber-600 (stronger)
  "#db2777", // pink-600 (stronger)
  "#7c3aed", // violet-600 (stronger)
  "#0d9488", // teal-600 (stronger)
  "#dc2626", // rose-600/red-600 (stronger)
];

export const PALETTE_SOFT = [
  "#818cf8",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#2dd4bf",
  "#fb7185",
];

/** Tooltip — clean white card */
export const tooltipStyle = {
  contentStyle: {
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 24px -4px rgba(15,23,42,0.12), 0 2px 8px -2px rgba(15,23,42,0.08)",
    fontSize: "12px",
    padding: "10px 14px",
    background: "#ffffff",
    color: "#0f172a",
  },
  labelStyle: {
    fontWeight: 700,
    marginBottom: 6,
    color: "#0f172a",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  itemStyle: { color: "#475569", fontSize: "12px" },
  cursor: { fill: "rgba(99,102,241,0.05)", rx: 4 },
};

/** Axis tick */
export const axisTick = { fontSize: 11, fill: "#94a3b8", fontWeight: 500 };

/** Grid */
export const gridStyle = { stroke: "#f1f5f9", strokeDasharray: "4 4" };

/** Animation props — applied to Bar, Line, Area, etc. */
export const animationProps = {
  isAnimationActive: true,
  animationBegin: 0,
  animationDuration: 900,
  animationEasing: "ease-out",
};

/** Animation for Line/Area — slightly slower for smooth reveal */
export const lineAnimationProps = {
  isAnimationActive: true,
  animationBegin: 100,
  animationDuration: 1200,
  animationEasing: "ease-out",
};
