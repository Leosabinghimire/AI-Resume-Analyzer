"use client";

import { Paper, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatDate } from "@/lib/format";
import type { DashboardSummary } from "@/types/api";

const SERIES = "var(--mantine-primary-color-filled)";
const GRID = "var(--mantine-color-default-border)";

function ChartTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const point = payload?.[0]?.payload as { label?: string; detail?: string; value?: number } | undefined;
  if (!active || !point) return null;
  return (
    <Paper shadow="md" p="xs" withBorder>
      <Text size="sm" fw={600}>
        {point.value}
      </Text>
      <Text size="xs">{point.label}</Text>
      {point.detail && (
        <Text size="xs" c="dimmed">
          {point.detail}
        </Text>
      )}
    </Paper>
  );
}

export function ScoreTrendChart({ points }: { points: DashboardSummary["score_trend"] }) {
  const router = useRouter();
  const data = points.map((p, i) => ({
    index: i + 1,
    value: p.score,
    label: p.job_title,
    detail: formatDate(p.created_at),
    id: p.analysis_id,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: -16 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="index" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} />
        <Tooltip content={ChartTooltip} cursor={{ stroke: GRID }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={SERIES}
          strokeWidth={2}
          dot={{ r: 4, fill: SERIES, stroke: "var(--mantine-color-body)", strokeWidth: 2 }}
          activeDot={{
            r: 6,
            cursor: "pointer",
            onClick: (_event: unknown, dot: unknown) => {
              const id = (dot as { payload?: { id?: string } }).payload?.id;
              if (id) router.push(`/analyses/${id}`);
            },
          }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SkillGapChart({ gaps }: { gaps: DashboardSummary["skill_gaps"] }) {
  const data = gaps.map((g) => ({
    skill: g.skill,
    value: g.job_count,
    label: g.skill,
    detail: `Missing in ${g.job_count} saved job${g.job_count === 1 ? "" : "s"}`,
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={6}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="skill" width={130} tickLine={false} axisLine={false} />
        <Tooltip content={ChartTooltip} cursor={{ fill: "var(--mantine-color-default-hover)" }} />
        <Bar dataKey="value" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
