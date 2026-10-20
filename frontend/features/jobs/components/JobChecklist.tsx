"use client";

import { Checkbox, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/ui";
import type { JobSummary } from "@/types/api";

interface Props {
  jobs: JobSummary[];
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  isFull: boolean;
  max: number;
  selectedCount: number;
}

/** Filterable, bounded multi-select list of jobs. */
export function JobChecklist({ jobs, isSelected, onToggle, isFull, max, selectedCount }: Props) {
  const [filter, setFilter] = useState("");
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return jobs.filter((j) => !q || `${j.title} ${j.company ?? ""}`.toLowerCase().includes(q));
  }, [jobs, filter]);

  return (
    <Stack gap="sm">
      <Group justify="space-between" gap="sm">
        <SearchInput value={filter} onChange={setFilter} placeholder="Filter jobs" style={{ flex: 1 }} />
        <Text size="sm" c="dimmed">
          {selectedCount}/{max} selected
        </Text>
      </Group>
      <ScrollArea.Autosize mah={360} type="auto">
        <Stack gap={6} role="group" aria-label="Jobs to analyze">
          {visible.map((j) => (
            <Checkbox.Card
              key={j.id}
              checked={isSelected(j.id)}
              onClick={() => (isSelected(j.id) || !isFull) && onToggle(j.id)}
              disabled={!isSelected(j.id) && isFull}
              radius="md"
              p="sm"
              withBorder
              aria-label={j.title}
              style={{ borderColor: isSelected(j.id) ? "var(--mantine-primary-color-filled)" : "var(--app-border)" }}
            >
              <Group wrap="nowrap" align="flex-start" gap="sm">
                <Checkbox.Indicator />
                <div>
                  <Text size="sm" fw={600}>
                    {j.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {j.company ?? "Company not specified"} · {j.required_skills.length} required skills
                  </Text>
                </div>
              </Group>
            </Checkbox.Card>
          ))}
          {visible.length === 0 && (
            <Text size="sm" c="dimmed">
              No jobs match this filter.
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
