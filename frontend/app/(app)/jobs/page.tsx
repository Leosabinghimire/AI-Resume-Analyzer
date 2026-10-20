"use client";

import { ActionIcon, Anchor, Button, Card, Group, Pagination, Stack, Table, Text, TextInput, Tooltip } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconBriefcase, IconExternalLink, IconPlus, IconSearch, IconTargetArrow, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { ScoreBadgeText } from "@/components/score/ScoreRing";
import { JOBS_PAGE_SIZE, useDeleteJob, useJobs } from "@/features/jobs/api";
import { formatDate } from "@/lib/format";
import { confirmDestructive, notifyError, notifySuccess } from "@/lib/notify";

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debounced] = useDebouncedValue(search, 300);
  const jobs = useJobs(debounced, page);
  const remove = useDeleteJob();
  const totalPages = jobs.data ? Math.max(1, Math.ceil(jobs.data.total / JOBS_PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        title="Job descriptions"
        description="Saved postings you can match your resumes against."
        actions={
          <Button component={Link} href="/jobs/new" leftSection={<IconPlus size={16} />}>
            Add job
          </Button>
        }
      />
      <Stack gap="md">
        <TextInput
          placeholder="Search by title or company"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
          aria-label="Search jobs"
          maw={420}
        />
        {jobs.isPending && <LoadingBlock rows={4} height={52} />}
        {jobs.error && <ErrorBlock error={jobs.error} onRetry={() => jobs.refetch()} />}
        {jobs.data && jobs.data.total === 0 && (
          <EmptyState
            icon={<IconBriefcase size={26} />}
            title={debounced ? "No jobs match your search" : "No job descriptions yet"}
            description={debounced ? "Try another title or company." : "Paste a job posting to extract its requirements."}
            action={
              !debounced && (
                <Button component={Link} href="/jobs/new" leftSection={<IconPlus size={16} />}>
                  Add your first job
                </Button>
              )
            }
          />
        )}
        {jobs.data && jobs.data.total > 0 && (
          <Card p={0}>
            <Table.ScrollContainer minWidth={720}>
              <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Job</Table.Th>
                    <Table.Th>Required skills</Table.Th>
                    <Table.Th>Analyses</Table.Th>
                    <Table.Th>Best score</Table.Th>
                    <Table.Th>Added</Table.Th>
                    <Table.Th ta="right">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {jobs.data.items.map((job) => (
                    <Table.Tr key={job.id}>
                      <Table.Td>
                        <Anchor component={Link} href={`/jobs/${job.id}`} fw={500} size="sm">
                          {job.title}
                        </Anchor>
                        <Text size="xs" c="dimmed">
                          {job.company ?? "Company not specified"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={1} maw={260}>
                          {job.required_skills.slice(0, 5).join(", ") || "—"}
                          {job.required_skills.length > 5 ? ` +${job.required_skills.length - 5}` : ""}
                        </Text>
                      </Table.Td>
                      <Table.Td>{job.analysis_count}</Table.Td>
                      <Table.Td>{job.best_score === null ? "—" : <ScoreBadgeText score={job.best_score} />}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDate(job.created_at)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          {job.url && (
                            <Tooltip label="Open original posting" multiline={false}>
                              <ActionIcon
                                variant="subtle"
                                component="a"
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open posting for ${job.title}`}
                              >
                                <IconExternalLink size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          <Tooltip label="Match a resume" multiline={false}>
                            <ActionIcon
                              variant="subtle"
                              component={Link}
                              href={`/analyses/new?job=${job.id}`}
                              aria-label={`Match a resume against ${job.title}`}
                            >
                              <IconTargetArrow size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete" multiline={false}>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              aria-label={`Delete ${job.title}`}
                              onClick={() =>
                                confirmDestructive({
                                  title: "Delete job description?",
                                  message: `"${job.title}" and its ${job.analysis_count} analyses will be permanently deleted.`,
                                  onConfirm: () =>
                                    remove.mutate(job.id, {
                                      onSuccess: () => notifySuccess("Job deleted."),
                                      onError: (e) => notifyError(e, "Could not delete job"),
                                    }),
                                })
                              }
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        )}
        {totalPages > 1 && <Pagination value={page} onChange={setPage} total={totalPages} />}
      </Stack>
    </>
  );
}
