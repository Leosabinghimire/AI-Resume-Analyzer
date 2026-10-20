import { Badge, Box, Button, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconArrowRight,
  IconChecklist,
  IconCircleCheck,
  IconFileUpload,
  IconListSearch,
  IconLock,
  IconMessageQuestion,
  IconScale,
  IconVersions,
} from "@tabler/icons-react";
import Link from "next/link";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { ProductPreview } from "@/components/marketing/ProductPreview";
import { Section } from "@/components/marketing/Section";

const FEATURES = [
  { icon: IconFileUpload, title: "Resume parsing", text: "Upload PDF or DOCX. Contact details, skills, experience, education and projects become an editable form." },
  { icon: IconScale, title: "Transparent matching", text: "A documented, deterministic score from required skills, responsibilities, experience, education and keywords." },
  { icon: IconListSearch, title: "Skill-gap analysis", text: "See which required and preferred skills are missing, with evidence for every skill that matched." },
  { icon: IconChecklist, title: "Grounded AI feedback", text: "Find weak bullets and get rewrites that keep your real facts. Anything to verify is clearly marked." },
  { icon: IconVersions, title: "Versioned improvements", text: "Save tailored versions, compare them with the original word by word, and export a clean PDF." },
  { icon: IconMessageQuestion, title: "Interview practice", text: "Practice questions from the job and your experience, with answer outlines and topics to study." },
];

const STEPS = [
  { title: "Upload your resume", text: "Text is extracted on the server and organized into sections you can correct." },
  { title: "Save job descriptions", text: "Paste a posting; required and preferred qualifications are identified for you." },
  { title: "Compare and improve", text: "Review the breakdown, close real gaps, and save a tailored version for each role." },
];

const PRINCIPLES = [
  "The score is a documented heuristic, never presented as an ATS score or hiring prediction.",
  "Suggestions never add employers, degrees, skills or metrics you didn't provide.",
  "Anything needing your verification is flagged, and placeholders block saving.",
  "Demo output without an AI provider is labeled rule-based, never passed off as AI.",
];

export default function LandingPage() {
  return (
    <>
      <Box
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 0%, var(--app-brand-soft) 0%, transparent 70%)",
        }}
      >
        <Container size="lg" py={{ base: 56, md: 96 }}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={64} style={{ alignItems: "center" }}>
            <Stack gap="xl">
              <Badge variant="light" size="lg" w="fit-content" leftSection={<IconCircleCheck size={14} />}>
                Resume analysis you can verify
              </Badge>
              <Title order={1} fz={{ base: 38, sm: 52 }} lh={1.08} style={{ letterSpacing: "-0.03em" }}>
                Know exactly how your resume{" "}
                <Text span inherit c="brand">
                  matches the job
                </Text>
              </Title>
              <Text size="xl" c="dimmed" lh={1.6} maw={540}>
                Upload a resume, paste a job description, and get a transparent breakdown, a clear list of skill gaps,
                and suggestions that never invent experience you don&apos;t have.
              </Text>
              <Group>
                <Button component={Link} href="/register" size="lg" rightSection={<IconArrowRight size={18} />}>
                  Analyze your resume
                </Button>
                <Button component={Link} href="/features" size="lg" variant="default">
                  How it works
                </Button>
              </Group>
              <Group gap={8} c="dimmed" wrap="nowrap" align="flex-start">
                <IconLock size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
                <Text size="sm">Parsing runs on our server. AI features use a redacted copy and require your opt-in.</Text>
              </Group>
            </Stack>
            <ProductPreview />
          </SimpleGrid>
        </Container>
      </Box>

      <Section
        muted
        eyebrow="Features"
        title="Everything you need to tailor a resume"
        subtitle="Measurable comparisons come from deterministic rules. AI is used only for interpretation and writing help."
      >
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title}>
              {f.text}
            </FeatureCard>
          ))}
        </SimpleGrid>
      </Section>

      <Section eyebrow="How it works" title="From upload to a tailored resume in three steps">
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {STEPS.map((s, i) => (
            <Card key={s.title} padding="xl">
              <ThemeIcon size={40} radius="xl" variant="filled" mb="md">
                <Text fw={700}>{i + 1}</Text>
              </ThemeIcon>
              <Text fw={650} size="lg" mb={6}>
                {s.title}
              </Text>
              <Text size="sm" c="dimmed" lh={1.6}>
                {s.text}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Section>

      <Section muted align="left">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48} style={{ alignItems: "center" }}>
          <Stack gap="md">
            <Badge variant="light" size="lg" w="fit-content">
              Honest by design
            </Badge>
            <Title order={2} fz={{ base: 28, md: 34 }} style={{ letterSpacing: "-0.02em" }}>
              Built to help you, not to game a filter
            </Title>
            <Text c="dimmed" size="lg">
              Every finding is explainable and grounded in what your resume actually says.
            </Text>
          </Stack>
          <Stack gap="md">
            {PRINCIPLES.map((p) => (
              <Group key={p} wrap="nowrap" align="flex-start" gap="sm">
                <ThemeIcon size={24} radius="xl" color="teal" variant="light">
                  <IconCircleCheck size={16} />
                </ThemeIcon>
                <Text>{p}</Text>
              </Group>
            ))}
          </Stack>
        </SimpleGrid>
      </Section>

      <Container size="lg" py={{ base: 56, md: 88 }}>
        <Card
          padding={48}
          radius="xl"
          style={{ background: "linear-gradient(135deg, var(--mantine-color-brand-6), var(--mantine-color-brand-8))", border: 0 }}
        >
          <Group justify="space-between" gap="xl">
            <Stack gap={6} maw={560}>
              <Title order={2} c="white" fz={{ base: 26, md: 32 }}>
                Ready to see how you match?
              </Title>
              <Text c="white" opacity={0.85}>
                Create a free account, upload your resume, and get your first transparent analysis in minutes.
              </Text>
            </Stack>
            <Button component={Link} href="/register" size="lg" variant="white" rightSection={<IconArrowRight size={18} />}>
              Get started free
            </Button>
          </Group>
        </Card>
      </Container>
    </>
  );
}
