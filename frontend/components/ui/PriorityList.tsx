import { Badge, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { PRIORITY_META } from "@/lib/constants";
import type { Priority } from "@/types/api";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority];
  return (
    <Badge color={meta.color} variant="light" w={72} style={{ flexShrink: 0 }}>
      {meta.label}
    </Badge>
  );
}

export interface PriorityItem {
  key: string;
  priority: Priority;
  title?: ReactNode;
  detail: ReactNode;
}

/** A list of prioritized findings (improvement areas, checklist items, study topics). */
export function PriorityList({ items, empty }: { items: PriorityItem[]; empty?: string }) {
  if (items.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {empty ?? "Nothing to show."}
      </Text>
    );
  }
  return (
    <Stack gap="md">
      {items.map((item) => (
        <Group key={item.key} align="flex-start" wrap="nowrap" gap="sm">
          <PriorityBadge priority={item.priority} />
          <Stack gap={2} style={{ minWidth: 0 }}>
            {item.title && (
              <Text size="sm" fw={600}>
                {item.title}
              </Text>
            )}
            <Text size="sm" c={item.title ? "dimmed" : undefined}>
              {item.detail}
            </Text>
          </Stack>
        </Group>
      ))}
    </Stack>
  );
}
