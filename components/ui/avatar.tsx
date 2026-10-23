import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-6 w-6 text-[9px]",
    md: "h-8 w-8 text-[11px]",
    lg: "h-10 w-10 text-xs",
    xl: "h-14 w-14 text-base",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase tracking-wide",
        sizes[size],
        className,
      )}
      style={{
        background: `${color ?? "#3b82f6"}22`,
        color: color ?? "#3b82f6",
        border: `1px solid ${color ?? "#3b82f6"}44`,
      }}
    >
      {initials(name)}
    </span>
  );
}