import * as React from "react";

export function PageHeader({
  title,
  desc,
  children,
  badge,
}: {
  title: string;
  desc?: string;
  children?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
          {badge}
        </div>
        {desc ? <p className="mt-1 max-w-2xl text-xs leading-relaxed text-mut">{desc}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}