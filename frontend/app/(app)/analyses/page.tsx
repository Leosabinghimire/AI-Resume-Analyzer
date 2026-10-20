"use client";

import { Button, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconArrowsDiff, IconHistory, IconTargetArrow } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { EmptyState, ListPagination, LoadingBlock, PageHeader, QueryBoundary, SectionCard } from "@/components/ui";
import { useAnalyses } from "@/features/analyses/api";
import { AnalysisFiltersBar, type FilterState } from "@/features/analyses/components/AnalysisFiltersBar";
import { AnalysisHistoryTable } from "@/features/analyses/components/AnalysisHistoryTable";
import { useDebouncedValue } from "@mantine/hooks";
import { useSelection } from "@/hooks/useSelection";
import { MAX_COMPARE } from "@/lib/constants";
import type { AnalysisFilters } from "@/types/api";

const PAGE_SIZE = 20;
const newAnalysisButton = (
  <Button component={Link} href="/analyses/new" leftSection={<IconTargetArrow size={16} />}>
    New analysis
  </Button>
);

function HistoryContent() {
  const params = useSearchParams();
  const router = useRouter();
  const versionFilter = params.get("resume_version_id") ?? undefined;
  const emptyFilters: FilterState = { search: "", resumeId: null, jobId: null, minScore: "", sort: "newest" };
  const [filters, setFilters] = useState<FilterState>({ ...emptyFilters, jobId: params.get("job_id") });
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(filters.search.trim(), 300);
  const selection = useSelection(MAX_COMPARE);

  const query: AnalysisFilters = {
    q: debouncedSearch || undefined,
    resume_id: filters.resumeId ?? undefined,
    resume_version_id: versionFilter,
    job_id: filters.jobId ?? undefined,
    min_score: typeof filters.minScore === "number" ? filters.minScore : undefined,
    sort: filters.sort,
    page,
    page_size: PAGE_SIZE,
  };
  const analyses = useAnalyses(query);
  const hasFilters = Boolean(debouncedSearch || filters.resumeId || filters.jobId || filters.minScore !== "" || versionFilter);

  const update = (patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };
  const clear = () => {
    setFilters(emptyFilters);
    setPage(1);
    if (versionFilter) router.replace("/analyses");
  };

  return (
    <Stack gap="lg">
      <AnalysisFiltersBar value={filters} onChange={update} onClear={clear} hasFilters={hasFilters} scopedToVersion={Boolean(versionFilter)} />
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {analyses.data ? `${analyses.data.total} result${analyses.data.total === 1 ? "" : "s"}` : " "}
          {selection.selected.length > 0 && ` · ${selection.selected.length} selected for comparison (max ${MAX_COMPARE})`}
        </Text>
        {selection.selected.length < 2 ? (
          <Tooltip label="Select at least two analyses" multiline={false}>
            <Button leftSection={<IconArrowsDiff size={16} />} disabled>
              Compare selected
            </Button>
          </Tooltip>
        ) : (
          <Button component={Link} href={`/analyses/compare?ids=${selection.selected.join(",")}`} leftSection={<IconArrowsDiff size={16} />}>
            Compare selected
          </Button>
        )}
      </Group>
      <QueryBoundary query={analyses} loading={<LoadingBlock rows={5} height={52} />}>
        {(result) =>
          result.total === 0 ? (
            <EmptyState
              icon={<IconHistory size={28} />}
              title={hasFilters ? "No analyses match these filters" : "No analyses yet"}
              description={hasFilters ? "Try removing a filter or searching for something else." : "Run your first match to build a history."}
              action={
                hasFilters ? (
                  <Button variant="light" onClick={clear}>
                    Clear filters
                  </Button>
                ) : (
                  newAnalysisButton
                )
              }
            />
          ) : (
            <Stack gap="md">
              <SectionCard flush>
                <AnalysisHistoryTable
                  rows={result.items}
                  isSelected={selection.isSelected}
                  onToggle={selection.toggle}
                  selectionFull={selection.isFull}
                  onDeleted={selection.remove}
                />
              </SectionCard>
              <ListPagination page={page} pageSize={PAGE_SIZE} total={result.total} onChange={setPage} />
            </Stack>
          )
        }
      </QueryBoundary>
    </Stack>
  );
}

export default function AnalysesPage() {
  return (
    <>
      <PageHeader
        title="Analysis history"
        description="Every saved comparison. Select two to four analyses to compare jobs for one resume, or resume versions for one job."
        actions={newAnalysisButton}
      />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <HistoryContent />
      </Suspense>
    </>
  );
}
