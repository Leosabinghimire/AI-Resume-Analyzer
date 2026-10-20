"use client";

import { Button, Group, Paper, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconDeviceFloppy } from "@tabler/icons-react";

interface Props {
  versionNumber: number;
  aiApplied: boolean;
  saving: boolean;
  savingInPlace: boolean;
  onDiscard: () => void;
  onSaveInPlace: () => void;
  onSaveAsNew: () => void;
}

/** Sticky action bar shown while the draft differs from the saved version. */
export function UnsavedChangesBar({ versionNumber, aiApplied, saving, savingInPlace, onDiscard, onSaveInPlace, onSaveAsNew }: Props) {
  return (
    <Paper
      withBorder
      shadow="lg"
      p="sm"
      pl="md"
      radius="lg"
      pos="sticky"
      bottom={16}
      mt="lg"
      bg="var(--app-surface)"
      style={{ zIndex: 50 }}
      role="region"
      aria-label="Unsaved changes"
    >
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm">
          <ThemeIcon variant="light" color="yellow" radius="xl">
            <IconAlertTriangle size={16} />
          </ThemeIcon>
          <div>
            <Text size="sm" fw={600}>
              Unsaved changes
            </Text>
            {aiApplied && (
              <Text size="xs" c="dimmed">
                Includes applied suggestions. Review them before saving.
              </Text>
            )}
          </div>
        </Group>
        <Group gap="xs">
          <Button variant="default" onClick={onDiscard} disabled={saving}>
            Discard
          </Button>
          <Button variant="light" onClick={onSaveInPlace} loading={savingInPlace}>
            Save to v{versionNumber}
          </Button>
          <Button leftSection={<IconDeviceFloppy size={16} />} onClick={onSaveAsNew}>
            Save as new version
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
