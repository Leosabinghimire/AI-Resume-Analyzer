"use client";

import { Alert, Button, Group, Menu, Stack, Text } from "@mantine/core";
import {
  IconChevronDown,
  IconEdit,
  IconHistory,
  IconInfoCircle,
  IconMessageQuestion,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { useAnalysis, useDeleteAnalysis, useRunAnalysis } from "@/features/analyses/api";
import { AIInsightsCard } from "@/features/analyses/components/AIInsightsCard";
import { MatchResultView } from "@/features/analyses/components/MatchResultView";
import { isConsentError } from "@/features/coaching/components/AIAccessNotice";
import { useGenerateInterviewPrep } from "@/features/coaching/api";
import { formatDateTime } from "@/lib/format";
import { confirmDestructive, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const analysis = useAnalysis(id);
  const remove = useDeleteAnalysis();
  const rerun = useRunAnalysis();
  const prep = useGenerateInterviewPrep();

  if (analysis.isPending) return <LoadingBlock rows={4} height={120} />;
  if (analysis.error) return <ErrorBlock error={analysis.error} onRetry={() => analysis.refetch()} />;
  const a = analysis.data;

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
        description={
          <>
            {a.resume.resume_title} · v{a.resume.version_number} ({a.resume.version_label}) · analyzed{" "}
            {formatDateTime(a.created_at)}
          </>
        }
        actions={
          <>
            <Button
              variant="default"
              leftSection={<IconMessageQuestion size={16} />}
              loading={prep.isPending}
              onClick={() =>
                prep.mutate(
                  { resume_version_id: a.resume.version_id, job_id: a.job.id },
                  {
                    onSuccess: (p) => router.push(`/interview-prep/${p.id}`),
                    onError: (e) =>
                      isConsentError(e) ? notifyWarning("Enable AI processing in Settings to generate interview prep.") : notifyError(e),
                  },
                )
              }
            >
              Interview prep
            </Button>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button variant="default" rightSection={<IconChevronDown size={14} />}>
                  More
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  component={Link}
                  href={`/resumes/${a.resume.resume_id}?version=${a.resume.version_id}`}
                  leftSection={<IconEdit size={16} />}
                >
                  Improve this resume
                </Menu.Item>
                <Menu.Item component={Link} href={`/analyses?job_id=${a.job.id}`} leftSection={<IconHistory size={16} />}>
                  Other analyses for this job
                </Menu.Item>
                <Menu.Item leftSection={<IconRefresh size={16} />} onClick={runAgain}>
                  Run again
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() =>
                    confirmDestructive({
                      title: "Delete this analysis?",
                      message: "The analysis will be removed from your history. Your resume and job are not affected.",
                      onConfirm: () =>
                        remove.mutate(id, {
                          onSuccess: () => {
                            notifySuccess("Analysis deleted.");
                            router.replace("/analyses");
                          },
                          onError: (e) => notifyError(e),
                        }),
                    })
                  }
                >
                  Delete analysis
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </>
        }
      />
      <Stack gap="lg">
        {a.is_stale && (
          <Alert color="yellow" variant="light" icon={<IconInfoCircle size={18} />} title="This analysis is outdated">
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
          <Link href="/features#scoring">how the score is calculated</Link> and its limitations.
        </Text>
      </Stack>
    </>
  );
}
