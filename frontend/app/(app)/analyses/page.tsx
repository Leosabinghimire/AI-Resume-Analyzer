"use client";

import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Checkbox,
  Group,
  NumberInput,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconArrowsDiff, IconHistory, IconSearch, IconTargetArrow, IconTrash, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { ScoreBadgeText } from "@/components/score/ScoreRing";
import { useAnalyses, useDeleteAnalysis } from "@/features/analyses/api";
import { AnalysisStatusBadges } from "@/features/analyses/components/AnalysisStatusBadges";
import { useAllJobs } from "@/features/jobs/api";
import { useAllResumes } from "@/features/resumes/api";
import { formatDateTime } from "@/lib/format";
import { confirmDestructive, notifyError, notifySuccess } from "@/lib/notify";
import type { AnalysisFilters } from "@/types/api";

const PAGE_SIZE = 20;
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "score_desc", label: "Highest score" },
  { value: "score_asc", label: "Lowest score" },
];

function HistoryContent() {
  const params = useSearchParams();
  const router = useRouter();
  const resumes = useAllResumes();
  const jobs = useAllJobs();
  const remove = useDeleteAnalysis();

  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search, 300);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(params.get("job_id"));
  const [minScore, setMinScore] = useState<number | string>("");
  const [sort, setSort] = useState<AnalysisFilters["sort"]>("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const versionFilter = params.get("resume_version_id") ?? undefined;

  const filters: AnalysisFilters = {
    q: debounced || undefined,
    resume_id: resumeId ?? undefined,
    resume_version_id: versionFilter,
    job_id: jobId ?? undefined,
    min_score: typeof minScore === "number" ? minScore : undefined,
    sort,
    page,
    page_size: PAGE_SIZE,
  };
  const analyses = useAnalyses(filters);
  const hasFilters = Boolean(debounced || resumeId || jobId || minScore !== "" || versionFilter);
  const totalPages = analyses.data ? Math.max(1, Math.ceil(analyses.data.total / PAGE_SIZE)) : 1;

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };
  const clearFilters = () => {
    setSearch("");
    setResumeId(null);
    setJobId(null);
    setMinScore("");
    setPage(1);
    if (versionFilter) router.replace("/analyses");
  };
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev));

  return (
    <Stack gap="md">
      <Card padding="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="sm">
          <TextInput
            label="Search"
            placeholder="Job, company or resume"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => resetPage(setSearch)(e.currentTarget.value)}
          />
          <Select
            label="Resume"
            placeholder="All resumes"
            data={(resumes.data?.items ?? []).map((r) => ({ value: r.id, label: r.title }))}
            value={resumeId}
            onChange={resetPage(setResumeId)}
            clearable
            searchable
          />
          <Select
            label="Job"
            placeholder="All jobs"
            data={(jobs.data?.items ?? []).map((j) => ({ value: j.id, label: j.title }))}
            value={jobId}
            onChange={resetPage(setJobId)}
            clearable
            searchable
          />
          <NumberInput label="Minimum score" placeholder="0–100" min={0} max={100} value={minScore} onChange={resetPage(setMinScore)} />
          <Select
            label="Sort"
            data={SORTS}
            value={sort}
            onChange={(v) => resetPage(setSort)((v ?? "newest") as AnalysisFilters["sort"])}
            allowDeselect={false}
          />
        </SimpleGrid>
        {hasFilters && (
          <Group mt="sm" gap="xs">
            {versionFilter && (
              <Text size="xs" c="dimmed">
                Showing one resume version.
              </Text>
            )}
            <Button size="xs" variant="subtle" leftSection={<IconX size={14} />} onClick={clearFilters}>
              Clear filters
            </Button>
          </Group>
        )}
      </Card>

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {analyses.data ? `${analyses.data.total} result${analyses.data.total === 1 ? "" : "s"}` : " "}
          {selected.length > 0 && ` · ${selected.length} selected for comparison (max 4)`}
        </Text>
        {selected.length < 2 ? (
          <Tooltip label="Select at least two analyses" multiline={false}>
            <Button leftSection={<IconArrowsDiff size={16} />} disabled>
              Compare selected
            </Button>
          </Tooltip>
        ) : (
          <Button
            leftSection={<IconArrowsDiff size={16} />}
            component={Link}
            href={`/analyses/compare?ids=${selected.join(",")}`}
          >
            Compare selected
          </Button>
        )}
      </Group>

      {analyses.isPending && <LoadingBlock rows={5} height={48} />}
      {analyses.error && <ErrorBlock error={analyses.error} onRetry={() => analyses.refetch()} />}
      {analyses.data && analyses.data.total === 0 && (
        <EmptyState
          icon={<IconHistory size={26} />}
          title={hasFilters ? "No analyses match these filters" : "No analyses yet"}
          description={hasFilters ? "Try removing a filter or searching for something else." : "Run your first match to build a history."}
          action={
            hasFilters ? (
              <Button variant="light" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button component={Link} href="/analyses/new" leftSection={<IconTargetArrow size={16} />}>
                Match a resume
              </Button>
            )
          }
        />
      )}
      {analyses.data && analyses.data.total > 0 && (
        <Card p={0}>
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40}>
                    <VisuallyHidden>Select</VisuallyHidden>
                  </Table.Th>
                  <Table.Th>Job</Table.Th>
                  <Table.Th>Resume version</Table.Th>
                  <Table.Th>Score</Table.Th>
                  <Table.Th>Missing required</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {analyses.data.items.map((a) => (
                  <Table.Tr key={a.id}>
                    <Table.Td>
                      <Checkbox
                        checked={selected.includes(a.id)}
                        onChange={() => toggle(a.id)}
                        disabled={!selected.includes(a.id) && selected.length >= 4}
                        aria-label={`Select analysis for ${a.job.title}`}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Anchor component={Link} href={`/analyses/${a.id}`} size="sm" fw={500}>
                        {a.job.title}
                      </Anchor>
                      <Group gap={6}>
                        <Text size="xs" c="dimmed">
                          {a.job.company ?? "—"}
                        </Text>
                        <AnalysisStatusBadges analysis={a} />
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{a.resume.resume_title}</Text>
                      <Text size="xs" c="dimmed">
                        v{a.resume.version_number} · {a.resume.version_label}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ScoreBadgeText score={a.overall_score} />
                    </Table.Td>
                    <Table.Td>{a.missing_required_count}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDateTime(a.created_at)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label="Delete analysis" multiline={false}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label={`Delete analysis for ${a.job.title}`}
                          onClick={() =>
                            confirmDestructive({
                              title: "Delete this analysis?",
                              message: "It will be removed from your history permanently.",
                              onConfirm: () =>
                                remove.mutate(a.id, {
                                  onSuccess: () => {
                                    setSelected((s) => s.filter((x) => x !== a.id));
                                    notifySuccess("Analysis deleted.");
                                  },
                                  onError: (e) => notifyError(e),
                                }),
                            })
                          }
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
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
  );
}

export default function AnalysesPage() {
  return (
    <>
      <PageHeader
        title="Analysis history"
        description="Every saved comparison. Select two to four analyses to compare jobs for one resume, or resume versions for one job."
        actions={
          <Button component={Link} href="/analyses/new" leftSection={<IconTargetArrow size={16} />}>
            New analysis
          </Button>
        }
      />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <HistoryContent />
      </Suspense>
    </>
  );
}
