import { Badge, Group, Paper, Stack, Text } from "@mantine/core";
import { BulletList } from "@/components/ui";
import type { SectionDiff, VersionComparison } from "@/types/api";

function ListChanges({ section }: { section: SectionDiff }) {
  return (
    <Stack gap="sm">
      {section.removed.length > 0 && (
        <div>
          <Badge color="red" variant="light" size="sm" mb={6}>
            Removed
          </Badge>
          <BulletList items={section.removed.map((r) => <span key={r} className="diff-delete">{r}</span>)} />
        </div>
      )}
      {section.added.length > 0 && (
        <div>
          <Badge color="teal" variant="light" size="sm" mb={6}>
            Added
          </Badge>
          <BulletList items={section.added.map((a) => <span key={a} className="diff-insert">{a}</span>)} />
        </div>
      )}
    </Stack>
  );
}

export function VersionDiff({ comparison }: { comparison: VersionComparison }) {
  const changed = comparison.sections.filter((s) => s.changed);
  if (changed.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        These versions have identical content.
      </Text>
    );
  }
  return (
    <Stack gap="md">
      {changed.map((section) => (
        <Paper key={section.section} withBorder p="md" radius="md" bg="var(--app-surface-muted)">
          <Text fw={600} size="sm" mb="xs">
            {section.label}
          </Text>
          {section.segments.length > 0 ? (
            <Text size="sm" lh={1.8}>
              {section.segments.map((seg, i) => (
                <span key={i} className={seg.op === "insert" ? "diff-insert" : seg.op === "delete" ? "diff-delete" : undefined}>
                  {seg.text}{" "}
                </span>
              ))}
            </Text>
          ) : (
            <ListChanges section={section} />
          )}
        </Paper>
      ))}
      <Group gap="md">
        <Text size="xs" c="dimmed">
          Legend: <span className="diff-delete">removed</span> <span className="diff-insert">added</span>
        </Text>
      </Group>
    </Stack>
  );
}
