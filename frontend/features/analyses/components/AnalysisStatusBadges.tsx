import { Badge, Group, Tooltip } from "@mantine/core";
import type { AnalysisSummary } from "@/types/api";

export function AnalysisStatusBadges({ analysis }: { analysis: AnalysisSummary }) {
  return (
    <Group gap={4} wrap="nowrap">
      {analysis.is_stale && (
        <Tooltip label="The resume version or job was edited after this analysis. Run it again for current results.">
          <Badge color="yellow" variant="light" size="sm" tt="none">
            Outdated
          </Badge>
        </Tooltip>
      )}
      {analysis.ai_status === "failed" && (
        <Badge color="red" variant="light" size="sm" tt="none">
          AI failed
        </Badge>
      )}
    </Group>
  );
}
