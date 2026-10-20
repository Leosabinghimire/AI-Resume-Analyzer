"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  List,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconSparkles, IconTrash, IconWand } from "@tabler/icons-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { AISourceBadge } from "@/components/common/AISourceBadge";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { useAllJobs } from "@/features/jobs/api";
import { useVersionFeedback } from "@/features/resumes/api";
import { findBulletPath } from "@/features/resumes/draft";
import { formatDateTime, percent } from "@/lib/format";
import { confirmDestructive, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import type { Feedback, Priority, ResumeData } from "@/types/api";
import { useDeleteFeedback, useGenerateFeedback } from "../api";
import { AIDisclosure, ConsentRequiredAlert, isConsentError } from "./AIAccessNotice";

const PRIORITY_COLOR: Record<Priority, string> = { high: "red", medium: "yellow", low: "gray" };

function VerifyBadge() {
  return (
    <Tooltip label="This suggestion adds a placeholder or a detail that is not in your resume. Replace or confirm it with real facts before saving.">
      <Badge color="orange" variant="light" leftSection={<IconAlertTriangle size={12} />} tt="none">
        Needs your verification
      </Badge>
    </Tooltip>
  );
}

function Metrics({ feedback }: { feedback: Feedback }) {
  const m = feedback.metrics;
  const items = [
    { label: "Bullets with numbers", value: percent(m.quantified_bullet_ratio) },
    { label: "Start with action verb", value: percent(m.action_verb_ratio) },
    { label: "Avg. words per bullet", value: m.avg_bullet_words },
    { label: "Vague phrases", value: m.vague_phrase_count },
  ];
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      {items.map((i) => (
        <Card key={i.label} padding="sm">
          <Text size="xs" c="dimmed">
            {i.label}
          </Text>
          <Text fw={700} fz="lg">
            {i.value}
          </Text>
        </Card>
      ))}
    </SimpleGrid>
  );
}

interface Props {
  resumeId: string;
  versionId: string;
  onApplied: () => void;
}

