import { RingProgress, Stack, Text } from "@mantine/core";
import { scoreBand } from "@/lib/format";

interface ScoreRingProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export function ScoreRing({ score, size = 140, showLabel = true }: ScoreRingProps) {
  const band = scoreBand(score);
  const thickness = Math.max(6, Math.round(size / 11));
  return (
    <Stack align="center" gap={4}>
      <RingProgress
        size={size}
        thickness={thickness}
        roundCaps
        sections={[{ value: score, color: band.color }]}
        aria-label={`Match score ${score} out of 100`}
        label={
          <Text ta="center" fw={700} fz={size / 4.2} lh={1}>
            {score}
          </Text>
        }
      />
      {showLabel && (
        <Text size="sm" c={band.color} fw={600}>
          {band.label}
        </Text>
      )}
    </Stack>
  );
}

export function ScoreBadgeText({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <Text component="span" fw={700} c={band.color}>
      {score}
    </Text>
  );
}
