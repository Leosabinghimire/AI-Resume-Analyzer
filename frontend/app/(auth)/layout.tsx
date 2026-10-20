import { Box, Center, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconChecklist, IconLock, IconScale } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const POINTS = [
  { icon: IconScale, title: "Transparent scoring", text: "See exactly which requirements you meet, with evidence." },
  { icon: IconChecklist, title: "Grounded suggestions", text: "Rewrites keep your real facts and flag anything to verify." },
  { icon: IconLock, title: "Private by default", text: "Parsing runs on the server; AI use is opt-in and redacted." },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} mih="100vh">
      <Box
        visibleFrom="md"
        p={56}
        style={{
          background: "linear-gradient(160deg, var(--mantine-color-brand-7) 0%, var(--mantine-color-brand-9) 100%)",
          color: "white",
        }}
      >
        <Stack justify="space-between" h="100%">
          <Group gap={10}>
            <ThemeIcon size={34} radius="md" color="white" variant="white">
              <IconScale size={20} color="var(--mantine-color-brand-7)" />
            </ThemeIcon>
            <Text fw={700} size="lg">
              AI Resume Analyzer
            </Text>
          </Group>
          <Stack gap="xl" maw={440}>
            <Title order={2} fz={32} lh={1.2} c="white">
              Tailor your resume with evidence, not guesswork.
            </Title>
            {POINTS.map((p) => (
              <Group key={p.title} align="flex-start" wrap="nowrap" gap="md">
                <ThemeIcon size={38} radius="md" variant="white" color="brand">
                  <p.icon size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={600}>{p.title}</Text>
                  <Text size="sm" opacity={0.85}>
                    {p.text}
                  </Text>
                </div>
              </Group>
            ))}
          </Stack>
          <Text size="xs" opacity={0.7}>
            Match scores are a transparent heuristic, not an ATS score or hiring prediction.
          </Text>
        </Stack>
      </Box>

      <Stack gap={0} bg="var(--app-bg)">
        <Group justify="space-between" p="md">
          <Box hiddenFrom="md">
            <Logo />
          </Box>
          <Box ml="auto">
            <ThemeToggle />
          </Box>
        </Group>
        <Center flex={1} px="md" py="xl">
          <Box w="100%" maw={420}>
            {children}
          </Box>
        </Center>
      </Stack>
    </SimpleGrid>
  );
}
