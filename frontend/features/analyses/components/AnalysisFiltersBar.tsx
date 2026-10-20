"use client";

import { Button, Group, NumberInput, Select, SimpleGrid, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { SearchInput, SectionCard } from "@/components/ui";
import { JobSelect } from "@/features/jobs/components/JobSelect";
import { ResumeSelect } from "@/features/resumes/components/ResumePickers";
import type { AnalysisFilters } from "@/types/api";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "score_desc", label: "Highest score" },
  { value: "score_asc", label: "Lowest score" },
];

export interface FilterState {
  search: string;
  resumeId: string | null;
  jobId: string | null;
  minScore: number | string;
  sort: NonNullable<AnalysisFilters["sort"]>;
}

interface Props {
  value: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
  hasFilters: boolean;
  scopedToVersion: boolean;
}

export function AnalysisFiltersBar({ value, onChange, onClear, hasFilters, scopedToVersion }: Props) {
  return (
    <SectionCard>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="sm">
        <SearchInput label="Search" placeholder="Job, company or resume" value={value.search} onChange={(search) => onChange({ search })} />
        <ResumeSelect placeholder="All resumes" value={value.resumeId} onChange={(resumeId) => onChange({ resumeId })} clearable />
        <JobSelect placeholder="All jobs" value={value.jobId} onChange={(jobId) => onChange({ jobId })} clearable />
        <NumberInput
          label="Minimum score"
          placeholder="0–100"
          min={0}
          max={100}
          value={value.minScore}
          onChange={(minScore) => onChange({ minScore })}
        />
        <Select
          label="Sort"
          data={SORT_OPTIONS}
          value={value.sort}
          onChange={(sort) => onChange({ sort: (sort ?? "newest") as FilterState["sort"] })}
          allowDeselect={false}
        />
      </SimpleGrid>
      {hasFilters && (
        <Group mt="sm" gap="xs">
          {scopedToVersion && (
            <Text size="xs" c="dimmed">
              Showing one resume version.
            </Text>
          )}
          <Button size="xs" variant="subtle" leftSection={<IconX size={14} />} onClick={onClear}>
            Clear filters
          </Button>
        </Group>
      )}
    </SectionCard>
  );
}
