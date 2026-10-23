"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useThemeColors } from "@/hooks/use-theme";
import { fmtMoney, fmtNumber } from "@/lib/utils";

const FALLBACK = ["#8b93ff", "#34d399", "#22d3ee", "#fbbf24", "#f472b6", "#a78bfa"];

export function Donut({
  data,
  money = false,
  height = 200,
  innerRadius = "62%",
}: {
  data: Array<{ name: string; value: number; color?: string }>;
  money?: boolean;
  height?: number;
  innerRadius?: string;
}) {
  const c = useThemeColors();
  const fmt = (v: number) => (money ? fmtMoney(v, { compact: true }) : fmtNumber(v, true));
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius="86%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={d.color ?? FALLBACK[i % FALLBACK.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: c.panel2, border: `1px solid ${c.line}`, borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: c.mut }}
            formatter={(value: number, name: string) => [fmt(value), name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-data text-xl font-bold">{fmt(total)}</span>
        <span className="text-[10px] uppercase tracking-widest text-mut">total</span>
      </div>
    </div>
  );
}