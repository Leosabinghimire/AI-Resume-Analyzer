import { Grid, Group, Progress, SimpleGrid, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import type { ReactNode } from "react";
import {
  IconAlertTriangle,
  IconBriefcase,
  IconCheck,
  IconChecklist,
  IconKey,
  IconListCheck,
  IconTags,
  IconX,
} from "@tabler/icons-react";
import { ScoreBreakdown } from "@/components/domain/ScoreBreakdown";
import { ScoreRing } from "@/components/domain/ScoreRing";
import { MatchedSkillBadges, SkillList } from "@/components/domain/SkillBadges";
import { BulletList, DataTable, PriorityList, SectionCard, type Column } from "@/components/ui";
import { percent } from "@/lib/format";
import type { MatchResult, ResponsibilityAlignment } from "@/types/api";

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <Text size="sm" fw={600} mb={8}>
      {children}
    </Text>
  );
}

export function MatchOverview({ result }: { result: MatchResult }) {
  return (
    <SectionCard>
      <Grid gutter="xl" align="center">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Stack align="center" gap="sm">
            <ScoreRing score={result.overall_score} size={168} />
            <Text size="xs" c="dimmed" ta="center" maw={230}>
              Coverage of this posting&apos;s stated requirements. Not an ATS score or hiring prediction.
            </Text>
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 8 }}>
          <ScoreBreakdown components={result.components} />
        </Grid.Col>
      </Grid>
    </SectionCard>
  );
}

export function SkillsSection({ result }: { result: MatchResult }) {
  return (
    <SectionCard title="Skills" icon={<IconTags size={18} />} description="Hover a matched skill to see where it was found.">
      <Stack gap="lg">
        <div>
          <SubHeading>Matched ({result.matched_skills.length})</SubHeading>
          <MatchedSkillBadges skills={result.matched_skills} />
        </div>
        <div>
          <SubHeading>Missing required ({result.missing_required_skills.length})</SubHeading>
          <SkillList skills={result.missing_required_skills} color="red" variant="outline" emptyText="All required skills found." />
        </div>
        <div>
          <SubHeading>Missing preferred ({result.missing_preferred_skills.length})</SubHeading>
          <SkillList skills={result.missing_preferred_skills} color="orange" variant="outline" emptyText="All preferred skills found." />
        </div>
      </Stack>
    </SectionCard>
  );
}

export function ImprovementsSection({ result }: { result: MatchResult }) {
  return (
    <SectionCard title="Areas to improve" icon={<IconChecklist size={18} />}>
      <PriorityList
        items={result.improvement_areas.map((a) => ({ key: a.area, priority: a.priority, title: a.area, detail: a.detail }))}
        empty="No improvement areas identified for this job."
      />
    </SectionCard>
  );
}

const ALIGNMENT_COLUMNS: Column<ResponsibilityAlignment>[] = [
  {
    key: "responsibility",
    header: "Responsibility",
    width: "40%",
    render: (r) => (
      <Group gap={8} wrap="nowrap" align="flex-start">
        <ThemeIcon size={20} radius="xl" color={r.aligned ? "teal" : "red"} variant="light" style={{ flexShrink: 0 }}>
          {r.aligned ? <IconCheck size={12} /> : <IconX size={12} />}
        </ThemeIcon>
        <Text size="sm">{r.responsibility}</Text>
      </Group>
    ),
  },
  {
    key: "evidence",
    header: "Closest evidence in your resume",
    render: (r) => (
      <Text size="sm" c={r.best_match ? undefined : "dimmed"}>
        {r.best_match ?? "No related content found"}
      </Text>
    ),
  },
  {
    key: "similarity",
    header: "Similarity",
    width: 120,
    render: (r) => (
      <Tooltip label={r.aligned ? "Aligned (≥ 0.20)" : "Below the 0.20 alignment threshold"} multiline={false}>
        <Stack gap={2}>
          <Progress value={Math.min(100, (r.similarity / 0.35) * 100)} color={r.aligned ? "teal" : "red"} size="sm" aria-label="Similarity" />
          <Text size="xs" c="dimmed">
            {r.similarity.toFixed(2)}
          </Text>
        </Stack>
      </Tooltip>
    ),
  },
];

export function ResponsibilitiesSection({ result }: { result: MatchResult }) {
  if (result.responsibility_alignment.length === 0) return null;
  return (
    <SectionCard
      title="Responsibility alignment"
      icon={<IconListCheck size={18} />}
      description="Each responsibility from the posting with the most similar line from your resume (term overlap)."
      flush
    >
      <DataTable columns={ALIGNMENT_COLUMNS} rows={result.responsibility_alignment} rowKey={(r) => r.responsibility} minWidth={680} />
    </SectionCard>
  );
}

export function ExperienceSection({ result }: { result: MatchResult }) {
  const { experience, education, keyword_coverage: kw } = result;
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      <SectionCard title="Relevant experience" icon={<IconBriefcase size={18} />}>
        <Stack gap="md">
          {result.relevant_experience.length === 0 ? (
            <Text size="sm" c="dimmed">
              No roles closely related to this job were found.
            </Text>
          ) : (
            result.relevant_experience.map((e) => (
              <div key={`${e.title}-${e.company}`}>
                <Text size="sm" fw={600}>
                  {e.title}
                  {e.company ? ` · ${e.company}` : ""}
                </Text>
                <Text size="xs" c="dimmed">
                  {e.reason}
                </Text>
              </div>
            ))
          )}
          <div>
            <SubHeading>Experience & education checks</SubHeading>
            <BulletList items={[experience.explanation, education.explanation]} />
          </div>
        </Stack>
      </SectionCard>
      <SectionCard
        title={`Keyword coverage · ${percent(kw.coverage)}`}
        icon={<IconKey size={18} />}
        description="Important terms from the posting and whether they appear in your resume."
      >
        <Stack gap="md">
          <div>
            <SubHeading>Present</SubHeading>
            <SkillList skills={kw.matched} color="teal" emptyText="None of the key terms were found." />
          </div>
          <div>
            <SubHeading>Missing</SubHeading>
            <SkillList skills={kw.missing} color="gray" variant="outline" emptyText="All key terms are present." />
          </div>
          {kw.missing.length > 0 && (
            <Group gap={6} wrap="nowrap" align="flex-start">
              <IconAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 3 }} aria-hidden />
              <Text size="xs" c="dimmed">
                Only add terms that truthfully describe your experience.
              </Text>
            </Group>
          )}
        </Stack>
      </SectionCard>
    </SimpleGrid>
  );
}

export function MatchResultView({ result }: { result: MatchResult }) {
  return (
    <Stack gap="lg">
      <MatchOverview result={result} />
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SkillsSection result={result} />
        <ImprovementsSection result={result} />
      </SimpleGrid>
      <ResponsibilitiesSection result={result} />
      <ExperienceSection result={result} />
    </Stack>
  );
}
