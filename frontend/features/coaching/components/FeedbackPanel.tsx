"use client";

import { Button, Group, Select, Stack, Text } from "@mantine/core";
import { IconSparkles, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { AISourceBadge, EmptyState, LoadingBlock, QueryBoundary, SectionCard } from "@/components/ui";
import { JobSelect } from "@/features/jobs/components/JobSelect";
import { useVersionFeedback } from "@/features/resumes/api";
import { formatDateTime } from "@/lib/format";
import { confirmAction, notifyError } from "@/lib/notify";
import { useDeleteFeedback, useGenerateFeedback } from "../api";
import { AIDisclosure, ConsentRequiredAlert, isConsentError } from "./AIAccessNotice";
import { FeedbackReport } from "./FeedbackReport";

interface Props {
  resumeId: string;
  versionId: string;
  onApplied: () => void;
}

export function FeedbackPanel({ resumeId, versionId, onApplied }: Props) {
  const history = useVersionFeedback(resumeId, versionId);
  const generate = useGenerateFeedback(resumeId);
  const remove = useDeleteFeedback(resumeId, versionId);
  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const run = () =>
    generate.mutate(
      { resume_version_id: versionId, job_id: jobId },
      { onSuccess: (fb) => setSelectedId(fb.id), onError: (e) => !isConsentError(e) && notifyError(e, "Feedback failed") },
    );

  return (
    <Stack gap="lg">
      <SectionCard
        title="Resume feedback"
        description="Find weak bullets and get rewrites that keep your real facts."
        icon={<IconSparkles size={18} />}
      >
        <Stack gap="sm">
          <Group align="flex-end" wrap="wrap">
            <JobSelect
              label="Tailor to a saved job (optional)"
              placeholder="General feedback"
              value={jobId}
              onChange={setJobId}
              clearable
              style={{ flex: 1, minWidth: 220 }}
            />
            <Button leftSection={<IconSparkles size={16} />} onClick={run} loading={generate.isPending}>
              Generate feedback
            </Button>
          </Group>
          <AIDisclosure />
          {isConsentError(generate.error) && <ConsentRequiredAlert />}
        </Stack>
      </SectionCard>

      <QueryBoundary query={history} loading={<LoadingBlock rows={2} />}>
        {(reports) => {
          const feedback = reports.find((r) => r.id === selectedId) ?? reports[0];
          if (!feedback) {
            return generate.isPending ? (
              <LoadingBlock rows={3} />
            ) : (
              <EmptyState
                compact
                icon={<IconSparkles size={24} />}
                title="No feedback yet"
                description="Generate a report to see weak bullets, suggested rewrites and a prioritized checklist."
              />
            );
          }
          return (
            <Stack gap="md">
              <Group justify="space-between" wrap="wrap">
                <Group gap="xs">
                  <AISourceBadge isMock={feedback.is_mock} model={feedback.model} />
                  {reports.length > 1 ? (
                    <Select
                      size="xs"
                      aria-label="Feedback report"
                      data={reports.map((r) => ({ value: r.id, label: formatDateTime(r.created_at) }))}
                      value={feedback.id}
                      onChange={setSelectedId}
                      allowDeselect={false}
                    />
                  ) : (
                    <Text size="xs" c="dimmed">
                      {formatDateTime(feedback.created_at)}
                    </Text>
                  )}
                </Group>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() =>
                    confirmAction({
                      title: "Delete this feedback report?",
                      message: "The report will be permanently deleted. Your resume is not affected.",
                      run: () => remove.mutateAsync(feedback.id),
                      onSuccess: () => setSelectedId(null),
                    })
                  }
                >
                  Delete report
                </Button>
              </Group>
              <FeedbackReport key={feedback.id} feedback={feedback} onApplied={onApplied} />
            </Stack>
          );
        }}
      </QueryBoundary>
    </Stack>
  );
}
