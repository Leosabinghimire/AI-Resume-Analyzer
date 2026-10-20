import { Group, Progress, Stack, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { scoreBand } from "@/lib/format";
import type { ScoreComponent } from "@/types/api";

export function ScoreBreakdown({ components }: { components: ScoreComponent[] }) {
  const applicableWeight = components.filter((c) => c.applicable).reduce((sum, c) => sum + c.weight, 0);
  return (
    <Stack gap="md">
      {components.map((c) => {
        const effectiveWeight = c.applicable && applicableWeight ? Math.round((c.weight / applicableWeight) * 100) : 0;
        return (
          <Stack key={c.key} gap={4}>
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Group gap={6} wrap="nowrap">
                <Text size="sm" fw={500}>
                  {c.label}
                </Text>
                <Tooltip label={c.explanation}>
                  <IconInfoCircle size={15} aria-label={`About ${c.label}`} style={{ opacity: 0.6 }} />
                </Tooltip>
              </Group>
              <Text size="sm" c="dimmed">
                {c.applicable ? `${Math.round(c.score ?? 0)}/100 · weight ${effectiveWeight}%` : "Not applicable"}
              </Text>
            </Group>
            <Progress
              value={c.applicable ? (c.score ?? 0) : 0}
              color={c.applicable ? scoreBand(c.score ?? 0).color : "gray"}
              size="md"
              radius="xl"
              aria-label={`${c.label} score`}
            />
            <Text size="xs" c="dimmed">
              {c.explanation}
            </Text>
          </Stack>
        );
      })}
    </Stack>
  );
}
