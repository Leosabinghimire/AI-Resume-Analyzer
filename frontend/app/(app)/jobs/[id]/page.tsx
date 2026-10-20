"use client";

import { Button, Modal, SimpleGrid, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconExternalLink, IconPencil, IconTargetArrow, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LoadingBlock, PageHeader, QueryBoundary } from "@/components/ui";
import { useDeleteJob, useJob, useUpdateJob } from "@/features/jobs/api";
import { JobAnalysesCard, JobDescriptionCard, JobRequirementsCard } from "@/features/jobs/components/JobDetailCards";
import { JobForm } from "@/features/jobs/components/JobForm";
import { JobSkillsEditor } from "@/features/jobs/components/JobSkillsEditor";
import { formatDate } from "@/lib/format";
import { confirmAction, notifySuccess } from "@/lib/notify";
import type { Job } from "@/types/api";

function JobDetailView({ job }: { job: Job }) {
  const router = useRouter();
  const update = useUpdateJob(job.id);
  const remove = useDeleteJob();
  const [editOpened, edit] = useDisclosure(false);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Job descriptions", href: "/jobs" }, { label: job.title }]}
        title={job.title}
        description={`${job.company ?? "Company not specified"} · added ${formatDate(job.created_at)}`}
        actions={
          <>
            {job.url && (
              <Button component="a" href={job.url} target="_blank" rel="noopener noreferrer" variant="default" leftSection={<IconExternalLink size={16} />}>
                Posting
              </Button>
            )}
            <Button variant="default" leftSection={<IconPencil size={16} />} onClick={edit.open}>
              Edit
            </Button>
            <Button
              variant="default"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() =>
                confirmAction({
                  title: "Delete job description?",
                  message: "This job and all of its analyses will be permanently deleted.",
                  run: () => remove.mutateAsync(job.id),
                  successMessage: "Job deleted.",
                  onSuccess: () => router.replace("/jobs"),
                })
              }
            >
              Delete
            </Button>
            <Button component={Link} href={`/analyses/new?job=${job.id}`} leftSection={<IconTargetArrow size={16} />}>
              Match a resume
            </Button>
          </>
        }
      />
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Stack gap="lg">
          <JobSkillsEditor key={job.updated_at} job={job} />
          <JobRequirementsCard job={job} />
        </Stack>
        <Stack gap="lg">
          <JobAnalysesCard jobId={job.id} />
          <JobDescriptionCard description={job.description} />
        </Stack>
      </SimpleGrid>

      <Modal opened={editOpened} onClose={edit.close} title="Edit job description" size="xl">
        <JobForm
          defaultValues={{ title: job.title, company: job.company ?? "", url: job.url ?? "", description: job.description }}
          submitLabel="Save changes"
          pending={update.isPending}
          error={update.error}
          onCancel={edit.close}
          onSubmit={(input) =>
            update.mutate(input, {
              onSuccess: () => {
                notifySuccess(
                  job.skills_customized ? "Job updated. Your manually edited skills were kept." : "Job updated and requirements re-extracted.",
                );
                edit.close();
              },
            })
          }
        />
      </Modal>
    </>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const job = useJob(id);
  return (
    <QueryBoundary query={job} loading={<LoadingBlock rows={4} />}>
      {(j) => <JobDetailView job={j} />}
    </QueryBoundary>
  );
}
