"use client";

import { Anchor, Badge, Button, Group, Stack, Text } from "@mantine/core";
import { IconBriefcase, IconExternalLink, IconPlus, IconTargetArrow, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { ScoreBadge } from "@/components/domain/ScoreRing";
import {
  DataTable,
  EmptyState,
  IconAction,
  ListPagination,
  LoadingBlock,
  PageHeader,
  QueryBoundary,
  SearchInput,
  SectionCard,
  type Column,
} from "@/components/ui";
import { JOBS_PAGE_SIZE, useDeleteJob, useJobs } from "@/features/jobs/api";
import { useListParams } from "@/hooks/useListParams";
import { formatDate } from "@/lib/format";
import { confirmAction } from "@/lib/notify";
import type { JobSummary } from "@/types/api";

const addButton = (
  <Button component={Link} href="/jobs/new" leftSection={<IconPlus size={16} />}>
    Add job
  </Button>
);

function useJobColumns(): Column<JobSummary>[] {
  const remove = useDeleteJob();
  return [
    {
      key: "job",
      header: "Job",
      render: (job) => (
        <div>
          <Anchor component={Link} href={`/jobs/${job.id}`} fw={600} size="sm">
            {job.title}
          </Anchor>
          <Text size="xs" c="dimmed">
            {job.company ?? "Company not specified"}
          </Text>
        </div>
      ),
    },
    {
      key: "skills",
      header: "Required skills",
      render: (job) => (
        <Group gap={4} wrap="nowrap" maw={300} style={{ overflow: "hidden" }}>
          {job.required_skills.slice(0, 3).map((s) => (
            <Badge key={s} variant="default" size="sm">
              {s}
            </Badge>
          ))}
          {job.required_skills.length > 3 && (
            <Text size="xs" c="dimmed">
              +{job.required_skills.length - 3}
            </Text>
          )}
          {job.required_skills.length === 0 && <Text size="sm" c="dimmed">—</Text>}
        </Group>
      ),
    },
    { key: "analyses", header: "Analyses", width: 90, render: (job) => <Text size="sm">{job.analysis_count}</Text> },
    {
      key: "best",
      header: "Best score",
      width: 110,
      render: (job) => (job.best_score === null ? <Text size="sm" c="dimmed">—</Text> : <ScoreBadge score={job.best_score} />),
    },
    { key: "added", header: "Added", width: 120, render: (job) => <Text size="sm">{formatDate(job.created_at)}</Text> },
    {
      key: "actions",
      header: "",
      align: "right",
      width: 120,
      render: (job) => (
        <Group gap={4} justify="flex-end" wrap="nowrap">
          {job.url && (
            <IconAction label={`Open posting for ${job.title}`} tooltip="Open original posting" icon={<IconExternalLink size={16} />} href={job.url} external />
          )}
          <IconAction label={`Match a resume against ${job.title}`} tooltip="Match a resume" icon={<IconTargetArrow size={16} />} href={`/analyses/new?job=${job.id}`} />
          <IconAction
            label={`Delete ${job.title}`}
            tooltip="Delete"
            color="red"
            icon={<IconTrash size={16} />}
            onClick={() =>
              confirmAction({
                title: "Delete job description?",
                message: `"${job.title}" and its ${job.analysis_count} analyses will be permanently deleted.`,
                run: () => remove.mutateAsync(job.id),
                successMessage: "Job deleted.",
                errorTitle: "Could not delete job",
              })
            }
          />
        </Group>
      ),
    },
  ];
}

export default function JobsPage() {
  const list = useListParams();
  const jobs = useJobs(list.debouncedSearch, list.page);
  const columns = useJobColumns();

  return (
    <>
      <PageHeader title="Job descriptions" description="Saved postings you can match your resumes against." actions={addButton} />
      <Stack gap="lg">
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search by title or company" maw={420} />
        <QueryBoundary query={jobs} loading={<LoadingBlock rows={4} height={52} />}>
          {(page) =>
            page.total === 0 ? (
              <EmptyState
                icon={<IconBriefcase size={28} />}
                title={list.debouncedSearch ? "No jobs match your search" : "No job descriptions yet"}
                description={list.debouncedSearch ? "Try another title or company." : "Paste a job posting to extract its requirements."}
                action={!list.debouncedSearch && addButton}
              />
            ) : (
              <Stack gap="md">
                <SectionCard flush>
                  <DataTable columns={columns} rows={page.items} rowKey={(j) => j.id} minWidth={820} caption="Saved jobs" />
                </SectionCard>
                <ListPagination page={list.page} pageSize={JOBS_PAGE_SIZE} total={page.total} onChange={list.setPage} />
              </Stack>
            )
          }
        </QueryBoundary>
      </Stack>
    </>
  );
}
