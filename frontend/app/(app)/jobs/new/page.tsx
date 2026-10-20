"use client";

import { Card } from "@mantine/core";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { useCreateJob } from "@/features/jobs/api";
import { JobForm } from "@/features/jobs/components/JobForm";
import { notifySuccess } from "@/lib/notify";

export default function NewJobPage() {
  const router = useRouter();
  const create = useCreateJob();
  return (
    <>
      <PageHeader
        title="Add a job description"
        description="Required and preferred qualifications, responsibilities, years of experience and keywords are extracted automatically. You can adjust the skills afterwards."
        breadcrumbs={[{ label: "Job descriptions", href: "/jobs" }, { label: "New" }]}
      />
      <Card maw={900}>
        <JobForm
          submitLabel="Save job"
          pending={create.isPending}
          error={create.error}
          onCancel={() => router.push("/jobs")}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (job) => {
                notifySuccess("Job saved. Review the extracted requirements.");
                router.push(`/jobs/${job.id}`);
              },
            })
          }
        />
      </Card>
    </>
  );
}
