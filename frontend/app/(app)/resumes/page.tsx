"use client";

import { ActionIcon, Badge, Button, Card, Group, Menu, Pagination, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
  IconDots,
  IconDownload,
  IconFileText,
  IconPencil,
  IconSearch,
  IconTargetArrow,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { originalFileUrl, PAGE_SIZE, useDeleteResume, useResumes } from "@/features/resumes/api";
import { RenameResumeModal } from "@/features/resumes/components/RenameResumeModal";
import { formatDate, formatFileSize } from "@/lib/format";
import { confirmDestructive, notifyError, notifySuccess } from "@/lib/notify";
import type { Resume } from "@/types/api";

function ResumeCard({ resume, onRename }: { resume: Resume; onRename: (r: Resume) => void }) {
  const remove = useDeleteResume();
  const confirmDelete = () =>
    confirmDestructive({
      title: "Delete resume?",
      message: `"${resume.title}", its uploaded file, all ${resume.version_count} version(s) and related analyses will be permanently deleted.`,
      onConfirm: () =>
        remove.mutate(resume.id, {
          onSuccess: () => notifySuccess("Resume deleted."),
          onError: (e) => notifyError(e, "Could not delete resume"),
        }),
    });

  return (
    <Card>
      <Group justify="space-between" wrap="nowrap" align="flex-start" mb="xs">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <IconFileText size={28} stroke={1.4} aria-hidden />
          <div style={{ minWidth: 0 }}>
            <Text component={Link} href={`/resumes/${resume.id}`} fw={600} truncate display="block">
              {resume.title}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {resume.original_filename}
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
            <Menu.Item
              leftSection={<IconTargetArrow size={16} />}
              component={Link}
              href={`/analyses/new?resume=${resume.id}`}
            >
              Match against jobs
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={confirmDelete}>
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      <Group gap={6} mb="md">
        <Badge variant="light" tt="none">
          {resume.version_count} version{resume.version_count === 1 ? "" : "s"}
        </Badge>
        <Badge variant="light" color="gray" tt="none">
          {resume.content_type.includes("pdf") ? "PDF" : "DOCX"} · {formatFileSize(resume.file_size)}
        </Badge>
      </Group>
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          Updated {formatDate(resume.updated_at)}
        </Text>
        <Button component={Link} href={`/resumes/${resume.id}`} size="xs" variant="light">
          Open
        </Button>
      </Group>
    </Card>
  );
}

export default function ResumesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debounced] = useDebouncedValue(search, 300);
  const [renaming, setRenaming] = useState<Resume | null>(null);
  const resumes = useResumes(debounced, page);
  const totalPages = resumes.data ? Math.max(1, Math.ceil(resumes.data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        title="Resume library"
        description="Uploaded resumes and their versions. The original file and extracted text are never modified."
        actions={
          <Button component={Link} href="/resumes/upload" leftSection={<IconUpload size={16} />}>
            Upload resume
          </Button>
        }
      />
      <Stack gap="md">
        <TextInput
          placeholder="Search by title or file name"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
          aria-label="Search resumes"
          maw={420}
        />
        {resumes.isPending && <LoadingBlock rows={2} height={140} />}
        {resumes.error && <ErrorBlock error={resumes.error} onRetry={() => resumes.refetch()} />}
        {resumes.data && resumes.data.total === 0 && (
          <EmptyState
            icon={<IconFileText size={26} />}
            title={debounced ? "No resumes match your search" : "No resumes yet"}
            description={
              debounced
                ? "Try a different title or file name."
                : "Upload a PDF or DOCX resume. Its text is extracted and organized into sections you can edit."
            }
            action={
              !debounced && (
                <Button component={Link} href="/resumes/upload" leftSection={<IconUpload size={16} />}>
                  Upload your first resume
                </Button>
              )
            }
          />
        )}
        {resumes.data && resumes.data.total > 0 && (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {resumes.data.items.map((r) => (
                <ResumeCard key={r.id} resume={r} onRename={setRenaming} />
              ))}
            </SimpleGrid>
            {totalPages > 1 && <Pagination value={page} onChange={setPage} total={totalPages} />}
          </>
        )}
      </Stack>
      {renaming && (
        <RenameResumeModal
          key={renaming.id}
          resumeId={renaming.id}
          currentTitle={renaming.title}
          opened
          onClose={() => setRenaming(null)}
        />
      )}
    </>
  );
}
