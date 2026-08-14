"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils-financial";

interface DataPoint {
  year: number;
  [key: string]: any;
}

interface Series {
  key: string;
  label: string;
  color: string;
}

interface FinancialTrendChartProps {
  data: DataPoint[];
  series: Series[];
  title?: string;
  unit?: string;
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass border border-border rounded-xl p-3 shadow-xl text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {entry.value !== null && entry.value !== undefined
              ? unit === "percent"
                ? `${Number(entry.value).toFixed(2)}%`
                : unit === "ratio"
                  ? `${Number(entry.value).toFixed(2)}x`
                  : formatCurrency(entry.value)
              : "—"}
          </span>
        </div>
      ))}
    </div>
  );
};

export function FinancialTrendChart({
  data,
  series,
  title,
  unit = "currency",
}: FinancialTrendChartProps) {
  const formatYAxis = (value: number) => {
    if (unit === "percent") return `${value}%`;
    if (unit === "ratio") return `${value}x`;
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}T`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}M`;
    return value.toLocaleString("id-ID");
  };

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Belum ada data untuk ditampilkan
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <p className="text-sm font-semibold text-foreground mb-4">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <defs>
            {series.map((s) => (
              <linearGradient
                key={s.key}
                id={`gradient-${s.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(0.22 0.03 264 / 0.5)"
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tick={{ fill: "oklch(0.60 0.05 264)", fontSize: 12 }}
            axisLine={{ stroke: "oklch(0.22 0.03 264)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fill: "oklch(0.60 0.05 264)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={65}
          />
          <Tooltip
            content={<CustomTooltip unit={unit} />}
            cursor={{ stroke: "oklch(0.55 0.22 264 / 0.3)", strokeWidth: 1 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(value) => (
              <span style={{ color: "oklch(0.80 0.03 264)" }}>{value}</span>
            )}
          />
          {unit === "percent" && (
            <ReferenceLine
              y={0}
              stroke="oklch(0.62 0.22 25 / 0.5)"
              strokeDasharray="3 3"
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              dot={{ r: 4, fill: s.color, strokeWidth: 2, stroke: "var(--background)" }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
