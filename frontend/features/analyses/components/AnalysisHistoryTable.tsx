"use client";

import { Anchor, Checkbox, Group, Text, VisuallyHidden } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { ScoreBadge } from "@/components/domain/ScoreRing";
import { DataTable, IconAction, type Column } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { confirmAction } from "@/lib/notify";
import type { AnalysisSummary } from "@/types/api";
import { useDeleteAnalysis } from "../api";
import { AnalysisStatusBadges } from "./AnalysisStatusBadges";

interface Props {
  rows: AnalysisSummary[];
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  selectionFull: boolean;
  onDeleted: (id: string) => void;
}

export function AnalysisHistoryTable({ rows, isSelected, onToggle, selectionFull, onDeleted }: Props) {
  const remove = useDeleteAnalysis();
  const columns: Column<AnalysisSummary>[] = [
    {
      key: "select",
      header: <VisuallyHidden>Select</VisuallyHidden>,
      width: 44,
      render: (a) => (
        <Checkbox
          checked={isSelected(a.id)}
          onChange={() => onToggle(a.id)}
          disabled={!isSelected(a.id) && selectionFull}
          aria-label={`Select analysis for ${a.job.title}`}
        />
      ),
    },
    {
      key: "job",
      header: "Job",
      render: (a) => (
        <div>
          <Anchor component={Link} href={`/analyses/${a.id}`} size="sm" fw={600}>
            {a.job.title}
          </Anchor>
          <Group gap={6}>
            <Text size="xs" c="dimmed">
              {a.job.company ?? "—"}
            </Text>
            <AnalysisStatusBadges analysis={a} />
          </Group>
        </div>
      ),
    },
    {
      key: "resume",
      header: "Resume version",
      render: (a) => (
        <div>
          <Text size="sm">{a.resume.resume_title}</Text>
          <Text size="xs" c="dimmed">
            v{a.resume.version_number} · {a.resume.version_label}
          </Text>
        </div>
      ),
    },
    { key: "score", header: "Score", width: 90, render: (a) => <ScoreBadge score={a.overall_score} /> },
    { key: "missing", header: "Missing required", width: 140, render: (a) => <Text size="sm">{a.missing_required_count}</Text> },
    { key: "date", header: "Date", width: 190, render: (a) => <Text size="sm">{formatDateTime(a.created_at)}</Text> },
    {
      key: "actions",
      header: "",
      width: 56,
      align: "right",
      render: (a) => (
        <IconAction
          label={`Delete analysis for ${a.job.title}`}
          tooltip="Delete analysis"
          color="red"
          icon={<IconTrash size={16} />}
          onClick={() =>
            confirmAction({
              title: "Delete this analysis?",
              message: "It will be removed from your history permanently.",
              run: () => remove.mutateAsync(a.id),
              successMessage: "Analysis deleted.",
              onSuccess: () => onDeleted(a.id),
            })
          }
        />
      ),
    },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} minWidth={860} isRowActive={(a) => isSelected(a.id)} caption="Analysis history" />;
}
