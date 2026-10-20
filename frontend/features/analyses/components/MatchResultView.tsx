import { Badge, Card, Group, List, Progress, SimpleGrid, Stack, Table, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconX } from "@tabler/icons-react";
import { ScoreBreakdown } from "@/components/score/ScoreBreakdown";
import { ScoreRing } from "@/components/score/ScoreRing";
import { MatchedSkillBadges, SkillList } from "@/components/skills/SkillBadges";
import { percent } from "@/lib/format";
import type { MatchResult, Priority } from "@/types/api";

const PRIORITY_COLOR: Record<Priority, string> = { high: "red", medium: "yellow", low: "gray" };

export function MatchOverview({ result }: { result: MatchResult }) {
  return (
    <Card>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" style={{ alignItems: "center" }}>
        <Stack align="center" gap={4}>
          <ScoreRing score={result.overall_score} size={150} />
          <Text size="xs" c="dimmed" ta="center" maw={220}>
            Coverage of this posting&apos;s stated requirements. Not an ATS score or hiring prediction.
          </Text>
        </Stack>
        <div style={{ gridColumn: "span 2" }}>
          <ScoreBreakdown components={result.components} />
        </div>
      </SimpleGrid>
    </Card>
  );
}

export function SkillsSection({ result }: { result: MatchResult }) {
  return (
    <Card>
      <Title order={4} mb="md">
        Skills
      </Title>
      <Stack gap="md">
        <div>
          <Text size="sm" fw={500} mb={6}>
            Matched ({result.matched_skills.length}){" "}
            <Text span size="xs" c="dimmed">
              — hover a skill to see where it was found
            </Text>
          </Text>
          <MatchedSkillBadges skills={result.matched_skills} />
        </div>
        <div>
          <Text size="sm" fw={500} mb={6}>
            Missing required ({result.missing_required_skills.length})
          </Text>
          <SkillList skills={result.missing_required_skills} color="red" variant="outline" emptyText="All required skills found." />
        </div>
        <div>
          <Text size="sm" fw={500} mb={6}>
            Missing preferred ({result.missing_preferred_skills.length})
          </Text>
          <SkillList skills={result.missing_preferred_skills} color="orange" variant="outline" emptyText="All preferred skills found." />
        </div>
      </Stack>
    </Card>
  );
}

export function ImprovementsSection({ result }: { result: MatchResult }) {
  if (result.improvement_areas.length === 0) return null;
  return (
    <Card>
      <Title order={4} mb="md">
        Areas to improve
      </Title>
      <Stack gap="sm">
        {result.improvement_areas.map((a) => (
          <Group key={a.area} align="flex-start" wrap="nowrap" gap="sm">
            <Badge color={PRIORITY_COLOR[a.priority]} variant="light" w={74} tt="capitalize" style={{ flexShrink: 0 }}>
              {a.priority}
            </Badge>
            <div>
              <Text size="sm" fw={600}>
                {a.area}
              </Text>
              <Text size="sm" c="dimmed">
                {a.detail}
              </Text>
            </div>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

export function ResponsibilitiesSection({ result }: { result: MatchResult }) {
  if (result.responsibility_alignment.length === 0) return null;
  return (
    <Card p={0}>
      <Stack gap={4} p="lg" pb="xs">
        <Title order={4}>Responsibility alignment</Title>
        <Text size="xs" c="dimmed">
          Each responsibility from the posting with the most similar line from your resume (term overlap).
        </Text>
      </Stack>
      <Table.ScrollContainer minWidth={640}>
        <Table verticalSpacing="sm" horizontalSpacing="lg">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w="40%">Responsibility</Table.Th>
              <Table.Th>Closest evidence in your resume</Table.Th>
              <Table.Th w={110}>Similarity</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {result.responsibility_alignment.map((r) => (
              <Table.Tr key={r.responsibility}>
                <Table.Td>
                  <Group gap={6} wrap="nowrap" align="flex-start">
                    <ThemeIcon size={18} radius="xl" color={r.aligned ? "teal" : "red"} variant="light" style={{ flexShrink: 0 }}>
                      {r.aligned ? <IconCheck size={12} /> : <IconX size={12} />}
                    </ThemeIcon>
                    <Text size="sm">{r.responsibility}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={r.best_match ? undefined : "dimmed"}>
                    {r.best_match ?? "No related content found"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Tooltip label={r.aligned ? "Aligned (≥ 0.20)" : "Below the 0.20 alignment threshold"} multiline={false}>
                    <Progress value={Math.min(100, (r.similarity / 0.35) * 100)} color={r.aligned ? "teal" : "red"} aria-label="Similarity" />
                  </Tooltip>
                  <Text size="xs" c="dimmed" mt={2}>
                    {r.similarity.toFixed(2)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}

export function ExperienceSection({ result }: { result: MatchResult }) {
  const { experience, education, keyword_coverage: kw } = result;
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      <Card>
        <Title order={4} mb="sm">
          Relevant experience
        </Title>
        {result.relevant_experience.length === 0 ? (
          <Text size="sm" c="dimmed">
            No roles closely related to this job were found.
          </Text>
        ) : (
          <Stack gap="sm">
            {result.relevant_experience.map((e) => (
              <div key={`${e.title}-${e.company}`}>
                <Text size="sm" fw={600}>
                  {e.title}
                  {e.company ? ` · ${e.company}` : ""}
                </Text>
                <Text size="xs" c="dimmed">
                  {e.reason}
                </Text>
              </div>
            ))}
          </Stack>
        )}
        <Title order={5} mt="lg" mb={4}>
          Experience & education checks
        </Title>
        <List size="sm" spacing={6}>
          <List.Item>{experience.explanation}</List.Item>
          <List.Item>{education.explanation}</List.Item>
        </List>
      </Card>
      <Card>
        <Title order={4} mb={4}>
          Keyword coverage · {percent(kw.coverage)}
        </Title>
        <Text size="xs" c="dimmed" mb="sm">
          Important terms from the posting and whether they appear in your resume.
        </Text>
        <Text size="sm" fw={500} mb={6}>
          Present
        </Text>
        <SkillList skills={kw.matched} color="teal" emptyText="None of the key terms were found." />
        <Text size="sm" fw={500} mt="md" mb={6}>
          Missing
        </Text>
        <SkillList skills={kw.missing} color="gray" variant="outline" emptyText="All key terms are present." />
        {kw.missing.length > 0 && (
          <Group gap={6} mt="sm" wrap="nowrap" align="flex-start">
            <IconAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 3 }} aria-hidden />
            <Text size="xs" c="dimmed">
              Only add terms that truthfully describe your experience.
            </Text>
          </Group>
        )}
      </Card>
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
