import { Anchor, Box, Container, Group, Stack, Text } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { PUBLIC_LINKS } from "@/components/layout/navigation";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <Box bg="var(--app-surface)">
      <PublicHeader />
      <main>{children}</main>
      <Box component="footer" py={40} style={{ borderTop: "1px solid var(--app-border)" }}>
        <Container size="lg">
          <Group justify="space-between" align="flex-start" gap="xl">
            <Stack gap="xs" maw={360}>
              <Logo />
              <Text size="sm" c="dimmed">
                Transparent resume-to-job matching with grounded AI feedback. A portfolio project.
              </Text>
            </Stack>
            <Group gap="xl" component="nav" aria-label="Footer">
              {[...PUBLIC_LINKS, { href: "/login", label: "Sign in" }].map((l) => (
                <Anchor key={l.href} component={Link} href={l.href} size="sm" c="dimmed">
                  {l.label}
                </Anchor>
              ))}
            </Group>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
