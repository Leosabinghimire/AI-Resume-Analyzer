"use client";

import { Button, SimpleGrid, Stack } from "@mantine/core";
import { IconFileText, IconUpload } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, ListPagination, LoadingBlock, PageHeader, QueryBoundary, SearchInput } from "@/components/ui";
import { PAGE_SIZE, useResumes } from "@/features/resumes/api";
import { RenameResumeModal } from "@/features/resumes/components/RenameResumeModal";
import { ResumeCard } from "@/features/resumes/components/ResumeCard";
import { useListParams } from "@/hooks/useListParams";
import type { Resume } from "@/types/api";

const uploadButton = (
  <Button component={Link} href="/resumes/upload" leftSection={<IconUpload size={16} />}>
    Upload resume
  </Button>
);

export default function ResumesPage() {
  const list = useListParams();
  const [renaming, setRenaming] = useState<Resume | null>(null);
  const resumes = useResumes(list.debouncedSearch, list.page);

  return (
    <>
      <PageHeader
        title="Resume library"
        description="Uploaded resumes and their versions. The original file and extracted text are never modified."
        actions={uploadButton}
      />
      <Stack gap="lg">
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search by title or file name" maw={420} />
        <QueryBoundary query={resumes} loading={<LoadingBlock rows={2} height={160} />}>
          {(page) =>
            page.total === 0 ? (
              <EmptyState
                icon={<IconFileText size={28} />}
                title={list.debouncedSearch ? "No resumes match your search" : "No resumes yet"}
                description={
                  list.debouncedSearch
                    ? "Try a different title or file name."
                    : "Upload a PDF or DOCX resume. Its text is extracted and organized into sections you can edit."
                }
                action={!list.debouncedSearch && uploadButton}
              />
            ) : (
              <Stack gap="lg">
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                  {page.items.map((r) => (
                    <ResumeCard key={r.id} resume={r} onRename={setRenaming} />
                  ))}
                </SimpleGrid>
                <ListPagination page={list.page} pageSize={PAGE_SIZE} total={page.total} onChange={list.setPage} />
              </Stack>
            )
          }
        </QueryBoundary>
      </Stack>
      {renaming && (
        <RenameResumeModal key={renaming.id} resumeId={renaming.id} currentTitle={renaming.title} opened onClose={() => setRenaming(null)} />
      )}
    </>
  );
}
