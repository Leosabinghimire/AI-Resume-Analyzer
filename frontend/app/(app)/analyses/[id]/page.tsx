"use client";

import { Alert, Anchor, Badge, Button, Group, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LoadingBlock, PageHeader, QueryBoundary } from "@/components/ui";
import { useAnalysis, useRunAnalysis } from "@/features/analyses/api";
import { AIInsightsCard } from "@/features/analyses/components/AIInsightsCard";
import { AnalysisActions } from "@/features/analyses/components/AnalysisActions";
import { MatchResultView } from "@/features/analyses/components/MatchResultView";
import { formatDateTime } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { Analysis } from "@/types/api";

function AnalysisView({ analysis: a }: { analysis: Analysis }) {
  const router = useRouter();
  const rerun = useRunAnalysis();

  const runAgain = () =>
    rerun.mutate(
      { resume_version_id: a.resume.version_id, job_ids: [a.job.id], include_ai_insights: a.ai_status !== "not_requested" },
      {
        onSuccess: (results) => {
          notifySuccess("Analysis updated with the current resume and job.");
          router.push(`/analyses/${results[0]!.id}`);
        },
        onError: (e) => notifyError(e, "Could not re-run analysis"),
      },
    );

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Analysis history", href: "/analyses" }, { label: a.job.title }]}
        title={`${a.job.title}${a.job.company ? ` · ${a.job.company}` : ""}`}
        meta={
          <>
            <Badge variant="default">
              {a.resume.resume_title} · v{a.resume.version_number}
            </Badge>
            <Text size="xs" c="dimmed">
              {a.resume.version_label} · analyzed {formatDateTime(a.created_at)}
            </Text>
          </>
        }
        actions={<AnalysisActions analysis={a} onRunAgain={runAgain} />}
      />
      <Stack gap="lg">
        {a.is_stale && (
          <Alert color="yellow" icon={<IconInfoCircle size={18} />} title="This analysis is outdated">
            <Group justify="space-between" gap="sm">
              <Text size="sm">The resume version or job description was edited after this analysis was created.</Text>
              <Button size="xs" variant="white" color="yellow" onClick={runAgain} loading={rerun.isPending}>
                Run again
              </Button>
            </Group>
          </Alert>
        )}
        <MatchResultView result={a.match_result} />
        <AIInsightsCard analysis={a} />
        <Text size="xs" c="dimmed">
          Scoring methodology v{a.match_result.methodology_version}. See{" "}
          <Anchor component={Link} href="/features#scoring" size="xs">
            how the score is calculated
          </Anchor>{" "}
          and its limitations.
        </Text>
      </Stack>
    </>
  );
}

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const analysis = useAnalysis(id);
  return (
    <QueryBoundary query={analysis} loading={<LoadingBlock rows={4} height={120} />}>
      {(a) => <AnalysisView analysis={a} />}
    </QueryBoundary>
  );
}
