import { Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Paper withBorder p="xl" radius="md" style={{ borderStyle: "dashed" }}>
      <Stack align="center" gap="sm" py="lg" ta="center">
        <ThemeIcon size={52} radius="xl" variant="light">
          {icon}
        </ThemeIcon>
        <Title order={4}>{title}</Title>
        <Text c="dimmed" size="sm" maw={460}>
          {description}
        </Text>
        {action}
      </Stack>
    </Paper>
  );
}
