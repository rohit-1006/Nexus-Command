"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useThemeColors } from "@/hooks/use-theme";
import { fmtMoney, fmtNumber } from "@/lib/utils";

export function TrendArea({
  data,
  series,
  height = 220,
  money = false,
  xKey = "label",
  showGrid = true,
}: {
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; color?: string; name: string }>;
  height?: number;
  money?: boolean;
  xKey?: string;
  showGrid?: boolean;
}) {
  const c = useThemeColors();
  const fmt = (v: number) => (money ? fmtMoney(v) : fmtNumber(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? c.chart1} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color ?? c.chart1} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {showGrid ? <CartesianGrid stroke={c.line} strokeDasharray="3 3" vertical={false} /> : null}
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} dy={6} />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={money ? 56 : 36}
          tickFormatter={(v: number) => (money ? fmtMoney(v, { compact: true }) : fmtNumber(v, true))}
        />
        <Tooltip
          contentStyle={{ background: c.panel2, border: `1px solid ${c.line}`, borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: c.mut }}
          formatter={(value: number, name: string) => [fmt(value), name]}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? c.chart1}
            strokeWidth={1.75}
            fill={`url(#grad-${s.key})`}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}