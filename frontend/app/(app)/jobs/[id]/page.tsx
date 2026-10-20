"use client";

import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  List,
  Modal,
  SimpleGrid,
  Spoiler,
  Stack,
  TagsInput,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconExternalLink, IconPencil, IconRefresh, IconTargetArrow, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { ScoreBadgeText } from "@/components/score/ScoreRing";
import { SkillList } from "@/components/skills/SkillBadges";
import { useAnalyses } from "@/features/analyses/api";
import { useDeleteJob, useJob, useResetJobSkills, useUpdateJob } from "@/features/jobs/api";
import { JobForm } from "@/features/jobs/components/JobForm";
import { formatDate } from "@/lib/format";
import { confirmDestructive, notifyError, notifySuccess } from "@/lib/notify";
import type { Job } from "@/types/api";

function SkillsEditor({ job }: { job: Job }) {
  const update = useUpdateJob(job.id);
  const reset = useResetJobSkills(job.id);
  const [required, setRequired] = useState(job.required_skills);
  const [preferred, setPreferred] = useState(job.preferred_skills);
  const changed =
    required.join("|") !== job.required_skills.join("|") || preferred.join("|") !== job.preferred_skills.join("|");

  return (
    <Card>
      <Group justify="space-between" mb="xs">
        <Title order={4}>Skills used for matching</Title>
        {job.skills_customized && (
          <Badge variant="light" color="violet" tt="none">
            Edited manually
          </Badge>
        )}
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Extracted automatically from the description. Add or remove skills if extraction missed something; matching
        uses these lists.
      </Text>
      <Stack gap="sm">
        <TagsInput label="Required skills" value={required} onChange={setRequired} maxTags={80} clearable />
        <TagsInput label="Preferred skills" value={preferred} onChange={setPreferred} maxTags={80} clearable />
        <Group justify="flex-end">
          {job.skills_customized && (
            <Button
              variant="subtle"
              leftSection={<IconRefresh size={16} />}
              loading={reset.isPending}
              onClick={() =>
                reset.mutate(undefined, {
                  onSuccess: (j) => {
                    setRequired(j.required_skills);
                    setPreferred(j.preferred_skills);
                    notifySuccess("Skills re-extracted from the description.");
                  },
                  onError: (e) => notifyError(e),
                })
              }
            >
              Reset to extracted
            </Button>
          )}
          <Button
            disabled={!changed}
            loading={update.isPending}
            onClick={() =>
              update.mutate(
                { required_skills: required, preferred_skills: preferred },
                {
                  onSuccess: (j) => {
                    setRequired(j.required_skills);
                    setPreferred(j.preferred_skills);
                    notifySuccess("Skills updated. Re-run analyses to apply them.");
                  },
                  onError: (e) => notifyError(e, "Could not save skills"),
                },
              )
            }
          >
            Save skills
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const job = useJob(id);
  const analyses = useAnalyses({ job_id: id, page_size: 10 });
  const update = useUpdateJob(id);
  const remove = useDeleteJob();
  const [editOpened, edit] = useDisclosure(false);

  if (job.isPending) return <LoadingBlock rows={4} />;
  if (job.error) return <ErrorBlock error={job.error} onRetry={() => job.refetch()} />;
  const j = job.data;
  const p = j.parsed;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Job descriptions", href: "/jobs" }, { label: j.title }]}
        title={j.title}
        description={`${j.company ?? "Company not specified"} · added ${formatDate(j.created_at)}`}
        actions={
          <>
            {j.url && (
              <Button component="a" href={j.url} target="_blank" rel="noopener noreferrer" variant="default" leftSection={<IconExternalLink size={16} />}>
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
                confirmDestructive({
                  title: "Delete job description?",
                  message: "This job and all of its analyses will be permanently deleted.",
                  onConfirm: () =>
                    remove.mutate(id, {
                      onSuccess: () => {
                        notifySuccess("Job deleted.");
                        router.replace("/jobs");
                      },
                      onError: (e) => notifyError(e),
                    }),
                })
              }
            >
              Delete
            </Button>
            <Button component={Link} href={`/analyses/new?job=${id}`} leftSection={<IconTargetArrow size={16} />}>
              Match a resume
            </Button>
          </>
        }
      />

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Stack gap="lg">
          <SkillsEditor key={j.updated_at} job={j} />
          <Card>
            <Title order={4} mb="sm">
              Extracted requirements
            </Title>
            <SimpleGrid cols={2} spacing="sm" mb="md">
              <div>
                <Text size="xs" c="dimmed">
                  Minimum experience
                </Text>
                <Text fw={600}>{p.min_years_experience ? `${p.min_years_experience}+ years` : "Not stated"}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Education
                </Text>
                <Text fw={600} tt="capitalize">
                  {p.education_level ? `${p.education_level}${p.education_equivalent_accepted ? " or equivalent" : ""}` : "Not stated"}
                </Text>
              </div>
            </SimpleGrid>
            {p.certifications.length > 0 && (
              <>
                <Text size="sm" fw={500} mb={4}>
                  Certifications mentioned
                </Text>
                <SkillList skills={p.certifications} color="grape" />
              </>
            )}
            <Text size="sm" fw={500} mt="md" mb={4}>
              Responsibilities ({p.responsibilities.length})
            </Text>
            {p.responsibilities.length ? (
              <List size="sm" spacing={4}>
                {p.responsibilities.map((r) => (
                  <List.Item key={r}>{r}</List.Item>
                ))}
              </List>
            ) : (
              <Text size="sm" c="dimmed">
                No responsibilities section detected. Add a heading such as &quot;Responsibilities&quot; to the description for
                better responsibility matching.
              </Text>
            )}
            {p.preferred_qualifications.length > 0 && (
              <>
                <Text size="sm" fw={500} mt="md" mb={4}>
                  Preferred qualifications
                </Text>
                <List size="sm" spacing={4}>
                  {p.preferred_qualifications.map((r) => (
                    <List.Item key={r}>{r}</List.Item>
                  ))}
                </List>
              </>
            )}
            <Text size="sm" fw={500} mt="md" mb={4}>
              Keywords
            </Text>
            <SkillList skills={p.keywords} />
          </Card>
        </Stack>
        <Stack gap="lg">
          <Card>
            <Group justify="space-between" mb="sm">
              <Title order={4}>Analyses for this job</Title>
              {analyses.data && analyses.data.total > 0 && (
                <Anchor component={Link} href={`/analyses?job_id=${id}`} size="sm">
                  View all ({analyses.data.total})
                </Anchor>
              )}
            </Group>
            {analyses.data?.items.length ? (
              <Stack gap="xs">
                {analyses.data.items.map((a) => (
                  <Group key={a.id} justify="space-between" wrap="nowrap">
                    <div>
                      <Anchor component={Link} href={`/analyses/${a.id}`} size="sm" fw={500}>
                        {a.resume.resume_title} · v{a.resume.version_number}
                      </Anchor>
                      <Text size="xs" c="dimmed">
                        {formatDate(a.created_at)}
                      </Text>
                    </div>
                    <ScoreBadgeText score={a.overall_score} />
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                No analyses yet. Match a resume against this job to see your score.
              </Text>
            )}
          </Card>
          <Card>
            <Title order={4} mb="sm">
              Description
            </Title>
            <Spoiler maxHeight={320} showLabel="Show full description" hideLabel="Show less">
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {j.description}
              </Text>
            </Spoiler>
          </Card>
        </Stack>
      </SimpleGrid>

      <Modal opened={editOpened} onClose={edit.close} title="Edit job description" size="xl">
        <JobForm
          defaultValues={{ title: j.title, company: j.company ?? "", url: j.url ?? "", description: j.description }}
          submitLabel="Save changes"
          pending={update.isPending}
          error={update.error}
          onCancel={edit.close}
          onSubmit={(input) =>
            update.mutate(input, {
              onSuccess: () => {
                notifySuccess(
                  j.skills_customized
                    ? "Job updated. Your manually edited skills were kept."
                    : "Job updated and requirements re-extracted.",
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
