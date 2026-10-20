import { Alert, Button, Group, Skeleton, Stack } from "@mantine/core";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { errorMessage } from "@/lib/api-client";

export function LoadingBlock({ rows = 3, height = 72 }: { rows?: number; height?: number }) {
  return (
    <Stack gap="sm" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} radius="md" />
      ))}
    </Stack>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} title="Could not load data" role="alert">
      <Group justify="space-between" gap="sm">
        <span>{errorMessage(error)}</span>
        {onRetry && (
          <Button size="xs" variant="white" color="red" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
            Retry
          </Button>
        )}
      </Group>
    </Alert>
  );
}
