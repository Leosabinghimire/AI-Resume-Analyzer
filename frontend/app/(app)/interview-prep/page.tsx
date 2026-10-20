"use client";

import { ActionIcon, Anchor, Button, Card, Group, Select, SimpleGrid, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconMessageQuestion, IconSparkles, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AISourceBadge } from "@/components/common/AISourceBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { useDeleteInterviewPrep, useGenerateInterviewPrep, useInterviewPreps } from "@/features/coaching/api";
import { AIDisclosure, ConsentRequiredAlert, isConsentError } from "@/features/coaching/components/AIAccessNotice";
import { useAllJobs } from "@/features/jobs/api";
import { useAllResumes } from "@/features/resumes/api";
import { formatDateTime } from "@/lib/format";
import { confirmDestructive, notifyError, notifySuccess } from "@/lib/notify";

function GenerateCard() {
  const router = useRouter();
  const resumes = useAllResumes();
  const jobs = useAllJobs();
  const generate = useGenerateInterviewPrep();
  const [versionId, setVersionId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const versionOptions = (resumes.data?.items ?? [])
    .filter((r) => r.latest_version)
    .map((r) => ({ value: r.latest_version!.id, label: `${r.title} (latest: v${r.latest_version!.version_number})` }));

  return (
    <Card>
      <Title order={4} mb="sm">
        Generate practice questions
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mb="sm">
        <Select label="Resume" placeholder="Choose a resume" data={versionOptions} value={versionId} onChange={setVersionId} searchable />
        <Select
          label="Job"
          placeholder="Choose a job"
          data={(jobs.data?.items ?? []).map((j) => ({ value: j.id, label: j.company ? `${j.title} · ${j.company}` : j.title }))}
          value={jobId}
          onChange={setJobId}
          searchable
        />
      </SimpleGrid>
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div style={{ flex: 1, minWidth: 240 }}>
          <AIDisclosure />
        </div>
        <Button
          leftSection={<IconSparkles size={16} />}
          disabled={!versionId || !jobId}
          loading={generate.isPending}
          onClick={() =>
            generate.mutate(
              { resume_version_id: versionId!, job_id: jobId! },
              {
                onSuccess: (p) => router.push(`/interview-prep/${p.id}`),
                onError: (e) => !isConsentError(e) && notifyError(e, "Could not generate questions"),
              },
            )
          }
        >
          Generate
        </Button>
      </Group>
      {isConsentError(generate.error) && (
        <div style={{ marginTop: 12 }}>
          <ConsentRequiredAlert />
        </div>
      )}
    </Card>
  );
}

export default function InterviewPrepListPage() {
  const preps = useInterviewPreps();
  const remove = useDeleteInterviewPrep();
  return (
    <>
      <PageHeader
        title="Interview preparation"
        description="Practice questions tailored to a job and your resume. They are likely topics, not the employer's actual questions."
      />
      <Stack gap="lg">
        <GenerateCard />
        {preps.isPending && <LoadingBlock rows={2} />}
        {preps.error && <ErrorBlock error={preps.error} onRetry={() => preps.refetch()} />}
        {preps.data && preps.data.total === 0 && (
          <EmptyState
            icon={<IconMessageQuestion size={26} />}
            title="No interview preparation yet"
            description="Choose a resume and a saved job above to generate technical, behavioral and project questions."
          />
        )}
        {preps.data && preps.data.total > 0 && (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {preps.data.items.map((p) => (
              <Card key={p.id}>
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <div style={{ minWidth: 0 }}>
                    <Anchor component={Link} href={`/interview-prep/${p.id}`} fw={600}>
                      {p.job_title}
                    </Anchor>
                    <Text size="xs" c="dimmed">
                      {p.company ?? "Company not specified"} · {p.resume_title} ({p.version_label})
                    </Text>
                  </div>
                  <Tooltip label="Delete" multiline={false}>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Delete interview prep for ${p.job_title}`}
                      onClick={() =>
                        confirmDestructive({
                          title: "Delete interview preparation?",
                          message: "These practice questions will be permanently deleted.",
                          onConfirm: () =>
                            remove.mutate(p.id, { onSuccess: () => notifySuccess("Deleted."), onError: (e) => notifyError(e) }),
                        })
                      }
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Group justify="space-between" mt="sm">
                  <AISourceBadge isMock={p.is_mock} />
                  <Text size="xs" c="dimmed">
                    {formatDateTime(p.created_at)}
                  </Text>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </>
  );
}
