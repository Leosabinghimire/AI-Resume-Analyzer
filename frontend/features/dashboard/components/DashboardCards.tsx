"use client";

import { Anchor, Badge, Button, Group, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconBriefcase,
  IconChartLine,
  IconCircleCheck,
  IconFileText,
  IconHistory,
  IconTargetArrow,
  IconVersions,
} from "@tabler/icons-react";
import Link from "next/link";
import { ScoreBadge } from "@/components/domain/ScoreRing";
import { VersionSourceBadge } from "@/components/domain/VersionSourceBadge";
import { EmptyState, SectionCard, StatCard } from "@/components/ui";
import { AnalysisStatusBadges } from "@/features/analyses/components/AnalysisStatusBadges";
import { formatDate, formatRelative } from "@/lib/format";
import type { DashboardSummary } from "@/types/api";
import { ScoreTrendChart, SkillGapChart } from "../charts";

type Counts = DashboardSummary["counts"];

export function DashboardStats({ counts }: { counts: Counts }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
      <StatCard label="Resumes" value={counts.resumes} hint={`${counts.resume_versions} versions`} icon={<IconFileText size={22} />} href="/resumes" />
      <StatCard label="Saved jobs" value={counts.jobs} icon={<IconBriefcase size={22} />} color="cyan" href="/jobs" />
      <StatCard label="Analyses" value={counts.analyses} icon={<IconHistory size={22} />} color="violet" href="/analyses" />
      <StatCard
        label="Average score"
        value={counts.average_score ?? "—"}
        hint={counts.average_score === null ? "Run an analysis to see it" : "Across all analyses"}
        icon={<IconChartLine size={22} />}
        color="teal"
        href="/analyses"
      />
    </SimpleGrid>
  );
}

export function OnboardingCard({ counts }: { counts: Counts }) {
  const steps = [
    { done: counts.resumes > 0, label: "Upload a resume", text: "PDF or DOCX, parsed on the server.", href: "/resumes/upload" },
    { done: counts.jobs > 0, label: "Save a job description", text: "Requirements are extracted automatically.", href: "/jobs/new" },
    { done: counts.analyses > 0, label: "Run your first match", text: "See the score breakdown and skill gaps.", href: "/analyses/new" },
  ];
  return (
    <SectionCard title="Get started" description="Three steps to your first transparent match analysis.">
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {steps.map((s, i) => (
          <Group key={s.label} align="flex-start" wrap="nowrap" gap="sm">
            <ThemeIcon size={32} radius="xl" variant={s.done ? "filled" : "light"} color={s.done ? "teal" : "brand"}>
              {s.done ? <IconCircleCheck size={18} /> : <Text fw={700} size="sm">{i + 1}</Text>}
            </ThemeIcon>
            <Stack gap={4}>
              <Text fw={600} size="sm" td={s.done ? "line-through" : undefined} c={s.done ? "dimmed" : undefined}>
                {s.label}
              </Text>
              <Text size="xs" c="dimmed">
                {s.text}
              </Text>
              {!s.done && (
                <Button component={Link} href={s.href} size="compact-sm" variant="light" w="fit-content" mt={4}>
                  Start
                </Button>
              )}
            </Stack>
          </Group>
        ))}
      </SimpleGrid>
    </SectionCard>
  );
}

export function InsightCharts({ summary }: { summary: DashboardSummary }) {
  const trend = summary.score_trend;
  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
      <SectionCard
        title="Match score trend"
        description={
          trend.length === 1
            ? "Your first analysis. The trend fills in as you run more."
            : `Your last ${trend.length} analyses, oldest to newest. Click a point to open it.`
        }
      >
        <ScoreTrendChart points={trend} />
      </SectionCard>
      <SectionCard title="Recurring skill gaps" description="Required skills missing from your resume, counted once per job.">
        {summary.skill_gaps.length ? (
          <SkillGapChart gaps={summary.skill_gaps} />
        ) : (
          <Text size="sm" c="dimmed">
            No missing required skills in your latest analyses.
          </Text>
        )}
      </SectionCard>
    </SimpleGrid>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Anchor component={Link} href={href} size="sm" fw={500}>
      View all
    </Anchor>
  );
}

export function RecentAnalysesCard({ analyses }: { analyses: DashboardSummary["recent_analyses"] }) {
  return (
    <SectionCard title="Recent analyses" actions={<ViewAll href="/analyses" />}>
      {analyses.length === 0 ? (
        <EmptyState
          compact
          icon={<IconTargetArrow size={24} />}
          title="No analyses yet"
          description="Compare a resume with a saved job to see your match breakdown."
          action={<Button component={Link} href="/analyses/new" size="xs">Run an analysis</Button>}
        />
      ) : (
        <Stack gap={4}>
          {analyses.map((a) => (
            <Group key={a.id} justify="space-between" wrap="nowrap" py={8} style={{ borderBottom: "1px solid var(--app-border)" }}>
              <div style={{ minWidth: 0 }}>
                <Anchor component={Link} href={`/analyses/${a.id}`} size="sm" fw={600} display="block" truncate>
                  {a.job.title}
                </Anchor>
                <Group gap={6} wrap="nowrap">
                  <Text size="xs" c="dimmed" truncate>
                    {a.resume.resume_title} · v{a.resume.version_number} · {formatRelative(a.created_at)}
                  </Text>
                  <AnalysisStatusBadges analysis={a} />
                </Group>
              </div>
              <ScoreBadge score={a.overall_score} />
            </Group>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

export function RecentVersionsCard({ versions }: { versions: DashboardSummary["recent_versions"] }) {
  return (
    <SectionCard title="Recent resume versions" actions={<ViewAll href="/resumes" />}>
      {versions.length === 0 ? (
        <EmptyState
          compact
          icon={<IconVersions size={24} />}
          title="No resumes yet"
          description="Upload a PDF or DOCX resume to get started."
          action={<Button component={Link} href="/resumes/upload" size="xs">Upload resume</Button>}
        />
      ) : (
        <Stack gap={4}>
          {versions.map((v) => (
            <Group key={v.id} justify="space-between" wrap="nowrap" py={8} style={{ borderBottom: "1px solid var(--app-border)" }}>
              <div style={{ minWidth: 0 }}>
                <Anchor component={Link} href={`/resumes/${v.resume_id}?version=${v.id}`} size="sm" fw={600} display="block" truncate>
                  {v.resume_title}
                  <Badge variant="default" size="xs" ml={8}>
                    v{v.version_number}
                  </Badge>
                </Anchor>
                <Text size="xs" c="dimmed" truncate>
                  {v.label} · updated {formatDate(v.updated_at)}
                </Text>
              </div>
              <VersionSourceBadge source={v.source} />
            </Group>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
