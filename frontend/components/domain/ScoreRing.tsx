import { Badge, RingProgress, Stack, Text } from "@mantine/core";
import { scoreBand } from "@/lib/format";

interface ScoreRingProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export function ScoreRing({ score, size = 140, showLabel = true }: ScoreRingProps) {
  const band = scoreBand(score);
  const thickness = Math.max(6, Math.round(size / 12));
  return (
    <Stack align="center" gap={8}>
      <RingProgress
        size={size}
        thickness={thickness}
        roundCaps
        rootColor="var(--app-border)"
        sections={[{ value: score, color: band.color }]}
        aria-label={`Match score ${score} out of 100`}
        label={
          <Stack gap={0} align="center">
            <Text fw={750} fz={size / 4} lh={1} style={{ letterSpacing: "-0.02em" }}>
              {score}
            </Text>
            {size >= 120 && (
              <Text size="xs" c="dimmed" mt={2}>
                out of 100
              </Text>
            )}
          </Stack>
        }
      />
      {showLabel && (
        <Badge color={band.color} variant="light" size="lg">
          {band.label}
        </Badge>
      )}
    </Stack>
  );
}

/** Inline score for tables and lists. */
export function ScoreBadge({ score }: { score: number }) {
  return (
    <Badge color={scoreBand(score).color} variant="light" size="lg" miw={46} aria-label={`Score ${score}`}>
      {score}
    </Badge>
  );
}
