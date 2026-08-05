import { cva } from "class-variance-authority";
import { cn } from "../../utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800/25 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-slate-900 text-white hover:bg-slate-700 shadow-sm dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
        secondary:
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100",
        danger:
          "bg-red-600 text-white hover:bg-red-700 shadow-sm dark:bg-red-600 dark:hover:bg-red-500",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md gap-1",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "h-9 w-9 px-0",
        "icon-sm": "h-8 w-8 px-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export function Button({ className, variant, size, ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
