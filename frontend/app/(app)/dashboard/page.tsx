"use client";

import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBriefcase,
  IconChartLine,
  IconFileText,
  IconHistory,
  IconSparkles,
  IconTargetArrow,
  IconUpload,
  IconVersions,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { ScoreBadgeText } from "@/components/score/ScoreRing";
import { useDashboard } from "@/features/analyses/api";
import { AnalysisStatusBadges } from "@/features/analyses/components/AnalysisStatusBadges";
import { useMe } from "@/features/auth/api";
import { ScoreTrendChart, SkillGapChart } from "@/features/dashboard/charts";
import { formatDate, formatRelative, VERSION_SOURCE_LABELS } from "@/lib/format";
import type { DashboardSummary } from "@/types/api";

function StatCard({ label, value, icon, href }: { label: string; value: string | number; icon: ReactNode; href: string }) {
  return (
    <UnstyledButton component={Link} href={href} aria-label={`${label}: ${value}`}>
      <Card padding="md" h="100%">
        <Group justify="space-between" wrap="nowrap">
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {label}
            </Text>
            <Text fz={28} fw={700} lh={1.2}>
              {value}
            </Text>
          </div>
          <ThemeIcon variant="light" size={42} radius="md">
            {icon}
          </ThemeIcon>
        </Group>
      </Card>
    </UnstyledButton>
  );
}

