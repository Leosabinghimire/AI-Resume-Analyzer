"use client";

import { Alert, Anchor, Button, Grid, Group, Stack, Switch, Text } from "@mantine/core";
import { IconBriefcase, IconFileText, IconSettings, IconTargetArrow } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FormAlert, LoadingBlock, PageHeader, SectionCard } from "@/components/ui";
import { useRunAnalysis } from "@/features/analyses/api";
import { AIDisclosure } from "@/features/coaching/components/AIAccessNotice";
import { useAllJobs } from "@/features/jobs/api";
import { JobChecklist } from "@/features/jobs/components/JobChecklist";
import { useAllResumes } from "@/features/resumes/api";
import { ResumeVersionPicker } from "@/features/resumes/components/ResumePickers";
import { useSelection } from "@/hooks/useSelection";
import { MAX_COMPARE } from "@/lib/constants";

const MAX_JOBS = 10;

function MissingPrerequisites({ noResumes, noJobs }: { noResumes: boolean; noJobs: boolean }) {
  return (
    <Alert color="blue" title="A resume and a job description are needed">
      <Stack gap={4}>
        {noResumes && (
          <Text size="sm">
            <Anchor component={Link} href="/resumes/upload">
              Upload a resume
            </Anchor>{" "}
            to analyze.
          </Text>
        )}
        {noJobs && (
          <Text size="sm">
            <Anchor component={Link} href="/jobs/new">
              Save a job description
            </Anchor>{" "}
            to compare against.
          </Text>
        )}
      </Stack>
    </Alert>
  );
}

function NewAnalysisForm() {
  const router = useRouter();
  const params = useSearchParams();
  const resumes = useAllResumes();
  const jobs = useAllJobs();
  const run = useRunAnalysis();
  const [versionId, setVersionId] = useState<string | null>(params.get("version"));
  const selection = useSelection(MAX_JOBS, params.get("job") ? [params.get("job")!] : []);
  const [includeAI, setIncludeAI] = useState(true);

  if (resumes.isPending || jobs.isPending) return <LoadingBlock rows={3} />;
  const noResumes = !resumes.data?.items.length;
  const noJobs = !jobs.data?.items.length;
  if (noResumes || noJobs) return <MissingPrerequisites noResumes={noResumes} noJobs={noJobs} />;

  const count = selection.selected.length;
  const submit = () => {
    if (!versionId || count === 0) return;
    run.mutate(
      { resume_version_id: versionId, job_ids: selection.selected, include_ai_insights: includeAI },
      {
        onSuccess: (results) => {
          if (results.length === 1) router.push(`/analyses/${results[0]!.id}`);
          else if (results.length <= MAX_COMPARE) router.push(`/analyses/compare?ids=${results.map((r) => r.id).join(",")}`);
          else router.push(`/analyses?resume_version_id=${versionId}`);
        },
      },
    );
  };

  return (
    <Grid gutter="lg">
      <Grid.Col span={{ base: 12, md: 6 }}>
        <Stack gap="lg">
          <SectionCard title="1. Resume version" icon={<IconFileText size={18} />} description="The structured content that will be matched.">
            <ResumeVersionPicker value={versionId} onChange={setVersionId} initialResumeId={params.get("resume")} />
          </SectionCard>
          <SectionCard title="3. Options" icon={<IconSettings size={18} />}>
            <Stack gap="sm">
              <Switch
                checked={includeAI}
                onChange={(e) => setIncludeAI(e.currentTarget.checked)}
                label="Include AI insights"
                description="Adds a semantic interpretation (strengths, gaps, transferable skills). The score is always calculated deterministically."
              />
              {includeAI && <AIDisclosure />}
            </Stack>
          </SectionCard>
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <SectionCard title="2. Jobs" icon={<IconBriefcase size={18} />} description={`Select up to ${MAX_JOBS} saved jobs.`}>
          <JobChecklist
            jobs={jobs.data!.items}
            isSelected={selection.isSelected}
            onToggle={selection.toggle}
            isFull={selection.isFull}
            max={MAX_JOBS}
            selectedCount={count}
          />
        </SectionCard>
      </Grid.Col>
      <Grid.Col span={12}>
        <Stack gap="sm">
          <FormAlert error={run.error} title="Analysis failed">
            You can safely try again.
          </FormAlert>
          <Group justify="flex-end" gap="md">
            {run.isPending && includeAI && (
              <Text size="xs" c="dimmed">
                Generating AI insights can take up to a minute per job.
              </Text>
            )}
            <Button size="md" leftSection={<IconTargetArrow size={18} />} onClick={submit} loading={run.isPending} disabled={!versionId || count === 0}>
              {count > 1 ? `Analyze against ${count} jobs` : "Run analysis"}
            </Button>
          </Group>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

export default function NewAnalysisPage() {
  return (
    <>
      <PageHeader
        title="Match a resume"
        description="Compare one resume version with one or more saved job descriptions."
        breadcrumbs={[{ label: "Analysis history", href: "/analyses" }, { label: "New analysis" }]}
      />
      <Suspense fallback={<LoadingBlock rows={3} />}>
        <NewAnalysisForm />
      </Suspense>
    </>
  );
}
