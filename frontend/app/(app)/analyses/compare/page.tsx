"use client";

import { Alert, Anchor, Badge, Card, Group, Progress, Stack, Table, Text, Title } from "@mantine/core";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { ScoreRing } from "@/components/score/ScoreRing";
import { useAnalysisComparison } from "@/features/analyses/api";
import { scoreBand } from "@/lib/format";
import type { Analysis } from "@/types/api";

function describeComparison(items: Analysis[]): string {
  const sameResume = new Set(items.map((a) => a.resume.version_id)).size === 1;
  const sameJob = new Set(items.map((a) => a.job.id)).size === 1;
  if (sameResume) return "One resume version compared across different jobs.";
  if (sameJob) return "Different resume versions compared against the same job.";
  return "Mixed comparison of different resumes and jobs.";
}

function columnTitle(a: Analysis, sameJob: boolean) {
  return sameJob ? `${a.resume.resume_title} · v${a.resume.version_number}` : a.job.title;
}

function CompareTable({ items }: { items: Analysis[] }) {
  const sameJob = new Set(items.map((a) => a.job.id)).size === 1;
  const keys = items[0]!.match_result.components.map((c) => ({ key: c.key, label: c.label }));
  return (
    <Card p={0}>
      <Table.ScrollContainer minWidth={240 + items.length * 200}>
        <Table verticalSpacing="sm" horizontalSpacing="md" withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={220} />
              {items.map((a) => (
                <Table.Th key={a.id}>
                  <Anchor component={Link} href={`/analyses/${a.id}`} size="sm" fw={600}>
                    {columnTitle(a, sameJob)}
                  </Anchor>
                  <Text size="xs" c="dimmed">
                    {sameJob ? a.resume.version_label : (a.job.company ?? "")}
                  </Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td fw={600}>Overall score</Table.Td>
              {items.map((a) => (
                <Table.Td key={a.id}>
                  <ScoreRing score={a.overall_score} size={80} showLabel={false} />
                </Table.Td>
              ))}
            </Table.Tr>
            {keys.map(({ key, label }) => (
              <Table.Tr key={key}>
                <Table.Td>{label}</Table.Td>
                {items.map((a) => {
                  const c = a.match_result.components.find((x) => x.key === key);
                  return (
                    <Table.Td key={a.id}>
                      {c?.applicable ? (
                        <Stack gap={2}>
                          <Text size="sm">{Math.round(c.score ?? 0)}</Text>
                          <Progress value={c.score ?? 0} color={scoreBand(c.score ?? 0).color} size="sm" aria-label={label} />
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed">
                          n/a
                        </Text>
                      )}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            ))}
            <Table.Tr>
              <Table.Td>Missing required skills</Table.Td>
              {items.map((a) => (
                <Table.Td key={a.id}>
                  <Group gap={4}>
                    {a.match_result.missing_required_skills.length === 0 ? (
                      <Text size="sm" c="dimmed">
                        None
                      </Text>
                    ) : (
                      a.match_result.missing_required_skills.map((s) => (
                        <Badge key={s} color="red" variant="outline" size="sm" tt="none">
                          {s}
                        </Badge>
                      ))
                    )}
                  </Group>
                </Table.Td>
              ))}
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Missing preferred skills</Table.Td>
              {items.map((a) => (
                <Table.Td key={a.id}>
                  <Text size="sm">{a.match_result.missing_preferred_skills.join(", ") || "None"}</Text>
                </Table.Td>
              ))}
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}

function CompareContent() {
  const ids = (useSearchParams().get("ids") ?? "").split(",").filter(Boolean).slice(0, 4);
  const comparison = useAnalysisComparison(ids);
  if (ids.length < 2) {
    return (
      <Alert color="blue" variant="light">
        Select two to four analyses in your{" "}
        <Anchor component={Link} href="/analyses">
          analysis history
        </Anchor>{" "}
        to compare them.
      </Alert>
    );
  }
  if (comparison.isPending) return <LoadingBlock rows={3} height={90} />;
  if (comparison.error) return <ErrorBlock error={comparison.error} onRetry={() => comparison.refetch()} />;
  return (
    <Stack gap="md">
      <Title order={5} c="dimmed" fw={500}>
        {describeComparison(comparison.data)}
      </Title>
      <CompareTable items={comparison.data} />
    </Stack>
  );
}

export default function ComparePage() {
  return (
    <>
      <PageHeader
        title="Compare analyses"
        breadcrumbs={[{ label: "Analysis history", href: "/analyses" }, { label: "Compare" }]}
      />
      <Suspense fallback={<LoadingBlock rows={3} />}>
        <CompareContent />
      </Suspense>
    </>
  );
}
