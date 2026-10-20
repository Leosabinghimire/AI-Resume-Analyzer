"use client";

import { ActionIcon, Button, Group, Stack, Text, Textarea, Tooltip } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  itemLabel: string;
}

export function BulletListInput({ value, onChange, label = "Bullet points", itemLabel }: Props) {
  const update = (index: number, text: string) => onChange(value.map((v, i) => (i === index ? text : v)));
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const move = (index: number, delta: number) => {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      {value.length === 0 && (
        <Text size="xs" c="dimmed">
          No bullet points yet.
        </Text>
      )}
      {value.map((bullet, index) => (
        <Group key={index} gap={6} align="flex-start" wrap="nowrap">
          <Textarea
            value={bullet}
            onChange={(e) => update(index, e.currentTarget.value)}
            autosize
            minRows={1}
            maxRows={6}
            maxLength={1000}
            style={{ flex: 1 }}
            aria-label={`${itemLabel} bullet ${index + 1}`}
          />
          <Group gap={2} wrap="nowrap">
            <Tooltip label="Move up" multiline={false}>
              <ActionIcon variant="subtle" color="gray" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move bullet up">
                <IconArrowUp size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Move down" multiline={false}>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => move(index, 1)}
                disabled={index === value.length - 1}
                aria-label="Move bullet down"
              >
                <IconArrowDown size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Remove bullet" multiline={false}>
              <ActionIcon variant="subtle" color="red" onClick={() => remove(index)} aria-label="Remove bullet">
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      ))}
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconPlus size={14} />}
        onClick={() => onChange([...value, ""])}
        w="fit-content"
        disabled={value.length >= 40}
      >
        Add bullet
      </Button>
    </Stack>
  );
}
