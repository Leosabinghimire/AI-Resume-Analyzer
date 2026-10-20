"use client";

import { AppShell, Box, Burger, Button, Center, Group, Loader, NavLink, ScrollArea, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSessionGuard } from "@/features/auth/useSessionGuard";
import classes from "./AppLayout.module.css";
import { Logo } from "./Logo";
import { isNavActive, NAV_SECTIONS } from "./navigation";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main navigation">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <div className={classes.sectionLabel}>{section.label}</div>
          {section.items.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              leftSection={<item.icon size={19} stroke={1.7} />}
              active={isNavActive(item, pathname)}
              className={classes.navLink}
              variant="subtle"
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure();
  const pathname = usePathname();
  const { user, unreachable } = useSessionGuard();

  useEffect(close, [pathname, close]);

  if (!user) {
    return (
      <Center h="100vh" aria-busy="true">
        {unreachable ? (
          <Text c="red">Could not reach the server. Please refresh the page.</Text>
        ) : (
          <Loader aria-label="Loading your workspace" />
        )}
      </Center>
    );
  }

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 264, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding={0}
    >
      <AppShell.Header className={classes.header}>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
            <Logo href="/dashboard" />
          </Group>
          <Group gap="sm" wrap="nowrap">
            <Button
              component={Link}
              href="/analyses/new"
              leftSection={<IconPlus size={16} />}
              size="sm"
              visibleFrom="xs"
            >
              New analysis
            </Button>
            <ThemeToggle />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" className={classes.navbar}>
        <AppShell.Section grow component={ScrollArea} mx={-4} px={4}>
          <SidebarNav pathname={pathname} />
        </AppShell.Section>
        <AppShell.Section className={classes.userCard}>
          <Stack gap="xs">
            <Text size="xs" c="dimmed" px={8}>
              Scores are a transparent heuristic, not an ATS score.
            </Text>
            <UserMenu user={user} />
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main className={classes.main}>
        <Box maw="var(--app-content-max-width)" mx="auto" px={{ base: "md", sm: "xl" }} py={{ base: "lg", sm: "xl" }}>
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