function Onboarding({ counts }: { counts: DashboardSummary["counts"] }) {
  const steps = [
    { done: counts.resumes > 0, label: "Upload a resume", href: "/resumes/upload" },
    { done: counts.jobs > 0, label: "Save a job description", href: "/jobs/new" },
    { done: counts.analyses > 0, label: "Run your first match analysis", href: "/analyses/new" },
  ];
  return (
    <Card>
      <Title order={4} mb="xs">
        Get started
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Three steps to your first transparent match analysis.
      </Text>
      <Stack gap="xs">
        {steps.map((s, i) => (
          <Group key={s.label} justify="space-between">
            <Group gap="sm">
              <Badge circle size="lg" color={s.done ? "teal" : "gray"} variant={s.done ? "filled" : "light"}>
                {i + 1}
              </Badge>
              <Text size="sm" td={s.done ? "line-through" : undefined} c={s.done ? "dimmed" : undefined}>
                {s.label}
              </Text>
            </Group>
            {!s.done && (
              <Button component={Link} href={s.href} size="xs" variant="light">
                Start
              </Button>
            )}
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

function WelcomeBanner() {
  const welcome = useSearchParams().get("welcome") === "1";
  if (!welcome) return null;
  return (
    <Alert color="brand" variant="light" icon={<IconSparkles size={18} />} mb="lg" title="Your account is ready">
      Start by uploading a resume. Parsing happens on the server; nothing is sent to an AI provider unless you enable it
      in Settings.
    </Alert>
  );
}

export default function DashboardPage() {
  const me = useMe();
  const dashboard = useDashboard();
  const firstName = me.data?.full_name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="Your resumes, saved jobs and match results at a glance. All figures come from your saved data."
        actions={
          <>
            <Button component={Link} href="/resumes/upload" variant="default" leftSection={<IconUpload size={16} />}>
              Upload resume
            </Button>
            <Button component={Link} href="/analyses/new" leftSection={<IconTargetArrow size={16} />}>
              Analyze a job
            </Button>
          </>
        }
      />
      <Suspense>
        <WelcomeBanner />
      </Suspense>

      {dashboard.isPending && <LoadingBlock rows={3} height={110} />}
      {dashboard.error && <ErrorBlock error={dashboard.error} onRetry={() => dashboard.refetch()} />}
      {dashboard.data && (
        <Stack gap="lg">
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
            <StatCard label="Resumes" value={dashboard.data.counts.resumes} icon={<IconFileText size={22} />} href="/resumes" />
            <StatCard label="Saved jobs" value={dashboard.data.counts.jobs} icon={<IconBriefcase size={22} />} href="/jobs" />
            <StatCard label="Analyses" value={dashboard.data.counts.analyses} icon={<IconHistory size={22} />} href="/analyses" />
            <StatCard
              label="Average score"
              value={dashboard.data.counts.average_score ?? "—"}
              icon={<IconChartLine size={22} />}
              href="/analyses"
            />
          </SimpleGrid>

          {dashboard.data.counts.analyses === 0 ? (
            <Onboarding counts={dashboard.data.counts} />
          ) : (
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              <Card>
                <Title order={4}>Match score trend</Title>
                <Text size="xs" c="dimmed" mb="sm">
                  {dashboard.data.score_trend.length === 1
                    ? "Your first analysis. The trend fills in as you run more."
                    : `Your last ${dashboard.data.score_trend.length} analyses, oldest to newest. Click a point to open it.`}
                </Text>
                <ScoreTrendChart points={dashboard.data.score_trend} />
              </Card>
              <Card>
                <Title order={4}>Recurring skill gaps</Title>
                <Text size="xs" c="dimmed" mb="sm">
                  Required skills missing from your resume, counted once per job (latest analysis).
                </Text>
                {dashboard.data.skill_gaps.length ? (
                  <SkillGapChart gaps={dashboard.data.skill_gaps} />
                ) : (
                  <Text size="sm" c="dimmed">
                    No missing required skills in your latest analyses.
                  </Text>
                )}
              </Card>
            </SimpleGrid>
          )}

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Card>
              <Group justify="space-between" mb="sm">
                <Title order={4}>Recent analyses</Title>
                <Anchor component={Link} href="/analyses" size="sm">
                  View all
                </Anchor>
              </Group>
              {dashboard.data.recent_analyses.length === 0 ? (
                <EmptyState
                  icon={<IconTargetArrow size={26} />}
                  title="No analyses yet"
                  description="Compare a resume with a saved job to see your match breakdown."
                  action={
                    <Button component={Link} href="/analyses/new" size="xs">
                      Run an analysis
                    </Button>
                  }
                />
              ) : (
                <Table.ScrollContainer minWidth={420}>
                  <Table verticalSpacing="xs" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Job</Table.Th>
                        <Table.Th>Resume</Table.Th>
                        <Table.Th ta="right">Score</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {dashboard.data.recent_analyses.map((a) => (
                        <Table.Tr key={a.id}>
                          <Table.Td>
                            <Anchor component={Link} href={`/analyses/${a.id}`} size="sm" fw={500}>
                              {a.job.title}
                            </Anchor>
                            <Group gap={6}>
                              <Text size="xs" c="dimmed">
                                {formatRelative(a.created_at)}
                              </Text>
                              <AnalysisStatusBadges analysis={a} />
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{a.resume.resume_title}</Text>
                            <Text size="xs" c="dimmed">
                              v{a.resume.version_number} · {a.resume.version_label}
                            </Text>
                          </Table.Td>
                          <Table.Td ta="right">
                            <ScoreBadgeText score={a.overall_score} />
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Card>
            <Card>
              <Group justify="space-between" mb="sm">
                <Title order={4}>Recent resume versions</Title>
                <Anchor component={Link} href="/resumes" size="sm">
                  View all
                </Anchor>
              </Group>
              {dashboard.data.recent_versions.length === 0 ? (
                <EmptyState
                  icon={<IconVersions size={26} />}
                  title="No resumes yet"
                  description="Upload a PDF or DOCX resume to get started."
                  action={
                    <Button component={Link} href="/resumes/upload" size="xs">
                      Upload resume
                    </Button>
                  }
                />
              ) : (
                <Stack gap="xs">
                  {dashboard.data.recent_versions.map((v) => (
                    <Group key={v.id} justify="space-between" wrap="nowrap">
                      <div style={{ minWidth: 0 }}>
                        <Anchor component={Link} href={`/resumes/${v.resume_id}?version=${v.id}`} size="sm" fw={500} truncate>
                          {v.resume_title} · v{v.version_number}
                        </Anchor>
                        <Text size="xs" c="dimmed" truncate>
                          {v.label} · updated {formatDate(v.updated_at)}
                        </Text>
                      </div>
                      <Badge variant="light" color={v.source === "ai_assisted" ? "violet" : "gray"} tt="none">
                        {VERSION_SOURCE_LABELS[v.source]}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              )}
            </Card>
          </SimpleGrid>
        </Stack>
      )}
    </>
  );
}
