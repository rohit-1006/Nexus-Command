"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useThemeColors } from "@/hooks/use-theme";
import { fmtMoney, fmtNumber } from "@/lib/utils";

export function GroupedBars({
  data,
  series,
  height = 220,
  money = false,
  xKey = "label",
  stacked = false,
}: {
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; color?: string; name: string }>;
  height?: number;
  money?: boolean;
  xKey?: string;
  stacked?: boolean;
}) {
  const c = useThemeColors();
  const fmt = (v: number) => (money ? fmtMoney(v) : fmtNumber(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={c.line} strokeDasharray="3 3" vertical={false} />
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
          cursor={{ fill: c.glow ?? "rgba(255,255,255,0.04)" }}
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stackId={stacked ? "a" : undefined}
            fill={s.color ?? c.chart1}
            radius={[3, 3, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SingleBars({
  data,
  dataKey,
  color,
  money = false,
  xKey = "label",
  height = 200,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color?: string;
  money?: boolean;
  xKey?: string;
  height?: number;
}) {
  const c = useThemeColors();
  const fill = color ?? c.chart1;
  const fmt = (v: number) => (money ? fmtMoney(v) : fmtNumber(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={c.line} strokeDasharray="3 3" vertical={false} />
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
          formatter={(value: number) => [fmt(value), ""]}
          cursor={{ fill: c.glow ?? "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey={dataKey} fill={fill} radius={[3, 3, 0, 0]}>
          {data.map((d) => (
            <Cell key={String(d[xKey])} fill={fill} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}