import { Group, Progress, Stack, Text } from "@mantine/core";
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
              <Text size="sm" fw={600}>
                {c.label}
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {c.applicable ? `${Math.round(c.score ?? 0)}/100 · weight ${effectiveWeight}%` : "Not applicable"}
              </Text>
            </Group>
            <Progress
              value={c.applicable ? (c.score ?? 0) : 0}
              color={c.applicable ? scoreBand(c.score ?? 0).color : "gray"}
              size="sm"
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
