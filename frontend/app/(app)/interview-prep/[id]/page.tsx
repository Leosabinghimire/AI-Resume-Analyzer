"use client";

import { Alert, SimpleGrid, Stack } from "@mantine/core";
import { IconBook, IconInfoCircle } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { AISourceBadge, LoadingBlock, PageHeader, PriorityList, QueryBoundary, SectionCard } from "@/components/ui";
import { useInterviewPrep } from "@/features/coaching/api";
import { QuestionList } from "@/features/coaching/components/InterviewPrepParts";
import { formatDateTime } from "@/lib/format";
import type { InterviewPrep } from "@/types/api";

function InterviewPrepView({ prep: p }: { prep: InterviewPrep }) {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Interview preparation", href: "/interview-prep" }, { label: p.job_title }]}
        title={`Interview prep: ${p.job_title}`}
        description={`${p.company ?? "Company not specified"} · based on ${p.resume_title} (${p.version_label}) · ${formatDateTime(p.created_at)}`}
        meta={<AISourceBadge isMock={p.is_mock} />}
      />
      <Stack gap="lg">
        <Alert color="blue" icon={<IconInfoCircle size={18} />}>
          {p.disclaimer}
        </Alert>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <QuestionList title="Technical questions" questions={p.result.technical_questions} />
          <QuestionList title="Behavioral questions" questions={p.result.behavioral_questions} />
          <QuestionList title="Questions about your projects and roles" questions={p.result.project_questions} />
          <SectionCard title="Topics to study" icon={<IconBook size={18} />}>
            <PriorityList
              items={p.result.study_topics.map((t) => ({ key: t.topic, priority: t.priority, title: t.topic, detail: t.reason }))}
              empty="No specific topics identified."
            />
          </SectionCard>
        </SimpleGrid>
      </Stack>
    </>
  );
}

export default function InterviewPrepPage() {
  const { id } = useParams<{ id: string }>();
  const prep = useInterviewPrep(id);
  return (
    <QueryBoundary query={prep} loading={<LoadingBlock rows={4} />}>
      {(p) => <InterviewPrepView prep={p} />}
    </QueryBoundary>
  );
}
