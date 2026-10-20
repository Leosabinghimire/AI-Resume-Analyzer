import { ActionIcon, Button, Card, Group, Text, Tooltip } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** Bordered container for one repeatable entry (a job, degree, project...). */
export function EntryCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  return (
    <Card padding="md" radius="md" shadow="none" bg="var(--app-surface-muted)">
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

export function AddEntryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="light" leftSection={<IconPlus size={16} />} w="fit-content" onClick={onClick}>
      {label}
    </Button>
  );
}
