"use client";

import { Alert, Badge, Button, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconChecklist,
  IconKey,
  IconLayoutList,
  IconListDetails,
  IconTextSpellcheck,
  IconUserCircle,
} from "@tabler/icons-react";
import { BulletList, MetricTile, PriorityList, SectionCard } from "@/components/ui";
import { percent } from "@/lib/format";
import type { Feedback } from "@/types/api";
import { useApplySuggestions } from "../useApplySuggestions";
import { ApplyButton, VerifyBadge, WeakBulletItem } from "./SuggestionParts";

function MetricsRow({ feedback }: { feedback: Feedback }) {
  const m = feedback.metrics;
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      <MetricTile label="Bullets with numbers" value={percent(m.quantified_bullet_ratio)} />
      <MetricTile label="Start with action verb" value={percent(m.action_verb_ratio)} />
      <MetricTile label="Avg. words per bullet" value={m.avg_bullet_words} />
      <MetricTile label="Vague phrases" value={m.vague_phrase_count} />
    </SimpleGrid>
  );
}

/** One feedback report: measured metrics, findings, and suggestions that can be applied to the draft. */
export function FeedbackReport({ feedback, onApplied }: { feedback: Feedback; onApplied: () => void }) {
  const apply = useApplySuggestions(onApplied);
  const r = feedback.result;
  const summary = r.summary_suggestion;

  return (
    <Stack gap="lg">
      <Text>{r.overall_summary}</Text>
      <MetricsRow feedback={feedback} />

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <SectionCard title="Structure" icon={<IconLayoutList size={18} />}>
          <BulletList items={r.structure_feedback} />
        </SectionCard>
        <SectionCard title="Readability" icon={<IconListDetails size={18} />}>
          <BulletList items={r.readability_feedback} />
        </SectionCard>
      </SimpleGrid>

      {r.checklist.length > 0 && (
        <SectionCard title="Improvement checklist" icon={<IconChecklist size={18} />}>
          <PriorityList items={r.checklist.map((c) => ({ key: c.item, priority: c.priority, detail: c.item }))} />
        </SectionCard>
      )}

      <SectionCard
        title={`Bullet points to strengthen (${r.weak_bullets.length})`}
        description="Applying a suggestion changes your unsaved draft only. Bracketed placeholders must be replaced with real facts before you can save."
      >
        {r.weak_bullets.length === 0 ? (
          <Text size="sm" c="dimmed">
            No weak bullets found.
          </Text>
        ) : (
          <Stack gap="sm">
            {r.weak_bullets.map((wb, index) => (
              <WeakBulletItem
                key={`${wb.original}-${index}`}
                bullet={wb}
                applied={apply.isApplied(`bullet:${wb.original}`)}
                onApply={() => apply.applyBullet(wb.original, wb.suggestion)}
              />
            ))}
          </Stack>
        )}
      </SectionCard>

      {summary && (
        <SectionCard title="Suggested professional summary" icon={<IconUserCircle size={18} />}>
          <Stack gap="sm">
            <Text size="sm">{summary.suggested_summary}</Text>
            <Text size="xs" c="dimmed">
              {summary.rationale}
            </Text>
            <Group gap="xs">
              {summary.requires_verification && <VerifyBadge />}
              <ApplyButton
                applied={apply.isApplied("summary")}
                label="Use as summary"
                onClick={() => apply.applySummary(summary.suggested_summary)}
              />
            </Group>
          </Stack>
        </SectionCard>
      )}

      {r.keyword_recommendations.length > 0 && (
        <SectionCard title="Keyword recommendations" icon={<IconKey size={18} />}>
          <Alert color="orange" icon={<IconAlertTriangle size={16} />} mb="md" p="xs">
            <Text size="xs">Add a keyword only if it truthfully describes your experience.</Text>
          </Alert>
          <Stack gap="sm">
            {r.keyword_recommendations.map((k) => (
              <Group key={k.keyword} gap="sm" wrap="nowrap" align="flex-start">
                <Badge variant="light">{k.keyword}</Badge>
                <Text size="sm">{k.reason}</Text>
              </Group>
            ))}
          </Stack>
        </SectionCard>
      )}

      {r.grammar_suggestions.length > 0 && (
        <SectionCard title="Grammar & clarity" icon={<IconTextSpellcheck size={18} />}>
          <Stack gap="sm">
            {r.grammar_suggestions.map((g) => (
              <Group key={g.original} justify="space-between" wrap="nowrap" align="flex-start">
                <div>
                  <Text size="sm">{g.suggestion}</Text>
                  <Text size="xs" c="dimmed">
                    {g.explanation}
                  </Text>
                </div>
                <Button
                  size="xs"
                  variant="light"
                  disabled={apply.isApplied(`grammar:${g.original}`)}
                  onClick={() => apply.applyGrammar(g.original, g.suggestion)}
                >
                  Apply
                </Button>
              </Group>
            ))}
          </Stack>
        </SectionCard>
      )}

      <Text size="xs" c="dimmed">
        Feedback is guidance, not a guarantee of results with any applicant tracking system or employer.
      </Text>
    </Stack>
  );
}
