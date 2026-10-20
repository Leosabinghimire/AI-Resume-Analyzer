"use client";

import { Alert, Anchor, Badge, Group, Progress, Stack, Text } from "@mantine/core";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ScoreRing } from "@/components/domain/ScoreRing";
import { DataTable, LoadingBlock, PageHeader, QueryBoundary, SectionCard, type Column } from "@/components/ui";
import { useAnalysisComparison } from "@/features/analyses/api";
import { MAX_COMPARE } from "@/lib/constants";
import { scoreBand } from "@/lib/format";
import type { Analysis, ComponentKey } from "@/types/api";

interface MetricRow {
  key: string;
  label: string;
  render: (a: Analysis) => ReactNode;
}

function componentRow(key: ComponentKey, label: string): MetricRow {
  return {
    key,
    label,
    render: (a) => {
      const c = a.match_result.components.find((x) => x.key === key);
      if (!c?.applicable) return <Text size="sm" c="dimmed">n/a</Text>;
      const score = c.score ?? 0;
      return (
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            {Math.round(score)}
          </Text>
          <Progress value={score} color={scoreBand(score).color} size="sm" aria-label={label} />
        </Stack>
      );
    },
  };
}

function skillBadges(skills: string[], color: string) {
  if (skills.length === 0) return <Text size="sm" c="dimmed">None</Text>;
  return (
    <Group gap={4}>
      {skills.map((s) => (
        <Badge key={s} color={color} variant="outline" size="sm">
          {s}
        </Badge>
      ))}
    </Group>
  );
}

function describe(items: Analysis[]) {
  const sameResume = new Set(items.map((a) => a.resume.version_id)).size === 1;
  const sameJob = new Set(items.map((a) => a.job.id)).size === 1;
  if (sameResume) return { text: "One resume version compared across different jobs.", sameJob };
  if (sameJob) return { text: "Different resume versions compared against the same job.", sameJob };
  return { text: "Mixed comparison of different resumes and jobs.", sameJob };
}

function CompareTable({ items }: { items: Analysis[] }) {
  const { text, sameJob } = describe(items);
  const rows: MetricRow[] = [
    { key: "overall", label: "Overall score", render: (a) => <ScoreRing score={a.overall_score} size={84} showLabel={false} /> },
    ...items[0]!.match_result.components.map((c) => componentRow(c.key, c.label)),
    { key: "missing-required", label: "Missing required skills", render: (a) => skillBadges(a.match_result.missing_required_skills, "red") },
    { key: "missing-preferred", label: "Missing preferred skills", render: (a) => skillBadges(a.match_result.missing_preferred_skills, "orange") },
  ];
  const columns: Column<MetricRow>[] = [
    { key: "metric", header: "", width: 220, render: (r) => <Text size="sm" fw={600}>{r.label}</Text> },
    ...items.map((a) => ({
      key: a.id,
      header: (
        <div>
          <Anchor component={Link} href={`/analyses/${a.id}`} size="sm" fw={700} tt="none" style={{ letterSpacing: 0 }}>
            {sameJob ? `${a.resume.resume_title} · v${a.resume.version_number}` : a.job.title}
          </Anchor>
          <Text size="xs" c="dimmed" tt="none" fw={400} style={{ letterSpacing: 0 }}>
            {sameJob ? a.resume.version_label : (a.job.company ?? "")}
          </Text>
        </div>
      ),
      render: (r: MetricRow) => r.render(a),
    })),
  ];

  return (
    <SectionCard title="Side-by-side comparison" description={text} flush>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.key} minWidth={240 + items.length * 210} />
    </SectionCard>
  );
}

function CompareContent() {
  const ids = (useSearchParams().get("ids") ?? "").split(",").filter(Boolean).slice(0, MAX_COMPARE);
  const comparison = useAnalysisComparison(ids);
  if (ids.length < 2) {
    return (
      <Alert color="blue">
        Select two to four analyses in your{" "}
        <Anchor component={Link} href="/analyses">
          analysis history
        </Anchor>{" "}
        to compare them.
      </Alert>
    );
  }
  return (
    <QueryBoundary query={comparison} loading={<LoadingBlock rows={3} height={90} />}>
      {(items) => <CompareTable items={items} />}
    </QueryBoundary>
  );
}

export default function ComparePage() {
  return (
    <>
      <PageHeader title="Compare analyses" breadcrumbs={[{ label: "Analysis history", href: "/analyses" }, { label: "Compare" }]} />
      <Suspense fallback={<LoadingBlock rows={3} />}>
        <CompareContent />
      </Suspense>
    </>
  );
}
