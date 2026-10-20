import { Paper, Text } from "@mantine/core";
import type { ReactNode } from "react";

/** Compact label/value pair for secondary metrics inside a section. */
export function MetricTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Paper p="md" radius="md" bg="var(--app-surface-muted)" withBorder style={{ borderColor: "var(--app-border)" }}>
      <Text size="xs" c="dimmed" fw={500}>
        {label}
      </Text>
      <Text fw={700} fz="lg" mt={2}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed" mt={2}>
          {hint}
        </Text>
      )}
    </Paper>
  );
}
