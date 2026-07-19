"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface RatioBarChartProps {
  data: Array<{ year: number; value: number | null }>;
  label: string;
  color?: string;
  unit?: "percent" | "ratio" | "times";
  positiveGood?: boolean;
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="glass border border-border rounded-xl p-3 shadow-xl text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-primary mt-1">
        {val !== null && val !== undefined
          ? unit === "percent"
            ? `${Number(val).toFixed(2)}%`
            : `${Number(val).toFixed(2)}x`
          : "—"}
      </p>
    </div>
  );
};

export function RatioBarChart({
  data,
  label,
  color = "oklch(0.55 0.22 264)",
  unit = "percent",
  positiveGood = true,
}: RatioBarChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Belum ada data
      </div>
    );
  }

  const formatYAxis = (v: number) =>
    unit === "percent" ? `${v.toFixed(0)}%` : `${v.toFixed(1)}x`;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(0.22 0.03 264 / 0.5)"
          vertical={false}
        />
        <XAxis
          dataKey="year"
          tick={{ fill: "oklch(0.60 0.05 264)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fill: "oklch(0.60 0.05 264)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={45}
        />
        <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ fill: "oklch(0.55 0.22 264 / 0.05)" }} />
        <ReferenceLine y={0} stroke="oklch(0.40 0.05 264)" />
        <Bar dataKey="value" name={label} radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => {
            const isPositive = (entry.value ?? 0) >= 0;
            const isGood = positiveGood ? isPositive : !isPositive;
            return (
              <Cell
                key={`cell-${index}`}
                fill={
                  isGood
                    ? "oklch(0.65 0.18 145)"
                    : "oklch(0.62 0.22 25)"
                }
                fillOpacity={0.85}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
