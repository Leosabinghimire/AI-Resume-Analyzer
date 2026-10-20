import { Badge, Card, Group, List, Stack, Text, Title } from "@mantine/core";
import type { VersionComparison } from "@/types/api";

export function VersionDiff({ comparison }: { comparison: VersionComparison }) {
  const changed = comparison.sections.filter((s) => s.changed);
  return (
    <Stack gap="md">
      {changed.length === 0 && (
        <Text size="sm" c="dimmed">
          These versions have identical content.
        </Text>
      )}
      {comparison.sections.map((section) =>
        !section.changed ? null : (
          <Card key={section.section}>
            <Title order={5} mb="xs">
              {section.label}
            </Title>
            {section.segments.length > 0 ? (
              <Text size="sm" lh={1.7}>
                {section.segments.map((seg, i) => (
                  <span key={i} className={seg.op === "insert" ? "diff-insert" : seg.op === "delete" ? "diff-delete" : undefined}>
                    {seg.text}{" "}
                  </span>
                ))}
              </Text>
            ) : (
              <Stack gap="xs">
                {section.removed.length > 0 && (
                  <div>
                    <Badge color="red" variant="light" size="sm" mb={4}>
                      Removed
                    </Badge>
                    <List size="sm" spacing={2}>
                      {section.removed.map((r) => (
                        <List.Item key={`r-${r}`}>
                          <span className="diff-delete">{r}</span>
                        </List.Item>
                      ))}
                    </List>
                  </div>
                )}
                {section.added.length > 0 && (
                  <div>
                    <Badge color="teal" variant="light" size="sm" mb={4}>
                      Added
                    </Badge>
                    <List size="sm" spacing={2}>
                      {section.added.map((a) => (
                        <List.Item key={`a-${a}`}>
                          <span className="diff-insert">{a}</span>
                        </List.Item>
                      ))}
                    </List>
                  </div>
                )}
              </Stack>
            )}
          </Card>
        ),
      )}
      <Group gap="md">
        <Text size="xs" c="dimmed">
          <span className="diff-delete">removed</span> · <span className="diff-insert">added</span>
        </Text>
      </Group>
    </Stack>
  );
}
