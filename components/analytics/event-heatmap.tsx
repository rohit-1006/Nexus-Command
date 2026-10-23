"use client";

export function EventHeatmap({
  rows,
  maxRate,
}: {
  rows: Array<{ day: number; label: string; cells: Array<{ hour: number; rate: number; volume: number }> }>;
  maxRate: number;
}) {
  const color = (rate: number) => {
    const t = Math.min(1, rate / maxRate);
    const r = Math.round(139 + (52 - 139) * t);
    const g = Math.round(147 + (211 - 147) * t);
    const b = Math.round(255 + (163 - 255) * t);
    return `rgba(${r},${g},${b},${0.15 + t * 0.85})`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1.5">
        <div className="flex flex-col justify-between py-0.5 text-right">
          {rows.map((r) => (
            <span key={r.day} className="text-[9px] text-mut2">{r.label}</span>
          ))}
        </div>
        <div className="grid grid-flow-col gap-1">
          {Array.from({ length: 24 }).map((_, hour) => (
            <div key={hour} className="flex flex-col gap-1">
              <span className="text-center text-[8px] text-mut2">{hour}:00</span>
              {rows.map((r) => {
                const cell = r.cells.find((c) => c.hour === hour);
                return (
                  <span
                    key={`${r.day}-${hour}`}
                    className="h-5 w-5 rounded"
                    style={{ background: color(cell?.rate ?? 0) }}
                    title={`${r.label} ${hour}:00 — ${cell?.rate ?? 0}% engagement · ${cell?.volume ?? 0} impressions`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}