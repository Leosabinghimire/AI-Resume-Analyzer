"use client";

import { Alert, Button, SimpleGrid, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { IconAlertCircle, IconLock, IconRefresh, IconSparkles } from "@tabler/icons-react";
import { AISourceBadge, BulletList, SectionCard } from "@/components/ui";
import { ConsentRequiredAlert } from "@/features/coaching/components/AIAccessNotice";
import { notifyError } from "@/lib/notify";
import type { Analysis } from "@/types/api";
import { useRegenerateInsights } from "../api";

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text size="sm" fw={600} mb={6}>
        {label}
      </Text>
      {children}
    </div>
  );
}

export function AIInsightsCard({ analysis }: { analysis: Analysis }) {
  const regenerate = useRegenerateInsights(analysis.id);
  const insights = analysis.ai_insights;
  const retryLabel = insights ? "Regenerate" : analysis.ai_status === "failed" ? "Retry" : "Generate insights";

  return (
    <SectionCard
      title="Semantic insights"
      icon={<IconSparkles size={18} />}
      description={insights && analysis.ai_provider ? <AISourceBadge isMock={analysis.ai_is_mock} model={analysis.ai_model} /> : undefined}
      actions={
        <Button
          size="xs"
          variant="light"
          leftSection={<IconRefresh size={14} />}
          loading={regenerate.isPending}
          onClick={() => regenerate.mutate(undefined, { onError: (e) => notifyError(e, "AI insights failed") })}
        >
          {retryLabel}
        </Button>
      }
    >
      {analysis.ai_status === "skipped_no_consent" && <ConsentRequiredAlert />}
      {analysis.ai_status === "not_requested" && !insights && (
        <Alert color="gray" icon={<IconLock size={18} />}>
          AI insights were not requested for this analysis. The score and findings above are complete without them.
        </Alert>
      )}
      {analysis.ai_status === "failed" && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} title="AI insights unavailable">
          {analysis.ai_message ?? "The AI provider did not respond."} The deterministic analysis above is unaffected.
        </Alert>
      )}
      {insights && (
        <Stack gap="lg">
          <Text size="sm">{insights.summary}</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <Labeled label="Strengths">
              <BulletList items={insights.strengths} variant="check" />
            </Labeled>
            <Labeled label="Gaps">
              <BulletList items={insights.gaps} empty="No significant gaps identified." />
            </Labeled>
          </SimpleGrid>
          {insights.transferable_skills.length > 0 && (
            <Labeled label="Transferable skills">
              <BulletList
                items={insights.transferable_skills.map((t) => (
                  <>
                    <Text span fw={600}>
                      {t.missing_skill}:
                    </Text>{" "}
                    {t.explanation}{" "}
                    <Text span c="dimmed" size="xs">
                      (evidence: “{t.related_evidence}”)
                    </Text>
                  </>
                ))}
              />
            </Labeled>
          )}
          {insights.recommendations.length > 0 && (
            <Labeled label="Recommendations">
              <BulletList items={insights.recommendations} />
            </Labeled>
          )}
        </Stack>
      )}
    </SectionCard>
  );
}
