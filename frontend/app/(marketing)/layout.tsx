import { Anchor, Box, Container, Group, Text } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <Box>
      <PublicHeader />
      <main>{children}</main>
      <Box component="footer" py="xl" mt={64} style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
        <Container size="lg">
          <Group justify="space-between" gap="md">
            <Text size="sm" c="dimmed">
              AI Resume Analyzer & Job Matcher — a portfolio project.
            </Text>
            <Group gap="lg">
              <Anchor component={Link} href="/features" size="sm" c="dimmed">
                Features
              </Anchor>
              <Anchor component={Link} href="/privacy" size="sm" c="dimmed">
                Privacy
              </Anchor>
              <Anchor component={Link} href="/login" size="sm" c="dimmed">
                Sign in
              </Anchor>
            </Group>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
