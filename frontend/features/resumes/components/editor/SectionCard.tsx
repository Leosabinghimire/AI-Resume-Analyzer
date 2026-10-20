import { ActionIcon, Card, Group, Text, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** Bordered container for one repeatable entry (a job, degree, project...). */
export function EntryCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  return (
    <Card padding="md" bg="var(--mantine-color-default-hover)">
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Text fw={600} size="sm" truncate>
          {title}
        </Text>
        <Tooltip label="Remove entry" multiline={false}>
          <ActionIcon variant="subtle" color="red" onClick={onRemove} aria-label={`Remove ${title}`}>
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {children}
    </Card>
  );
}

export function newId(): string {
  return Math.random().toString(16).slice(2, 14).padEnd(12, "0");
}
