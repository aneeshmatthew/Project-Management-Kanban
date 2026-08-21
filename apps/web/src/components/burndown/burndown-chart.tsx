"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

export function BurndownChart({ series }: { series: BurndownPoint[] }) {
  return (
    <div className="h-72 w-full rounded-lg border border-border bg-panel p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#232A35" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            stroke="#7C8797"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickFormatter={(d: string) => d.slice(5)} // MM-DD
          />
          <YAxis
            stroke="#7C8797"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "#12161F",
              border: "1px solid #232A35",
              borderRadius: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            labelStyle={{ color: "#E6E9EF" }}
          />
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#7C8797"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
            name="Ideal"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#E8A33D"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "#E8A33D" }}
            name="Actual"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
