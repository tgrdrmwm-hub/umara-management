import { cn } from "../../utils/cn";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-white/8 dark:bg-slate-900",
        className,
      )}
      {...props}
    />
  );
}
