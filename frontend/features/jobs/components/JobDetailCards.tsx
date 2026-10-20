"use client";

import { Anchor, Group, SimpleGrid, Spoiler, Stack, Text } from "@mantine/core";
import { IconFileDescription, IconHistory, IconListCheck } from "@tabler/icons-react";
import Link from "next/link";
import { ScoreBadge } from "@/components/domain/ScoreRing";
import { SkillList } from "@/components/domain/SkillBadges";
import { BulletList, MetricTile, SectionCard } from "@/components/ui";
import { useAnalyses } from "@/features/analyses/api";
import { formatDate } from "@/lib/format";
import type { Job } from "@/types/api";

function SubHeading({ children }: { children: string }) {
  return (
    <Text size="sm" fw={600} mb={6}>
      {children}
    </Text>
  );
}

export function JobRequirementsCard({ job }: { job: Job }) {
  const p = job.parsed;
  const education = p.education_level
    ? `${p.education_level[0]!.toUpperCase()}${p.education_level.slice(1)}${p.education_equivalent_accepted ? " or equivalent" : ""}`
    : "Not stated";
  return (
    <SectionCard title="Extracted requirements" icon={<IconListCheck size={18} />}>
      <Stack gap="lg">
        <SimpleGrid cols={2} spacing="sm">
          <MetricTile label="Minimum experience" value={p.min_years_experience ? `${p.min_years_experience}+ years` : "Not stated"} />
          <MetricTile label="Education" value={education} />
        </SimpleGrid>
        {p.certifications.length > 0 && (
          <div>
            <SubHeading>Certifications mentioned</SubHeading>
            <SkillList skills={p.certifications} color="grape" />
          </div>
        )}
        <div>
          <SubHeading>{`Responsibilities (${p.responsibilities.length})`}</SubHeading>
          <BulletList
            items={p.responsibilities}
            empty="No responsibilities section detected. Add a heading such as “Responsibilities” to the description for better matching."
          />
        </div>
        {p.preferred_qualifications.length > 0 && (
          <div>
            <SubHeading>Preferred qualifications</SubHeading>
            <BulletList items={p.preferred_qualifications} />
          </div>
        )}
        <div>
          <SubHeading>Keywords</SubHeading>
          <SkillList skills={p.keywords} />
        </div>
      </Stack>
    </SectionCard>
  );
}

export function JobAnalysesCard({ jobId }: { jobId: string }) {
  const analyses = useAnalyses({ job_id: jobId, page_size: 10 });
  const items = analyses.data?.items ?? [];
  return (
    <SectionCard
      title="Analyses for this job"
      icon={<IconHistory size={18} />}
      actions={
        analyses.data && analyses.data.total > 0 && (
          <Anchor component={Link} href={`/analyses?job_id=${jobId}`} size="sm" fw={500}>
            View all ({analyses.data.total})
          </Anchor>
        )
      }
    >
      {items.length ? (
        <Stack gap={4}>
          {items.map((a) => (
            <Group key={a.id} justify="space-between" wrap="nowrap" py={6} style={{ borderBottom: "1px solid var(--app-border)" }}>
              <div>
                <Anchor component={Link} href={`/analyses/${a.id}`} size="sm" fw={600}>
                  {a.resume.resume_title} · v{a.resume.version_number}
                </Anchor>
                <Text size="xs" c="dimmed">
                  {formatDate(a.created_at)}
                </Text>
              </div>
              <ScoreBadge score={a.overall_score} />
            </Group>
          ))}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          No analyses yet. Match a resume against this job to see your score.
        </Text>
      )}
    </SectionCard>
  );
}

export function JobDescriptionCard({ description }: { description: string }) {
  return (
    <SectionCard title="Description" icon={<IconFileDescription size={18} />}>
      <Spoiler maxHeight={320} showLabel="Show full description" hideLabel="Show less">
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }} lh={1.65}>
          {description}
        </Text>
      </Spoiler>
    </SectionCard>
  );
}
