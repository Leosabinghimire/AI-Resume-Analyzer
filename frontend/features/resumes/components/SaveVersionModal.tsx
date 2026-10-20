"use client";

import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSave: (label: string) => void;
  saving: boolean;
  aiAssisted: boolean;
}

export function SaveVersionModal({ opened, onClose, onSave, saving, aiAssisted }: Props) {
  const [label, setLabel] = useState(aiAssisted ? "AI-assisted revision" : "Revised");
  const trimmed = label.trim();
  return (
    <Modal opened={opened} onClose={onClose} title="Save as new version" centered>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onSave(trimmed);
        }}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            The current version stays unchanged. The new version gets its own analyses and can be exported or compared.
          </Text>
          <TextInput
            label="Version label"
            placeholder="e.g. Tailored for backend roles"
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
            maxLength={100}
            required
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!trimmed}>
              Save version
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
