import { Alert, Button, Group, Skeleton, Stack } from "@mantine/core";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { errorMessage } from "@/lib/api-client";

export function LoadingBlock({ rows = 3, height = 72 }: { rows?: number; height?: number }) {
  return (
    <Stack gap="sm" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} radius="lg" />
      ))}
    </Stack>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert color="red" icon={<IconAlertCircle size={18} />} title="Could not load data" role="alert">
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

interface QueryBoundaryProps<T> {
  query: Pick<UseQueryResult<T>, "data" | "error" | "isPending" | "refetch">;
  children: (data: T) => ReactNode;
  loading?: ReactNode;
}

/** Renders loading and error states for a query, and the children once data is available. */
export function QueryBoundary<T>({ query, children, loading }: QueryBoundaryProps<T>) {
  if (query.error) return <ErrorBlock error={query.error} onRetry={() => void query.refetch()} />;
  if (query.isPending || query.data === undefined) return <>{loading ?? <LoadingBlock />}</>;
  return <>{children(query.data)}</>;
}
