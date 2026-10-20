import { Badge, Card, Divider, Group, Progress, RingProgress, Stack, Text } from "@mantine/core";

const ROWS = [
  { label: "Required skills", value: 91, color: "teal" },
  { label: "Responsibility alignment", value: 99, color: "teal" },
  { label: "Keyword coverage", value: 69, color: "blue" },
  { label: "Preferred skills", value: 0, color: "red" },
];

/** Static, explicitly labeled example of an analysis result (sample data only). */
export function ProductPreview() {
  return (
    <Card shadow="lg" padding="xl" radius="xl" aria-label="Example analysis using sample data">
      <Group justify="space-between" align="flex-start" mb="lg">
        <div>
          <Text fw={650}>Senior Full-Stack Engineer</Text>
          <Text size="xs" c="dimmed">
            Sample resume vs. sample job
          </Text>
        </div>
        <Badge variant="default">Example · sample data</Badge>
      </Group>
      <Group gap="xl" wrap="nowrap" align="center">
        <RingProgress
          size={112}
          thickness={10}
          roundCaps
          rootColor="var(--app-border)"
          sections={[{ value: 83, color: "teal" }]}
          label={
            <Text ta="center" fw={750} fz={28}>
              83
            </Text>
          }
        />
        <Stack gap="sm" style={{ flex: 1 }}>
          {ROWS.map((r) => (
            <div key={r.label}>
              <Group justify="space-between" mb={4}>
                <Text size="xs" fw={500}>
                  {r.label}
                </Text>
                <Text size="xs" c="dimmed">
                  {r.value}
                </Text>
              </Group>
              <Progress value={r.value} color={r.color} size="sm" aria-hidden />
            </div>
          ))}
        </Stack>
      </Group>
      <Divider my="lg" />
      <Group gap={6}>
        <Text size="xs" c="dimmed" mr={4}>
          Missing
        </Text>
        {["Integration Testing", "Kubernetes", "GraphQL"].map((s) => (
          <Badge key={s} color="red" variant="outline" size="sm">
            {s}
          </Badge>
        ))}
      </Group>
    </Card>
  );
}
