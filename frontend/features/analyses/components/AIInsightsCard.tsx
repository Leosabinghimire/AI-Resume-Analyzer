"use client";

import { Alert, Button, Card, Group, List, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle, IconLock, IconRefresh, IconSparkles } from "@tabler/icons-react";
import { AISourceBadge } from "@/components/common/AISourceBadge";
import { ConsentRequiredAlert } from "@/features/coaching/components/AIAccessNotice";
import { notifyError } from "@/lib/notify";
import type { Analysis } from "@/types/api";
import { useRegenerateInsights } from "../api";

export function AIInsightsCard({ analysis }: { analysis: Analysis }) {
  const regenerate = useRegenerateInsights(analysis.id);
  const insights = analysis.ai_insights;
  const retry = (
    <Button
      size="xs"
      variant="light"
      leftSection={<IconRefresh size={14} />}
      loading={regenerate.isPending}
      onClick={() => regenerate.mutate(undefined, { onError: (e) => notifyError(e, "AI insights failed") })}
    >
      {insights ? "Regenerate" : analysis.ai_status === "failed" ? "Retry" : "Generate insights"}
    </Button>
  );

  return (
    <Card>
      <Group justify="space-between" mb="sm" wrap="wrap">
        <Group gap="xs">
          <IconSparkles size={20} aria-hidden />
          <Title order={4}>Semantic insights</Title>
          {analysis.ai_provider && insights && <AISourceBadge isMock={analysis.ai_is_mock} model={analysis.ai_model} />}
        </Group>
        {retry}
      </Group>

      {analysis.ai_status === "skipped_no_consent" && <ConsentRequiredAlert />}
      {analysis.ai_status === "not_requested" && !insights && (
        <Alert color="gray" variant="light" icon={<IconLock size={18} />}>
          AI insights were not requested for this analysis. The score and findings above are complete without them.
        </Alert>
      )}
      {analysis.ai_status === "failed" && (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} title="AI insights unavailable">
          {analysis.ai_message ?? "The AI provider did not respond."} The deterministic analysis above is unaffected.
        </Alert>
      )}

      {insights && (
        <Stack gap="md">
          <Text size="sm">{insights.summary}</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <div>
              <Text size="sm" fw={600} mb={4}>
                Strengths
              </Text>
              <List size="sm" spacing={4}>
                {insights.strengths.map((s) => (
                  <List.Item key={s}>{s}</List.Item>
                ))}
              </List>
            </div>
            <div>
              <Text size="sm" fw={600} mb={4}>
                Gaps
              </Text>
              {insights.gaps.length ? (
                <List size="sm" spacing={4}>
                  {insights.gaps.map((g) => (
                    <List.Item key={g}>{g}</List.Item>
                  ))}
                </List>
              ) : (
                <Text size="sm" c="dimmed">
                  No significant gaps identified.
                </Text>
              )}
            </div>
          </SimpleGrid>
          {insights.transferable_skills.length > 0 && (
            <div>
              <Text size="sm" fw={600} mb={4}>
                Transferable skills
              </Text>
              <Stack gap={6}>
                {insights.transferable_skills.map((t) => (
                  <Text key={t.missing_skill} size="sm">
                    <Text span fw={600}>
                      {t.missing_skill}:
                    </Text>{" "}
                    {t.explanation}{" "}
                    <Text span c="dimmed" size="xs">
                      (evidence: “{t.related_evidence}”)
                    </Text>
                  </Text>
                ))}
              </Stack>
            </div>
          )}
          {insights.recommendations.length > 0 && (
            <div>
              <Text size="sm" fw={600} mb={4}>
                Recommendations
              </Text>
              <List size="sm" spacing={4}>
                {insights.recommendations.map((r) => (
                  <List.Item key={r}>{r}</List.Item>
                ))}
              </List>
            </div>
          )}
        </Stack>
      )}
    </Card>
  );
}
