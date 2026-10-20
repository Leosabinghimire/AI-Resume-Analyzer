import { Alert, Card, Group, Progress, SimpleGrid, Text, Title } from "@mantine/core";
import { IconBriefcase, IconFileText, IconHistory, IconSparkles } from "@tabler/icons-react";
import type { Metadata } from "next";
import { Section } from "@/components/marketing/Section";
import { BulletList, DataTable, type Column } from "@/components/ui";

export const metadata: Metadata = { title: "Features & scoring methodology" };

interface ScoringRow {
  name: string;
  weight: number;
  how: string;
}

const SCORING: ScoringRow[] = [
  { name: "Required skills", weight: 35, how: "Share of the job's required skills found anywhere in the resume (soft skills count half)." },
  { name: "Responsibility alignment", weight: 20, how: "For each responsibility, the most similar resume bullet by term overlap; 0.35 similarity earns full credit." },
  { name: "Keyword coverage", weight: 15, how: "Share of the posting's key terms (skills plus frequent meaningful words) present in the resume." },
  { name: "Years of experience", weight: 15, how: "Dated experience, with overlapping roles merged, relative to the stated minimum." },
  { name: "Preferred skills", weight: 10, how: "Share of preferred or nice-to-have skills found." },
  { name: "Education & certifications", weight: 5, how: "Degree level versus the stated level, with partial credit when equivalent experience is accepted." },
];

const COLUMNS: Column<ScoringRow>[] = [
  { key: "name", header: "Component", width: 240, render: (r) => <Text fw={600} size="sm">{r.name}</Text> },
  {
    key: "weight",
    header: "Weight",
    width: 160,
    render: (r) => (
      <Group gap="sm" wrap="nowrap">
        <Progress value={r.weight * 2.5} w={70} size="sm" aria-hidden />
        <Text size="sm">{r.weight}%</Text>
      </Group>
    ),
  },
  { key: "how", header: "How it is measured", render: (r) => <Text size="sm" c="dimmed">{r.how}</Text> },
];

const CAPABILITIES = [
  {
    icon: IconFileText,
    title: "Resume management",
    items: ["PDF and DOCX upload with type, size and page validation", "Local text extraction and section parsing", "Editable structured data, rename, download and delete", "Clear messages for scanned or image-only PDFs"],
  },
  {
    icon: IconBriefcase,
    title: "Job descriptions",
    items: ["Required vs. preferred qualification detection", "Responsibilities, minimum years and education extraction", "Editable skill lists with one-click re-extraction", "Match one resume against up to ten jobs at once"],
  },
  {
    icon: IconSparkles,
    title: "AI assistance",
    items: ["Semantic match insights and transferable skills", "Weak bullet detection with grounded rewrites", "Summary, keyword and grammar suggestions", "Job-specific interview practice questions"],
  },
  {
    icon: IconHistory,
    title: "Workspace & history",
    items: ["Versioned resumes with word-level diffs", "PDF export of any version", "Searchable, filterable analysis history", "Dashboard of trends and recurring skill gaps"],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Section
        eyebrow="Features"
        title="Built around explainable, grounded results"
        subtitle="Every finding should trace back to what your resume and the job description actually say."
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {CAPABILITIES.map((c) => (
            <Card key={c.title} padding="xl">
              <Group gap="sm" mb="md">
                <c.icon size={22} stroke={1.7} color="var(--mantine-primary-color-filled)" />
                <Title order={3} fz="lg">
                  {c.title}
                </Title>
              </Group>
              <BulletList items={c.items} variant="check" />
            </Card>
          ))}
        </SimpleGrid>
      </Section>

      <Section
        id="scoring"
        muted
        eyebrow="Methodology"
        title="How the match score is calculated"
        subtitle="A weighted average of the components below. Components the job does not specify are skipped and the remaining weights rescaled, so the same resume and job always produce the same score."
      >
        <Card padding={0}>
          <DataTable columns={COLUMNS} rows={SCORING} rowKey={(r) => r.name} minWidth={620} caption="Score components" />
        </Card>
        <Alert color="yellow" mt="lg" title="Limitations">
          <BulletList
            items={[
              "Skill detection uses a curated taxonomy; uncommon tools may only match by exact phrase.",
              "Term overlap cannot fully judge the depth or quality of experience.",
              "Unusual layouts (tables, columns) can be parsed imperfectly, so review the extracted data.",
              "This is not an applicant tracking system score and does not predict hiring decisions.",
            ]}
          />
        </Alert>
      </Section>
    </>
  );
}
