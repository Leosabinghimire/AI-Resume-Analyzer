"use client";

import { AppShell, Avatar, Burger, Center, Group, Loader, Menu, NavLink, ScrollArea, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconFileText,
  IconGauge,
  IconHistory,
  IconLogout,
  IconMessageQuestion,
  IconSettings,
  IconTargetArrow,
  IconBriefcase,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useLogout, useMe } from "@/features/auth/api";
import { ApiError, onUnauthorized } from "@/lib/api-client";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: IconGauge },
  { href: "/resumes", label: "Resumes", icon: IconFileText },
  { href: "/jobs", label: "Job descriptions", icon: IconBriefcase },
  { href: "/analyses/new", label: "Match resume", icon: IconTargetArrow },
  { href: "/analyses", label: "Analysis history", icon: IconHistory },
  { href: "/interview-prep", label: "Interview prep", icon: IconMessageQuestion },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/analyses") return pathname === "/analyses" || /^\/analyses\/(?!new)/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe();
  const logout = useLogout();

  const redirectToLogin = (reason: string) => {
    queryClient.clear();
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    router.replace(`/login?next=${next}${reason === "session_expired" ? "&expired=1" : ""}`);
  };

  useEffect(() => {
    onUnauthorized(redirectToLogin);
    return () => onUnauthorized(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) redirectToLogin(me.error.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.error]);

  useEffect(close, [pathname, close]);

  if (!me.data) {
    return (
      <Center h="100vh" aria-busy="true">
        {me.error && !(me.error instanceof ApiError && me.error.status === 401) ? (
          <Text c="red">Could not reach the server. Please refresh the page.</Text>
        ) : (
          <Loader aria-label="Loading your workspace" />
        )}
      </Center>
    );
  }

  const user = me.data;
  const initials = user.full_name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding={{ base: "md", sm: "lg" }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
            <Logo href="/dashboard" />
          </Group>
          <Group gap="sm" wrap="nowrap">
            <ThemeToggle />
            <Menu position="bottom-end" width={220} withinPortal>
              <Menu.Target>
                <UnstyledButton aria-label="Account menu">
                  <Group gap={8} wrap="nowrap">
                    <Avatar radius="xl" size={32} color="brand">
                      {initials}
                    </Avatar>
                    <Text size="sm" fw={500} visibleFrom="sm" maw={160} truncate>
                      {user.full_name}
                    </Text>
                    <IconChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user.email}</Menu.Label>
                <Menu.Item component={Link} href="/settings" leftSection={<IconSettings size={16} />}>
                  Account settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={16} />}
                  onClick={() => logout.mutate(undefined, { onSettled: () => router.replace("/login") })}
                >
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" aria-label="Main navigation">
        <AppShell.Section grow component={ScrollArea}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              leftSection={<item.icon size={18} stroke={1.6} />}
              active={isActive(pathname, item.href)}
              variant="light"
              style={{ borderRadius: "var(--mantine-radius-md)" }}
              mb={2}
            />
          ))}
        </AppShell.Section>
        <AppShell.Section>
          <Text size="xs" c="dimmed" px="sm" py="xs">
            Match scores are a transparent heuristic, not an ATS score.
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>{children}</div>
      </AppShell.Main>
    </AppShell>
  );
}
