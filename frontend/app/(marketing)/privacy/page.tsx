import { Container, List, ListItem, Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy & data handling" };

export default function PrivacyPage() {
  return (
    <Container size="md" py={56}>
      <Stack gap="lg">
        <Title order={1}>Privacy & data handling</Title>
        <Text c="dimmed">Resumes contain personal information. This is exactly how this application handles it.</Text>

        <Title order={2} fz="xl">What is stored</Title>
        <List spacing="xs">
          <ListItem>Your account (name, email, and a salted Argon2 password hash; passwords are never stored).</ListItem>
          <ListItem>Uploaded resume files, stored privately per account under randomly generated file names.</ListItem>
          <ListItem>Extracted text, structured resume versions, saved job descriptions and analysis results.</ListItem>
        </List>

        <Title order={2} fz="xl">What is sent to an AI provider</Title>
        <List spacing="xs">
          <ListItem>Nothing, unless you turn on AI processing in Settings.</ListItem>
          <ListItem>Parsing and match scoring always run on the server without AI.</ListItem>
          <ListItem>When enabled, a redacted copy is sent: your name, email, phone number and links are removed first.</ListItem>
          <ListItem>The job description you are comparing against is included so suggestions can be tailored.</ListItem>
          <ListItem>Whether a result came from an AI model or the rule-based demo is labeled on every result.</ListItem>
        </List>

        <Title order={2} fz="xl">Your controls</Title>
        <List spacing="xs">
          <ListItem>Delete any resume, version, job, analysis or report at any time.</ListItem>
          <ListItem>Deleting your account permanently removes all of your data and uploaded files.</ListItem>
          <ListItem>You can withdraw AI consent at any time; deterministic features keep working.</ListItem>
        </List>

        <Title order={2} fz="xl">Security measures</Title>
        <List spacing="xs">
          <ListItem>httpOnly, SameSite session cookies with CSRF protection on every write.</ListItem>
          <ListItem>Strict file validation by content signature, size and page limits.</ListItem>
          <ListItem>Every resource is checked for ownership; other users&apos; data is never accessible.</ListItem>
          <ListItem>Resume contents, passwords and tokens are never written to logs.</ListItem>
        </List>
      </Stack>
    </Container>
  );
}
