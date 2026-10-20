"use client";

import { Badge, Group, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconArrowsDiff, IconDownload, IconEye, IconTrash, IconVersions } from "@tabler/icons-react";
import { useState } from "react";
import { VersionSourceBadge } from "@/components/domain/VersionSourceBadge";
import { DataTable, IconAction, LoadingBlock, SectionCard, type Column, ErrorBlock } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { confirmAction } from "@/lib/notify";
import type { ResumeVersionSummary } from "@/types/api";
import { exportPdfUrl, useDeleteVersion, useVersionComparison } from "../api";
import { VersionDiff } from "./VersionDiff";

interface Props {
  resumeId: string;
  versions: ResumeVersionSummary[];
  activeVersionId: string;
  onOpen: (versionId: string) => void;
}

function VersionCompare({ resumeId, versions }: { resumeId: string; versions: ResumeVersionSummary[] }) {
  const options = versions.map((v) => ({ value: v.id, label: `v${v.version_number} · ${v.label}` }));
  const [base, setBase] = useState<string | null>(versions[0]?.id ?? null);
  const [target, setTarget] = useState<string | null>(versions[versions.length - 1]?.id ?? null);
  const comparison = useVersionComparison(resumeId, base, target);

  return (
    <SectionCard
      title="Compare versions"
      description="See exactly what changed between the original and a revised version."
      icon={<IconArrowsDiff size={18} />}
    >
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select label="Base" data={options} value={base} onChange={setBase} allowDeselect={false} />
          <Select label="Compare with" data={options} value={target} onChange={setTarget} allowDeselect={false} />
        </SimpleGrid>
        {versions.length < 2 ? (
          <Text size="sm" c="dimmed">
            Save a new version from the editor to compare it with the original.
          </Text>
        ) : base === target ? (
          <Text size="sm" c="dimmed">
            Choose two different versions.
          </Text>
        ) : comparison.error ? (
          <ErrorBlock error={comparison.error} onRetry={() => comparison.refetch()} />
        ) : comparison.data ? (
          <VersionDiff comparison={comparison.data} />
        ) : (
          <LoadingBlock rows={2} />
        )}
      </Stack>
    </SectionCard>
  );
}

export function VersionsPanel({ resumeId, versions, activeVersionId, onOpen }: Props) {
  const remove = useDeleteVersion(resumeId);
  const onlyOne = versions.length === 1;

  const columns: Column<ResumeVersionSummary>[] = [
    {
      key: "version",
      header: "Version",
      render: (v) => (
        <Group gap="xs" wrap="nowrap">
          <Badge variant="default">v{v.version_number}</Badge>
          <Text size="sm" fw={600}>
            {v.label}
          </Text>
          {v.id === activeVersionId && (
            <Badge size="xs" variant="filled">
              Open
            </Badge>
          )}
        </Group>
      ),
    },
    { key: "source", header: "Source", render: (v) => <VersionSourceBadge source={v.source} /> },
    { key: "updated", header: "Last updated", render: (v) => <Text size="sm">{formatDateTime(v.updated_at)}</Text> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (v) => (
        <Group gap={4} justify="flex-end" wrap="nowrap">
          <IconAction label={`Open version ${v.version_number}`} tooltip="Open in editor" icon={<IconEye size={16} />} onClick={() => onOpen(v.id)} />
          <IconAction
            label={`Export version ${v.version_number} as PDF`}
            tooltip="Export PDF"
            icon={<IconDownload size={16} />}
            href={exportPdfUrl(resumeId, v.id)}
            external
          />
          <IconAction
            label={`Delete version ${v.version_number}`}
            tooltip={onlyOne ? "A resume needs at least one version" : "Delete version"}
            icon={<IconTrash size={16} />}
            color="red"
            disabled={onlyOne}
            onClick={() =>
              confirmAction({
                title: `Delete version ${v.version_number}?`,
                message: `"${v.label}" and any analyses or feedback created for it will be permanently deleted.`,
                run: () => remove.mutateAsync(v.id),
                successMessage: "Version deleted.",
                errorTitle: "Could not delete version",
                onSuccess: () => {
                  if (v.id === activeVersionId) onOpen(versions.find((x) => x.id !== v.id)!.id);
                },
              })
            }
          />
        </Group>
      ),
    },
  ];

  return (
    <Stack gap="lg">
      <SectionCard title="Versions" description="Every saved version of this resume." icon={<IconVersions size={18} />} flush>
        <DataTable
          columns={columns}
          rows={versions}
          rowKey={(v) => v.id}
          minWidth={600}
          isRowActive={(v) => v.id === activeVersionId}
        />
      </SectionCard>
      <VersionCompare resumeId={resumeId} versions={versions} />
    </Stack>
  );
}
