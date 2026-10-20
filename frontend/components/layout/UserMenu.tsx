"use client";

import { Avatar, Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { IconLogout, IconSelector, IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLogout } from "@/features/auth/api";
import type { User } from "@/types/api";

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

/** Account card at the bottom of the sidebar with a menu for settings and sign-out. */
export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const logout = useLogout();
  return (
    <Menu position="top-start" width={240} withinPortal>
      <Menu.Target>
        <UnstyledButton aria-label="Account menu" w="100%" p={8} style={{ borderRadius: "var(--mantine-radius-md)" }}>
          <Group gap="sm" wrap="nowrap">
            <Avatar radius="xl" size={36} color="brand" variant="light">
              {initials(user.full_name)}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={600} truncate>
                {user.full_name}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {user.email}
              </Text>
            </div>
            <IconSelector size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
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
  );
}