export function FeedbackPanel({ resumeId, versionId, onApplied }: Props) {
  const { getValues, setValue } = useFormContext<ResumeData>();
  const jobs = useAllJobs();
  const history = useVersionFeedback(resumeId, versionId);
  const generate = useGenerateFeedback(resumeId);
  const remove = useDeleteFeedback(resumeId, versionId);
  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const reports = history.data ?? [];
  const feedback = reports.find((r) => r.id === selectedId) ?? reports[0];

  const markApplied = (key: string) => {
    setApplied((prev) => new Set(prev).add(key));
    onApplied();
  };

  const applyBullet = (original: string, suggestion: string) => {
    const path = findBulletPath(getValues(), original);
    if (!path) {
      notifyWarning("That bullet was changed or removed in the editor, so the suggestion cannot be applied.");
      return;
    }
    setValue(path, suggestion, { shouldDirty: true });
    markApplied(`bullet:${original}`);
    notifySuccess("Suggestion applied to your draft. Review it in the Editor tab before saving.");
  };

  const applySummary = (summary: string) => {
    setValue("summary", summary, { shouldDirty: true });
    markApplied("summary");
    notifySuccess("Summary applied to your draft.");
  };

  const applyGrammar = (original: string, suggestion: string) => {
    const current = getValues();
    if (current.summary === original) setValue("summary", suggestion, { shouldDirty: true });
    else {
      const path = findBulletPath(current, original);
      if (!path) return notifyWarning("That text was changed in the editor, so the fix cannot be applied.");
      setValue(path, suggestion, { shouldDirty: true });
    }
    markApplied(`grammar:${original}`);
  };

  const run = () =>
    generate.mutate(
      { resume_version_id: versionId, job_id: jobId },
      { onSuccess: (fb) => setSelectedId(fb.id), onError: (e) => !isConsentError(e) && notifyError(e, "Feedback failed") },
    );

  return (
    <Stack gap="md">
      <Card>
        <Stack gap="sm">
          <Group justify="space-between" align="flex-end" wrap="wrap">
            <Select
              label="Tailor to a saved job (optional)"
              placeholder="General feedback"
              data={(jobs.data?.items ?? []).map((j) => ({ value: j.id, label: j.company ? `${j.title} · ${j.company}` : j.title }))}
              value={jobId}
              onChange={setJobId}
              clearable
              searchable
              style={{ flex: 1, minWidth: 220 }}
            />
            <Button leftSection={<IconSparkles size={16} />} onClick={run} loading={generate.isPending}>
              Generate feedback
            </Button>
          </Group>
          <AIDisclosure />
          {isConsentError(generate.error) && <ConsentRequiredAlert />}
        </Stack>
      </Card>

      {history.isPending && <LoadingBlock rows={2} />}
      {history.error && <ErrorBlock error={history.error} onRetry={() => history.refetch()} />}
      {history.data && reports.length === 0 && !generate.isPending && (
        <Text size="sm" c="dimmed">
          No feedback for this version yet. Generate a report to see weak bullets, suggested rewrites and a checklist.
        </Text>
      )}

      {feedback && (
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
                confirmDestructive({
                  title: "Delete this feedback report?",
                  message: "The report will be permanently deleted. Your resume is not affected.",
                  onConfirm: () => remove.mutate(feedback.id, { onSuccess: () => setSelectedId(null) }),
                })
              }
            >
              Delete report
            </Button>
          </Group>

          <Text>{feedback.result.overall_summary}</Text>
          <Metrics feedback={feedback} />

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Card>
              <Title order={5} mb="xs">
                Structure
              </Title>
              <List size="sm" spacing={4}>
                {feedback.result.structure_feedback.map((t) => (
                  <List.Item key={t}>{t}</List.Item>
                ))}
              </List>
            </Card>
            <Card>
              <Title order={5} mb="xs">
                Readability
              </Title>
              <List size="sm" spacing={4}>
                {feedback.result.readability_feedback.map((t) => (
                  <List.Item key={t}>{t}</List.Item>
                ))}
              </List>
            </Card>
          </SimpleGrid>

          {feedback.result.checklist.length > 0 && (
            <Card>
              <Title order={5} mb="xs">
                Improvement checklist
              </Title>
              <Stack gap={6}>
                {feedback.result.checklist.map((c) => (
                  <Group key={c.item} gap="sm" wrap="nowrap" align="flex-start">
                    <Badge color={PRIORITY_COLOR[c.priority]} variant="light" w={70} tt="capitalize">
                      {c.priority}
                    </Badge>
                    <Text size="sm">{c.item}</Text>
                  </Group>
                ))}
              </Stack>
            </Card>
          )}

          <Card>
            <Title order={5} mb={4}>
              Bullet points to strengthen ({feedback.result.weak_bullets.length})
            </Title>
            <Text size="xs" c="dimmed" mb="sm">
              Applying a suggestion changes your unsaved draft only. Bracketed placeholders must be replaced with real
              facts before you can save.
            </Text>
            {feedback.result.weak_bullets.length === 0 && (
              <Text size="sm" c="dimmed">
                No weak bullets found.
              </Text>
            )}
            <Stack gap="md">
              {feedback.result.weak_bullets.map((wb, index) => {
                const done = applied.has(`bullet:${wb.original}`);
                return (
                  <Stack key={`${wb.original}-${index}`} gap={6}>
                    {index > 0 && <Divider />}
                    <Group gap={6}>
                      {wb.issues.map((i) => (
                        <Badge key={i} size="xs" variant="outline" color="gray" tt="none">
                          {i}
                        </Badge>
                      ))}
                    </Group>
                    <Text size="sm" c="dimmed">
                      <Text span fw={600} c="dimmed">
                        Original:{" "}
                      </Text>
                      {wb.original}
                    </Text>
                    <Text size="sm">
                      <Text span fw={600}>
                        Suggested:{" "}
                      </Text>
                      {wb.suggestion}
                    </Text>
                    <Group gap="xs">
                      {wb.requires_verification && <VerifyBadge />}
                      <Button
                        size="xs"
                        variant={done ? "light" : "filled"}
                        color={done ? "teal" : undefined}
                        leftSection={done ? <IconCheck size={14} /> : <IconWand size={14} />}
                        onClick={() => applyBullet(wb.original, wb.suggestion)}
                        disabled={done}
                      >
                        {done ? "Applied to draft" : "Apply to draft"}
                      </Button>
                    </Group>
                  </Stack>
                );
              })}
            </Stack>
          </Card>

          {feedback.result.summary_suggestion && (
            <Card>
              <Title order={5} mb="xs">
                Suggested professional summary
              </Title>
              <Text size="sm" mb="xs">
                {feedback.result.summary_suggestion.suggested_summary}
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                {feedback.result.summary_suggestion.rationale}
              </Text>
              <Group gap="xs">
                {feedback.result.summary_suggestion.requires_verification && <VerifyBadge />}
                <Button
                  size="xs"
                  leftSection={<IconWand size={14} />}
                  disabled={applied.has("summary")}
                  onClick={() => applySummary(feedback.result.summary_suggestion!.suggested_summary)}
                >
                  {applied.has("summary") ? "Applied to draft" : "Use as summary"}
                </Button>
              </Group>
            </Card>
          )}

          {feedback.result.keyword_recommendations.length > 0 && (
            <Card>
              <Title order={5} mb={4}>
                Keyword recommendations
              </Title>
              <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />} mb="sm" p="xs">
                <Text size="xs">Add a keyword only if it truthfully describes your experience.</Text>
              </Alert>
              <Stack gap={6}>
                {feedback.result.keyword_recommendations.map((k) => (
                  <Group key={k.keyword} gap="sm" wrap="nowrap" align="flex-start">
                    <Badge variant="light" tt="none">
                      {k.keyword}
                    </Badge>
                    <Text size="sm">{k.reason}</Text>
                  </Group>
                ))}
              </Stack>
            </Card>
          )}

          {feedback.result.grammar_suggestions.length > 0 && (
            <Card>
              <Title order={5} mb="xs">
                Grammar & clarity
              </Title>
              <Stack gap="sm">
                {feedback.result.grammar_suggestions.map((g) => (
                  <Group key={g.original} justify="space-between" wrap="nowrap" align="flex-start">
                    <div>
                      <Text size="sm">{g.suggestion}</Text>
                      <Text size="xs" c="dimmed">
                        {g.explanation}
                      </Text>
                    </div>
                    <Button
                      size="xs"
                      variant="light"
                      disabled={applied.has(`grammar:${g.original}`)}
                      onClick={() => applyGrammar(g.original, g.suggestion)}
                    >
                      Apply
                    </Button>
                  </Group>
                ))}
              </Stack>
            </Card>
          )}

          <Group gap="xs">
            <ThemeIcon size="sm" variant="light" color="gray">
              <IconAlertTriangle size={12} />
            </ThemeIcon>
            <Text size="xs" c="dimmed">
              Feedback is guidance, not a guarantee of results with any applicant tracking system or employer.
            </Text>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
