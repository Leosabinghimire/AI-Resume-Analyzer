"use client";

import { ActionIcon, Badge, Card, Group, Select, SimpleGrid, Stack, Table, Text, Title, Tooltip } from "@mantine/core";
import { IconDownload, IconEye, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { formatDateTime, VERSION_SOURCE_LABELS } from "@/lib/format";
import { confirmDestructive, notifyError, notifySuccess } from "@/lib/notify";
import type { ResumeVersionSummary } from "@/types/api";
import { exportPdfUrl, useDeleteVersion, useVersionComparison } from "../api";
import { VersionDiff } from "./VersionDiff";

interface Props {
  resumeId: string;
  versions: ResumeVersionSummary[];
  activeVersionId: string;
  onOpen: (versionId: string) => void;
}

export function VersionsPanel({ resumeId, versions, activeVersionId, onOpen }: Props) {
  const remove = useDeleteVersion(resumeId);
  const options = versions.map((v) => ({ value: v.id, label: `v${v.version_number} · ${v.label}` }));
  const [base, setBase] = useState<string | null>(versions[0]?.id ?? null);
  const [target, setTarget] = useState<string | null>(versions[versions.length - 1]?.id ?? null);
  const comparison = useVersionComparison(resumeId, base, target);

  const confirmDelete = (v: ResumeVersionSummary) =>
    confirmDestructive({
      title: `Delete version ${v.version_number}?`,
      message: `"${v.label}" and any analyses or feedback created for it will be permanently deleted.`,
      onConfirm: () =>
        remove.mutate(v.id, {
          onSuccess: () => {
            notifySuccess("Version deleted.");
            if (v.id === activeVersionId) onOpen(versions.find((x) => x.id !== v.id)!.id);
          },
          onError: (e) => notifyError(e, "Could not delete version"),
        }),
    });

  return (
    <Stack gap="lg">
      <Card p={0}>
        <Table.ScrollContainer minWidth={560}>
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Version</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th>Last updated</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {versions.map((v) => (
                <Table.Tr key={v.id} bg={v.id === activeVersionId ? "var(--mantine-color-default-hover)" : undefined}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      v{v.version_number} · {v.label}
                    </Text>
                    {v.id === activeVersionId && (
                      <Text size="xs" c="dimmed">
                        Open in editor
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={v.source === "ai_assisted" ? "violet" : "gray"} tt="none">
                      {VERSION_SOURCE_LABELS[v.source]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDateTime(v.updated_at)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Tooltip label="Open in editor" multiline={false}>
                        <ActionIcon variant="subtle" onClick={() => onOpen(v.id)} aria-label={`Open version ${v.version_number}`}>
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Export PDF" multiline={false}>
                        <ActionIcon
                          variant="subtle"
                          component="a"
                          href={exportPdfUrl(resumeId, v.id)}
                          aria-label={`Export version ${v.version_number} as PDF`}
                        >
                          <IconDownload size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={versions.length === 1 ? "A resume needs at least one version" : "Delete version"} multiline={false}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          disabled={versions.length === 1}
                          onClick={() => confirmDelete(v)}
                          aria-label={`Delete version ${v.version_number}`}
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

      <div>
        <Title order={4} mb={4}>
          Compare versions
        </Title>
        <Text size="sm" c="dimmed" mb="sm">
          See exactly what changed between the original and a revised version.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mb="md">
          <Select label="Base" data={options} value={base} onChange={setBase} allowDeselect={false} />
          <Select label="Compare with" data={options} value={target} onChange={setTarget} allowDeselect={false} />
        </SimpleGrid>
        {versions.length < 2 && (
          <Text size="sm" c="dimmed">
            Save a new version from the editor to compare it with the original.
          </Text>
        )}
        {base === target && versions.length > 1 && (
          <Text size="sm" c="dimmed">
            Choose two different versions.
          </Text>
        )}
        {comparison.isFetching && !comparison.data && <LoadingBlock rows={2} />}
        {comparison.error && <ErrorBlock error={comparison.error} onRetry={() => comparison.refetch()} />}
        {comparison.data && base !== target && <VersionDiff comparison={comparison.data} />}
      </div>
    </Stack>
  );
}
