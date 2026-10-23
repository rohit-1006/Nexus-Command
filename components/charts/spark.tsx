"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useThemeColors } from "@/hooks/use-theme";

export function Sparkline({
  data,
  color,
  height = 40,
}: {
  data: Array<{ v: number }>;
  color?: string;
  height?: number;
}) {
  const c = useThemeColors();
  const fill = color ?? c.chart1;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={0.35} />
            <stop offset="100%" stopColor={fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={fill}
          strokeWidth={1.5}
          fill="url(#spark-grad)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}