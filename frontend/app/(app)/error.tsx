"use client";

import { Alert, Button, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Stack maw={560} mx="auto" mt="xl">
      <Alert color="red" variant="light" icon={<IconAlertTriangle size={20} />} title="This page failed to load">
        <Text size="sm" mb="sm">
          An unexpected error occurred while displaying this page. Your data is safe.
        </Text>
        <Button size="xs" color="red" variant="white" onClick={reset}>
          Try again
        </Button>
      </Alert>
    </Stack>
  );
}
