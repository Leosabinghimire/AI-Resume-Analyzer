import { Alert, Card, Container, List, ListItem, SimpleGrid, Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Features & scoring methodology" };

const SCORING = [
  ["Required skills", "35", "Share of the job's required skills found anywhere in the resume (soft skills count half)."],
  ["Responsibility alignment", "20", "For each listed responsibility, the most similar resume bullet (term overlap). 0.35 similarity = full credit."],
  ["Keyword coverage", "15", "Share of the posting's key terms (skills plus frequent meaningful words) present in the resume."],
  ["Years of experience", "15", "Dated experience (overlaps merged) relative to the stated minimum years."],
  ["Preferred skills", "10", "Share of preferred or nice-to-have skills found."],
  ["Education & certifications", "5", "Degree level versus the stated level, partial credit if equivalent experience is accepted."],
];

const SECTIONS = [
  {
    title: "Resume management",
    items: ["PDF and DOCX upload with type, size and page validation", "Local text extraction and section parsing", "Editable structured data, rename, download and delete", "Clear messages for scanned or image-only PDFs"],
  },
  {
    title: "Job descriptions",
    items: ["Required vs. preferred qualification detection", "Responsibilities, minimum years and education extraction", "Editable skill lists with one-click re-extraction", "Match one resume against up to ten jobs at once"],
  },
  {
    title: "AI assistance",
    items: ["Semantic match insights and transferable skills", "Weak bullet detection with grounded rewrites", "Summary, keyword and grammar suggestions", "Job-specific interview practice questions"],
  },
  {
    title: "Workspace & history",
    items: ["Versioned resumes with side-by-side diff", "PDF export of any version", "Searchable, filterable analysis history", "Dashboard of trends and recurring skill gaps"],
  },
];

export default function FeaturesPage() {
  return (
    <Container size="lg" py={56}>
      <Stack gap={48}>
        <div>
          <Title order={1} mb="sm">
            Features
          </Title>
          <Text c="dimmed" maw={700}>
            Built around one principle: every finding should be explainable and grounded in what your resume actually
            says.
          </Text>
        </div>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {SECTIONS.map((s) => (
            <Card key={s.title}>
              <Title order={3} fz="lg" mb="sm">
                {s.title}
              </Title>
              <List size="sm" spacing={6}>
                {s.items.map((i) => (
                  <ListItem key={i}>{i}</ListItem>
                ))}
              </List>
            </Card>
          ))}
        </SimpleGrid>

        <section id="scoring">
          <Title order={2} mb="sm">
            How the match score is calculated
          </Title>
          <Text c="dimmed" mb="md" maw={760}>
            The score is a weighted average of the components below. If a job does not specify something (for
            example, years of experience), that component is skipped and the remaining weights are rescaled. The
            calculation is deterministic: the same resume and job always produce the same score.
          </Text>
          <Card p={0}>
            <TableScrollContainer minWidth={560}>
              <Table verticalSpacing="sm" horizontalSpacing="md">
                <TableThead>
                  <TableTr>
                    <TableTh>Component</TableTh>
                    <TableTh>Weight</TableTh>
                    <TableTh>How it is measured</TableTh>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {SCORING.map(([name, weight, how]) => (
                    <TableTr key={name}>
                      <TableTd fw={500}>{name}</TableTd>
                      <TableTd>{weight}%</TableTd>
                      <TableTd>
                        <Text size="sm">{how}</Text>
                      </TableTd>
                    </TableTr>
                  ))}
                </TableTbody>
              </Table>
            </TableScrollContainer>
          </Card>
          <Alert color="yellow" variant="light" mt="lg" title="Limitations">
            <List size="sm" spacing={4}>
              <ListItem>Skill detection uses a curated taxonomy; uncommon tools may only match by exact phrase.</ListItem>
              <ListItem>Term overlap cannot fully judge the depth or quality of experience.</ListItem>
              <ListItem>Parsing unusual layouts (tables, columns) can miss content, so review the extracted data.</ListItem>
              <ListItem>This is not an applicant tracking system score and does not predict hiring decisions.</ListItem>
            </List>
          </Alert>
        </section>
      </Stack>
    </Container>
  );
}
