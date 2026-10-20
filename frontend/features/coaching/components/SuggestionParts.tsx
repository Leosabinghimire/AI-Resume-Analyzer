"use client";

import { Badge, Button, Group, Paper, Stack, Text, Tooltip } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconWand } from "@tabler/icons-react";
import type { WeakBullet } from "@/types/api";

export function VerifyBadge() {
  return (
    <Tooltip label="This suggestion adds a placeholder or a detail that is not in your resume. Replace or confirm it with real facts before saving.">
      <Badge color="orange" variant="light" leftSection={<IconAlertTriangle size={12} />}>
        Needs your verification
      </Badge>
    </Tooltip>
  );
}

export function ApplyButton({ applied, onClick, label = "Apply to draft" }: { applied: boolean; onClick: () => void; label?: string }) {
  return (
    <Button
      size="xs"
      variant={applied ? "light" : "filled"}
      color={applied ? "teal" : undefined}
      leftSection={applied ? <IconCheck size={14} /> : <IconWand size={14} />}
      onClick={onClick}
      disabled={applied}
    >
      {applied ? "Applied to draft" : label}
    </Button>
  );
}

/** Before/after view of one weak bullet with its issues and an apply action. */
export function WeakBulletItem({ bullet, applied, onApply }: { bullet: WeakBullet; applied: boolean; onApply: () => void }) {
  return (
    <Paper withBorder p="md" radius="md" bg="var(--app-surface-muted)">
      <Stack gap="sm">
        <Group gap={6}>
          {bullet.issues.map((i) => (
            <Badge key={i} size="xs" variant="outline" color="gray">
              {i}
            </Badge>
          ))}
        </Group>
        <Text size="sm" c="dimmed" td="line-through" style={{ textDecorationColor: "var(--mantine-color-red-4)" }}>
          {bullet.original}
        </Text>
        <Text size="sm" fw={500}>
          {bullet.suggestion}
        </Text>
        <Group gap="xs">
          {bullet.requires_verification && <VerifyBadge />}
          <ApplyButton applied={applied} onClick={onApply} />
        </Group>
      </Stack>
    </Paper>
  );
}
