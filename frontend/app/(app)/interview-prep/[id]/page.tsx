"use client";

import { Accordion, Alert, Badge, Card, Group, List, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { AISourceBadge } from "@/components/common/AISourceBadge";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { useInterviewPrep } from "@/features/coaching/api";
import { formatDateTime } from "@/lib/format";
import type { InterviewQuestion, Priority } from "@/types/api";

const PRIORITY_COLOR: Record<Priority, string> = { high: "red", medium: "yellow", low: "gray" };

function QuestionList({ title, questions }: { title: string; questions: InterviewQuestion[] }) {
  return (
    <Card>
      <Title order={4} mb="sm">
        {title} ({questions.length})
      </Title>
      {questions.length === 0 ? (
        <Text size="sm" c="dimmed">
          None generated.
        </Text>
      ) : (
        <Accordion variant="contained" multiple>
          {questions.map((q, i) => (
            <Accordion.Item key={`${q.question}-${i}`} value={String(i)}>
              <Accordion.Control>
                <Text size="sm" fw={500}>
                  {q.question}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed">
                    Why it may come up: {q.why_asked}
                  </Text>
                  <div>
                    <Text size="sm" fw={600} mb={4}>
                      Answer outline
                    </Text>
                    <List size="sm" type="ordered" spacing={2}>
                      {q.answer_outline.map((step) => (
                        <List.Item key={step}>{step}</List.Item>
                      ))}
                    </List>
                  </div>
                  {q.resume_evidence ? (
                    <Text size="sm">
                      <Text span fw={600}>
                        Draw on:{" "}
                      </Text>
                      {q.resume_evidence}
                    </Text>
                  ) : (
                    <Text size="xs" c="dimmed">
                      Your resume has no direct evidence for this. Prepare an honest answer about related experience or
                      how you would learn it.
                    </Text>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Card>
  );
}

export default function InterviewPrepPage() {
  const { id } = useParams<{ id: string }>();
  const prep = useInterviewPrep(id);
  if (prep.isPending) return <LoadingBlock rows={4} />;
  if (prep.error) return <ErrorBlock error={prep.error} onRetry={() => prep.refetch()} />;
  const p = prep.data;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Interview preparation", href: "/interview-prep" }, { label: p.job_title }]}
        title={`Interview prep: ${p.job_title}`}
        description={`${p.company ?? "Company not specified"} · based on ${p.resume_title} (${p.version_label}) · ${formatDateTime(p.created_at)}`}
        actions={<AISourceBadge isMock={p.is_mock} />}
      />
      <Stack gap="lg">
        <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />}>
          {p.disclaimer}
        </Alert>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <QuestionList title="Technical questions" questions={p.result.technical_questions} />
          <QuestionList title="Behavioral questions" questions={p.result.behavioral_questions} />
          <QuestionList title="Questions about your projects and roles" questions={p.result.project_questions} />
          <Card>
            <Title order={4} mb="sm">
              Topics to study
            </Title>
            <Stack gap="sm">
              {p.result.study_topics.map((t) => (
                <Group key={t.topic} gap="sm" wrap="nowrap" align="flex-start">
                  <Badge color={PRIORITY_COLOR[t.priority]} variant="light" w={74} tt="capitalize" style={{ flexShrink: 0 }}>
                    {t.priority}
                  </Badge>
                  <div>
                    <Text size="sm" fw={600}>
                      {t.topic}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t.reason}
                    </Text>
                  </div>
                </Group>
              ))}
              {p.result.study_topics.length === 0 && (
                <Text size="sm" c="dimmed">
                  No specific topics identified.
                </Text>
              )}
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </>
  );
}
