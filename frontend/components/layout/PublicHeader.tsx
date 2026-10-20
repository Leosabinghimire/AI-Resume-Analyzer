"use client";

import { Anchor, Box, Burger, Button, Container, Drawer, Group, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/features#scoring", label: "How scoring works" },
  { href: "/privacy", label: "Privacy" },
];

export function PublicHeader() {
  const [opened, { toggle, close }] = useDisclosure();
  return (
    <Box component="header" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
      <Container size="lg" h={64}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Logo />
          <Group gap="lg" visibleFrom="sm" component="nav" aria-label="Main">
            {LINKS.map((l) => (
              <Anchor key={l.href} component={Link} href={l.href} c="dimmed" size="sm" fw={500}>
                {l.label}
              </Anchor>
            ))}
          </Group>
          <Group gap="sm" visibleFrom="sm">
            <ThemeToggle />
            <Button component={Link} href="/login" variant="default">
              Sign in
            </Button>
            <Button component={Link} href="/register">
              Get started
            </Button>
          </Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" aria-label="Open menu" />
        </Group>
      </Container>
      <Drawer opened={opened} onClose={close} title="Menu" hiddenFrom="sm" size="xs">
        <Stack>
          {LINKS.map((l) => (
            <Anchor key={l.href} component={Link} href={l.href} onClick={close}>
              {l.label}
            </Anchor>
          ))}
          <Button component={Link} href="/login" variant="default" onClick={close}>
            Sign in
          </Button>
          <Button component={Link} href="/register" onClick={close}>
            Get started
          </Button>
          <ThemeToggle />
        </Stack>
      </Drawer>
    </Box>
  );
}
