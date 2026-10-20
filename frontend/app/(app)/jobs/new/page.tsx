"use client";

import { Grid } from "@mantine/core";
import { IconBulb } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { BulletList, PageHeader, SectionCard } from "@/components/ui";
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
        description="Required and preferred qualifications, responsibilities, years of experience and keywords are extracted automatically."
        breadcrumbs={[{ label: "Job descriptions", href: "/jobs" }, { label: "New" }]}
      />
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <SectionCard>
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
          </SectionCard>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <SectionCard title="Better extraction" icon={<IconBulb size={18} />}>
            <BulletList
              items={[
                "Paste the complete posting, not just a summary.",
                "Keep headings such as Responsibilities, Requirements and Nice to have.",
                "Lines that say “a plus” or “preferred” are treated as preferred skills.",
                "You can edit the extracted skills on the next page.",
              ]}
            />
          </SectionCard>
        </Grid.Col>
      </Grid>
    </>
  );
}
