"use client";

import { Accordion, Button, Card, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconFileText, IconMessageQuestion, IconSparkles, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AISourceBadge, BulletList, IconAction, SectionCard } from "@/components/ui";
import { JobSelect } from "@/features/jobs/components/JobSelect";
import { ResumeVersionPicker } from "@/features/resumes/components/ResumePickers";
import { formatDateTime } from "@/lib/format";
import { confirmAction, notifyError } from "@/lib/notify";
import type { InterviewPrepSummary, InterviewQuestion } from "@/types/api";
import { useDeleteInterviewPrep, useGenerateInterviewPrep } from "../api";
import { AIDisclosure, ConsentRequiredAlert, isConsentError } from "./AIAccessNotice";

export function InterviewPrepGenerator() {
  const router = useRouter();
  const generate = useGenerateInterviewPrep();
  const [versionId, setVersionId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <SectionCard
      title="Generate practice questions"
      icon={<IconSparkles size={18} />}
      description="Technical, behavioral and project questions tailored to a job and your resume."
    >
      <Stack gap="md">
        <ResumeVersionPicker value={versionId} onChange={setVersionId} />
        <JobSelect value={jobId} onChange={setJobId} />
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
        {isConsentError(generate.error) && <ConsentRequiredAlert />}
      </Stack>
    </SectionCard>
  );
}

export function InterviewPrepCard({ prep }: { prep: InterviewPrepSummary }) {
  const remove = useDeleteInterviewPrep();
  return (
    <Card padding="lg">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          <ThemeIcon size={42} radius="md" variant="light" color="violet">
            <IconMessageQuestion size={22} />
          </ThemeIcon>
          <div style={{ minWidth: 0 }}>
            <Text component={Link} href={`/interview-prep/${prep.id}`} fw={650} truncate display="block">
              {prep.job_title}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {prep.company ?? "Company not specified"}
            </Text>
          </div>
        </Group>
        <IconAction
          label={`Delete interview prep for ${prep.job_title}`}
          tooltip="Delete"
          color="red"
          icon={<IconTrash size={16} />}
          onClick={() =>
            confirmAction({
              title: "Delete interview preparation?",
              message: "These practice questions will be permanently deleted.",
              run: () => remove.mutateAsync(prep.id),
              successMessage: "Deleted.",
            })
          }
        />
      </Group>
      <Group gap={6} mt="md">
        <IconFileText size={14} style={{ opacity: 0.6 }} />
        <Text size="xs" c="dimmed">
          {prep.resume_title} ({prep.version_label})
        </Text>
      </Group>
      <Group justify="space-between" mt="md" pt="sm" style={{ borderTop: "1px solid var(--app-border)" }}>
        <AISourceBadge isMock={prep.is_mock} />
        <Text size="xs" c="dimmed">
          {formatDateTime(prep.created_at)}
        </Text>
      </Group>
    </Card>
  );
}

export function QuestionList({ title, questions }: { title: string; questions: InterviewQuestion[] }) {
  return (
    <SectionCard title={`${title} (${questions.length})`}>
      {questions.length === 0 ? (
        <Text size="sm" c="dimmed">
          None generated.
        </Text>
      ) : (
        <Accordion variant="separated" radius="md" multiple styles={{ item: { backgroundColor: "var(--app-surface-muted)", borderColor: "var(--app-border)" } }}>
          {questions.map((q, i) => (
            <Accordion.Item key={`${q.question}-${i}`} value={String(i)}>
              <Accordion.Control>
                <Text size="sm" fw={600}>
                  {q.question}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Text size="xs" c="dimmed">
                    Why it may come up: {q.why_asked}
                  </Text>
                  <div>
                    <Text size="sm" fw={600} mb={6}>
                      Answer outline
                    </Text>
                    <BulletList items={q.answer_outline} variant="ordered" />
                  </div>
                  {q.resume_evidence ? (
                    <Paper p="sm" radius="md" withBorder bg="var(--app-surface)">
                      <Text size="sm">
                        <Text span fw={600}>
                          Draw on:{" "}
                        </Text>
                        {q.resume_evidence}
                      </Text>
                    </Paper>
                  ) : (
                    <Text size="xs" c="dimmed">
                      Your resume has no direct evidence for this. Prepare an honest answer about related experience or how
                      you would learn it.
                    </Text>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </SectionCard>
  );
}
