import { cn } from "../../utils/cn";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/8 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/8",
        className,
      )}
      {...props}
    />
  );
}
