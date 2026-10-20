import { Card, Group, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: ReactNode;
  color?: string;
  href?: string;
}

export function StatCard({ label, value, icon, hint, color = "brand", href }: StatCardProps) {
  const card = (
    <Card padding="lg" h="100%" style={href ? { transition: "box-shadow 150ms ease" } : undefined}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={6}>
          <Text size="sm" c="dimmed" fw={500}>
            {label}
          </Text>
          <Text fz={30} fw={700} lh={1}>
            {value}
          </Text>
          {hint && (
            <Text size="xs" c="dimmed">
              {hint}
            </Text>
          )}
        </Stack>
        <ThemeIcon variant="light" color={color} size={44} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );
  if (!href) return card;
  return (
    <UnstyledButton component={Link} href={href} aria-label={`${label}: ${String(value)}`} display="block" h="100%">
      {card}
    </UnstyledButton>
  );
}
