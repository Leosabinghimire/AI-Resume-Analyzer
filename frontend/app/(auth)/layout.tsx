import { Box, Center, Container, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box mih="100vh" bg="var(--mantine-color-default-hover)">
      <Group justify="space-between" p="md">
        <Logo />
        <ThemeToggle />
      </Group>
      <Center py={{ base: "md", sm: 48 }} px="md">
        <Container size={440} w="100%" p={0}>
          <Stack gap="lg">
            {children}
            <Text size="xs" c="dimmed" ta="center">
              Your resume is processed locally on our server. It is only sent to an AI provider, in redacted form,
              after you enable AI processing.
            </Text>
          </Stack>
        </Container>
      </Center>
    </Box>
  );
}
