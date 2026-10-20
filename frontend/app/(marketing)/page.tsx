import { Badge, Box, Button, Card, Container, Group, List, ListItem, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconArrowRight,
  IconChecklist,
  IconFileUpload,
  IconListSearch,
  IconLock,
  IconMessageQuestion,
  IconScale,
  IconVersions,
} from "@tabler/icons-react";
import Link from "next/link";

const FEATURES = [
  { icon: IconFileUpload, title: "Resume parsing", text: "Upload PDF or DOCX. Contact details, skills, experience, education and projects are extracted into an editable form." },
  { icon: IconScale, title: "Transparent matching", text: "A documented, deterministic score built from required skills, responsibilities, experience, education and keywords." },
  { icon: IconListSearch, title: "Skill-gap analysis", text: "See which required and preferred skills are missing, with evidence for every skill that was matched." },
  { icon: IconChecklist, title: "Grounded AI feedback", text: "Find weak bullets and get rewrites that keep your real facts. Anything needing verification is clearly marked." },
  { icon: IconVersions, title: "Versioned improvements", text: "Save tailored versions, compare them with the original, and export a clean PDF." },
  { icon: IconMessageQuestion, title: "Interview practice", text: "Practice questions generated from the job and your experience, with answer outlines and topics to study." },
];

const STEPS = [
  { title: "Upload your resume", text: "Text is extracted locally and parsed into sections you can correct." },
  { title: "Save job descriptions", text: "Paste a posting; required and preferred qualifications are identified." },
  { title: "Compare and improve", text: "Review the score breakdown, close real gaps, and save tailored versions." },
];

function SamplePreview() {
  const rows = [
    { label: "Required skills", value: 91, color: "teal" },
    { label: "Responsibility alignment", value: 99, color: "teal" },
    { label: "Keyword coverage", value: 69, color: "blue" },
    { label: "Preferred skills", value: 0, color: "red" },
  ];
  return (
    <Card shadow="md" padding="lg" aria-label="Example analysis using sample data">
      <Group justify="space-between" mb="md">
        <div>
          <Text fw={600}>Senior Full-Stack Engineer</Text>
          <Text size="xs" c="dimmed">
            Sample resume vs. sample job
          </Text>
        </div>
        <Badge variant="light" color="gray" tt="none">
          Example output · sample data
        </Badge>
      </Group>
      <Stack gap="sm">
        {rows.map((r) => (
          <div key={r.label}>
            <Group justify="space-between" mb={4}>
              <Text size="sm">{r.label}</Text>
              <Text size="sm" c="dimmed">
                {r.value}/100
              </Text>
            </Group>
            <Progress value={r.value} color={r.color} radius="xl" aria-hidden />
          </div>
        ))}
        <Group gap={6} mt="xs">
          <Text size="xs" c="dimmed">
            Missing:
          </Text>
          {["Integration Testing", "Kubernetes", "GraphQL"].map((s) => (
            <Badge key={s} color="red" variant="outline" tt="none" size="sm">
              {s}
            </Badge>
          ))}
        </Group>
      </Stack>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <>
      <Container size="lg" py={{ base: 48, md: 80 }}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48} style={{ alignItems: "center" }}>
          <Stack gap="lg">
            <Badge variant="light" size="lg" tt="none" w="fit-content">
              Resume analysis you can verify
            </Badge>
            <Title order={1} fz={{ base: 34, sm: 44 }} lh={1.15}>
              Know exactly how your resume matches the job
            </Title>
            <Text size="lg" c="dimmed">
              Upload your resume, paste a job description, and get a transparent match breakdown, a clear list of
              skill gaps, and AI-assisted suggestions that never invent experience you don&apos;t have.
            </Text>
            <Group>
              <Button component={Link} href="/register" size="md" rightSection={<IconArrowRight size={18} />}>
                Analyze your resume
              </Button>
              <Button component={Link} href="/features" size="md" variant="default">
                See how it works
              </Button>
            </Group>
            <Group gap="xs">
              <IconLock size={16} aria-hidden />
              <Text size="sm" c="dimmed">
                Parsing runs on our server. AI features use a redacted copy and require your opt-in.
              </Text>
            </Group>
          </Stack>
          <SamplePreview />
        </SimpleGrid>
      </Container>

      <Box bg="var(--mantine-color-default-hover)" py={64}>
        <Container size="lg">
          <Title order={2} ta="center" mb="xs">
            Everything you need to tailor a resume
          </Title>
          <Text c="dimmed" ta="center" mb={40} maw={620} mx="auto">
            Measurable comparisons come from deterministic rules; AI is used for interpretation and writing help.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {FEATURES.map((f) => (
              <Card key={f.title} padding="lg">
                <ThemeIcon variant="light" size={40} radius="md" mb="sm">
                  <f.icon size={22} />
                </ThemeIcon>
                <Text fw={600} mb={4}>
                  {f.title}
                </Text>
                <Text size="sm" c="dimmed">
                  {f.text}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      <Container size="lg" py={64}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48}>
          <div>
            <Title order={2} mb="md">
              How it works
            </Title>
            <List spacing="lg" type="ordered">
              {STEPS.map((s) => (
                <ListItem key={s.title}>
                  <Text fw={600}>{s.title}</Text>
                  <Text size="sm" c="dimmed">
                    {s.text}
                  </Text>
                </ListItem>
              ))}
            </List>
          </div>
          <Card padding="xl">
            <Title order={3} mb="sm">
              Honest by design
            </Title>
            <List spacing="sm" size="sm">
              <ListItem>The match score is a documented heuristic, not an ATS score or hiring prediction.</ListItem>
              <ListItem>Suggestions never add employers, degrees, skills or metrics you didn&apos;t provide.</ListItem>
              <ListItem>Content that needs your verification is flagged before you can save it.</ListItem>
              <ListItem>Demo output without an AI provider is labeled as rule-based, never as AI.</ListItem>
            </List>
            <Button component={Link} href="/register" mt="lg">
              Create a free account
            </Button>
          </Card>
        </SimpleGrid>
      </Container>
    </>
  );
}
