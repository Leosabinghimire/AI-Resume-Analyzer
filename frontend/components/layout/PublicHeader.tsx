"use client";

import { Anchor, Box, Burger, Button, Container, Divider, Drawer, Group, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { Logo } from "./Logo";
import { PUBLIC_LINKS } from "./navigation";
import { ThemeToggle } from "./ThemeToggle";

function AuthButtons({ onNavigate, stacked }: { onNavigate?: () => void; stacked?: boolean }) {
  return (
    <>
      <Button component={Link} href="/login" variant="default" onClick={onNavigate} fullWidth={stacked}>
        Sign in
      </Button>
      <Button component={Link} href="/register" onClick={onNavigate} fullWidth={stacked}>
        Get started
      </Button>
    </>
  );
}

export function PublicHeader() {
  const [opened, { toggle, close }] = useDisclosure();
  return (
    <Box
      component="header"
      pos="sticky"
      top={0}
      style={{
        zIndex: 100,
        borderBottom: "1px solid var(--app-border)",
        background: "color-mix(in srgb, var(--app-surface) 85%, transparent)",
        backdropFilter: "saturate(180%) blur(8px)",
      }}
    >
      <Container size="lg" h={68}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Logo />
          <Group gap={32} visibleFrom="sm" component="nav" aria-label="Main">
            {PUBLIC_LINKS.map((l) => (
              <Anchor key={l.href} component={Link} href={l.href} c="dimmed" size="sm" fw={500} underline="never">
                {l.label}
              </Anchor>
            ))}
          </Group>
          <Group gap="sm" visibleFrom="sm">
            <ThemeToggle />
            <AuthButtons />
          </Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" aria-label="Open menu" />
        </Group>
      </Container>
      <Drawer opened={opened} onClose={close} title="Menu" hiddenFrom="sm" size="xs" position="right">
        <Stack>
          {PUBLIC_LINKS.map((l) => (
            <Anchor key={l.href} component={Link} href={l.href} onClick={close}>
              {l.label}
            </Anchor>
          ))}
          <Divider />
          <AuthButtons onNavigate={close} stacked />
          <ThemeToggle />
        </Stack>
      </Drawer>
    </Box>
  );
}
