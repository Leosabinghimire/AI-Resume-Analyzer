import { Button, Center, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

export default function NotFound() {
  return (
    <Center mih="80vh" p="md">
      <Stack align="center" gap="sm" ta="center">
        <Text fz={64} fw={800} c="dimmed" lh={1}>
          404
        </Text>
        <Title order={2}>Page not found</Title>
        <Text c="dimmed">The page you are looking for does not exist or was deleted.</Text>
        <Button component={Link} href="/dashboard" mt="sm">
          Go to dashboard
        </Button>
      </Stack>
    </Center>
  );
}
