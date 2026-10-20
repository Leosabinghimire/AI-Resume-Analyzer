import { Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  /** Compact variant for use inside a SectionCard. */
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <Paper
      withBorder={!compact}
      p={compact ? "md" : "xl"}
      radius="lg"
      bg={compact ? "transparent" : "var(--app-surface)"}
      style={{ borderStyle: "dashed", borderColor: "var(--app-border)" }}
    >
      <Stack align="center" gap="sm" py={compact ? "sm" : "xl"} ta="center">
        <ThemeIcon size={compact ? 44 : 56} radius="xl" variant="light">
          {icon}
        </ThemeIcon>
        <Title order={compact ? 5 : 4}>{title}</Title>
        <Text c="dimmed" size="sm" maw={440}>
          {description}
        </Text>
        {action && <div style={{ marginTop: 4 }}>{action}</div>}
      </Stack>
    </Paper>
  );
}
