"use client";

import {
  Alert,
  Anchor,
  Button,
  Card,
  Checkbox,
  Group,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconSearch, IconTargetArrow } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingBlock } from "@/components/common/QueryState";
import { useRunAnalysis } from "@/features/analyses/api";
import { AIDisclosure } from "@/features/coaching/components/AIAccessNotice";
import { useAllJobs } from "@/features/jobs/api";
import { useAllResumes, useResume } from "@/features/resumes/api";
import { errorMessage } from "@/lib/api-client";

const MAX_JOBS = 10;

function NewAnalysisForm() {
  const router = useRouter();
  const params = useSearchParams();
  const resumes = useAllResumes();
  const jobs = useAllJobs();
  const run = useRunAnalysis();

  const initialVersion = params.get("version");
  const requestedResume = params.get("resume");
  const initialResume =
    resumes.data?.items.find((r) => r.id === requestedResume)?.id ??
    resumes.data?.items.find((r) => r.latest_version?.id === initialVersion)?.id ??
    resumes.data?.items[0]?.id ??
    null;
  const [resumeId, setResumeId] = useState<string | null>(null);
  const activeResumeId = resumeId ?? initialResume;
  const resume = useResume(activeResumeId ?? "");
  const [versionId, setVersionId] = useState<string | null>(initialVersion);
  const [selected, setSelected] = useState<string[]>(params.get("job") ? [params.get("job")!] : []);
  const [filter, setFilter] = useState("");
  const [includeAI, setIncludeAI] = useState(true);

  const versions = activeResumeId && resume.data?.id === activeResumeId ? resume.data.versions : [];
  const activeVersion = versions.find((v) => v.id === versionId)?.id ?? versions[versions.length - 1]?.id ?? null;
  const filteredJobs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (jobs.data?.items ?? []).filter((j) => !q || `${j.title} ${j.company ?? ""}`.toLowerCase().includes(q));
  }, [jobs.data, filter]);

  if (resumes.isPending || jobs.isPending) return <LoadingBlock rows={3} />;
  const noResumes = !resumes.data?.items.length;
  const noJobs = !jobs.data?.items.length;

  if (noResumes || noJobs) {
    return (
      <Alert color="blue" variant="light" title="A resume and a job description are needed">
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

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_JOBS ? [...prev, id] : prev));

  const submit = () => {
    if (!activeVersion || selected.length === 0) return;
    run.mutate(
      { resume_version_id: activeVersion, job_ids: selected, include_ai_insights: includeAI },
      {
        onSuccess: (results) => {
          if (results.length === 1) router.push(`/analyses/${results[0]!.id}`);
          else if (results.length <= 4) router.push(`/analyses/compare?ids=${results.map((r) => r.id).join(",")}`);
          else router.push(`/analyses?resume_version_id=${activeVersion}`);
        },
      },
    );
  };

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      <Card>
        <Title order={4} mb="md">
          1. Choose a resume version
        </Title>
        <Stack gap="sm">
          <Select
            label="Resume"
            data={resumes.data!.items.map((r) => ({ value: r.id, label: r.title }))}
            value={activeResumeId}
            onChange={(v) => {
              setResumeId(v);
              setVersionId(null);
            }}
            allowDeselect={false}
            searchable
          />
          <Select
            label="Version"
            data={versions.map((v) => ({ value: v.id, label: `v${v.version_number} · ${v.label}` }))}
            value={activeVersion}
            onChange={setVersionId}
            allowDeselect={false}
            disabled={!versions.length}
            placeholder={resume.isFetching ? "Loading versions…" : undefined}
          />
        </Stack>
        <Title order={4} mt="xl" mb="sm">
          3. Options
        </Title>
        <Switch
          checked={includeAI}
          onChange={(e) => setIncludeAI(e.currentTarget.checked)}
          label="Include AI insights"
          description="Adds a semantic interpretation (strengths, gaps, transferable skills). The score is always calculated deterministically."
        />
        <div style={{ marginTop: 12 }}>{includeAI && <AIDisclosure />}</div>
      </Card>

      <Card>
        <Group justify="space-between" mb="sm">
          <Title order={4}>2. Select jobs</Title>
          <Text size="sm" c="dimmed">
            {selected.length}/{MAX_JOBS} selected
          </Text>
        </Group>
        <TextInput
          placeholder="Filter jobs"
          leftSection={<IconSearch size={16} />}
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          mb="sm"
          aria-label="Filter jobs"
        />
        <ScrollArea.Autosize mah={360}>
          <Stack gap="xs" role="group" aria-label="Jobs to analyze">
            {filteredJobs.map((j) => (
              <Checkbox
                key={j.id}
                checked={selected.includes(j.id)}
                onChange={() => toggle(j.id)}
                disabled={!selected.includes(j.id) && selected.length >= MAX_JOBS}
                label={j.title}
                description={j.company ?? undefined}
              />
            ))}
            {filteredJobs.length === 0 && (
              <Text size="sm" c="dimmed">
                No jobs match this filter.
              </Text>
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Card>

      <Stack style={{ gridColumn: "1 / -1" }} gap="sm">
        {run.error && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert" title="Analysis failed">
            {errorMessage(run.error)} You can safely try again.
          </Alert>
        )}
        <Group justify="flex-end">
          <Button
            size="md"
            leftSection={<IconTargetArrow size={18} />}
            onClick={submit}
            loading={run.isPending}
            disabled={!activeVersion || selected.length === 0}
          >
            {selected.length > 1 ? `Analyze against ${selected.length} jobs` : "Run analysis"}
          </Button>
        </Group>
        {run.isPending && includeAI && (
          <Text size="xs" c="dimmed" ta="right">
            Generating AI insights can take up to a minute per job.
          </Text>
        )}
      </Stack>
    </SimpleGrid>
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
