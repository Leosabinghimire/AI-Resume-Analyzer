"use client";

import { SimpleGrid, Stack } from "@mantine/core";
import { IconMessageQuestion } from "@tabler/icons-react";
import { EmptyState, LoadingBlock, PageHeader, QueryBoundary } from "@/components/ui";
import { useInterviewPreps } from "@/features/coaching/api";
import { InterviewPrepCard, InterviewPrepGenerator } from "@/features/coaching/components/InterviewPrepParts";

export default function InterviewPrepListPage() {
  const preps = useInterviewPreps();
  return (
    <>
      <PageHeader
        title="Interview preparation"
        description="Practice questions tailored to a job and your resume. They are likely topics, not the employer's actual questions."
      />
      <Stack gap="lg">
        <InterviewPrepGenerator />
        <QueryBoundary query={preps} loading={<LoadingBlock rows={2} />}>
          {(page) =>
            page.total === 0 ? (
              <EmptyState
                icon={<IconMessageQuestion size={28} />}
                title="No interview preparation yet"
                description="Choose a resume and a saved job above to generate technical, behavioral and project questions."
              />
            ) : (
              <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg">
                {page.items.map((p) => (
                  <InterviewPrepCard key={p.id} prep={p} />
                ))}
              </SimpleGrid>
            )
          }
        </QueryBoundary>
      </Stack>
    </>
  );
}
