"use client";

import { ActionIcon, Badge, Button, Card, Group, Menu, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconDots, IconDownload, IconFileTypePdf, IconFileTypeDocx, IconPencil, IconTargetArrow, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { VersionSourceBadge } from "@/components/domain/VersionSourceBadge";
import { formatFileSize, formatRelative } from "@/lib/format";
import { confirmAction } from "@/lib/notify";
import type { Resume } from "@/types/api";
import { originalFileUrl, useDeleteResume } from "../api";

export function ResumeCard({ resume, onRename }: { resume: Resume; onRename: (r: Resume) => void }) {
  const remove = useDeleteResume();
  const isPdf = resume.content_type.includes("pdf");
  const FileIcon = isPdf ? IconFileTypePdf : IconFileTypeDocx;

  return (
    <Card padding="lg">
      <Stack gap="md" h="100%" justify="space-between">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
            <ThemeIcon size={44} radius="md" variant="light" color={isPdf ? "red" : "blue"}>
              <FileIcon size={24} stroke={1.6} />
            </ThemeIcon>
            <div style={{ minWidth: 0 }}>
              <Text component={Link} href={`/resumes/${resume.id}`} fw={650} truncate display="block">
                {resume.title}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {resume.original_filename} · {formatFileSize(resume.file_size)}
              </Text>
            </div>
          </Group>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={`Actions for ${resume.title}`}>
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onRename(resume)}>
                Rename
              </Menu.Item>
              <Menu.Item leftSection={<IconDownload size={16} />} component="a" href={originalFileUrl(resume.id)}>
                Download original
              </Menu.Item>
              <Menu.Item leftSection={<IconTargetArrow size={16} />} component={Link} href={`/analyses/new?resume=${resume.id}`}>
                Match against jobs
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() =>
                  confirmAction({
                    title: "Delete resume?",
                    message: `"${resume.title}", its uploaded file, all ${resume.version_count} version(s) and related analyses will be permanently deleted.`,
                    run: () => remove.mutateAsync(resume.id),
                    successMessage: "Resume deleted.",
                    errorTitle: "Could not delete resume",
                  })
                }
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Group gap={6}>
          <Badge variant="default">
            {resume.version_count} version{resume.version_count === 1 ? "" : "s"}
          </Badge>
          {resume.latest_version && <VersionSourceBadge source={resume.latest_version.source} />}
        </Group>

        <Group justify="space-between" pt="sm" style={{ borderTop: "1px solid var(--app-border)" }}>
          <Text size="xs" c="dimmed">
            Updated {formatRelative(resume.updated_at)}
          </Text>
          <Button component={Link} href={`/resumes/${resume.id}`} size="compact-sm" variant="light">
            Open
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
