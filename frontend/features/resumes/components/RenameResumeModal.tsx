"use client";

import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useRenameResume } from "../api";

interface Props {
  resumeId: string;
  currentTitle: string;
  opened: boolean;
  onClose: () => void;
}

export function RenameResumeModal({ resumeId, currentTitle, opened, onClose }: Props) {
  const [title, setTitle] = useState(currentTitle);
  const rename = useRenameResume(resumeId);
  const trimmed = title.trim();

  return (
    <Modal opened={opened} onClose={onClose} title="Rename resume" centered>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          rename.mutate(trimmed, {
            onSuccess: () => {
              notifySuccess("Resume renamed.");
              onClose();
            },
            onError: (err) => notifyError(err, "Could not rename"),
          });
        }}
      >
        <Stack>
          <TextInput
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            maxLength={150}
            required
            data-autofocus
            error={trimmed ? undefined : "Title is required"}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={rename.isPending} disabled={!trimmed || trimmed === currentTitle}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
