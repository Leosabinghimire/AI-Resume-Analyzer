import { SimpleGrid } from "@mantine/core";
import { IconDatabase, IconRobot, IconShieldLock, IconUserCheck } from "@tabler/icons-react";
import type { Metadata } from "next";
import { Section } from "@/components/marketing/Section";
import { BulletList, SectionCard } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy & data handling" };

const TOPICS = [
  {
    icon: IconDatabase,
    title: "What is stored",
    items: [
      "Your account: name, email, and a salted Argon2 password hash. Passwords are never stored.",
      "Uploaded resume files, kept privately per account under randomly generated file names.",
      "Extracted text, structured resume versions, saved job descriptions and analysis results.",
    ],
  },
  {
    icon: IconRobot,
    title: "What is sent to an AI provider",
    items: [
      "Nothing, unless you turn on AI processing in Settings.",
      "Parsing and match scoring always run on the server without AI.",
      "When enabled, a redacted copy is sent: name, email, phone number and links are removed first.",
      "The job description you compare against is included so suggestions can be tailored.",
      "Every result is labeled as AI-generated or rule-based demo output.",
    ],
  },
  {
    icon: IconUserCheck,
    title: "Your controls",
    items: [
      "Delete any resume, version, job, analysis or report at any time.",
      "Deleting your account permanently removes all of your data and uploaded files.",
      "Withdraw AI consent at any time; deterministic features keep working.",
    ],
  },
  {
    icon: IconShieldLock,
    title: "Security measures",
    items: [
      "httpOnly, SameSite session cookies with CSRF protection on every write.",
      "Strict file validation by content signature, size and page limits.",
      "Ownership checks on every resource; other users' data is never accessible.",
      "Resume contents, passwords and tokens are never written to logs.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <Section
      eyebrow="Privacy"
      title="How your data is handled"
      subtitle="Resumes contain personal information. This is exactly what the application stores, sends and protects."
    >
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {TOPICS.map((t) => (
          <SectionCard key={t.title} title={t.title} icon={<t.icon size={18} />}>
            <BulletList items={t.items} variant="check" />
          </SectionCard>
        ))}
      </SimpleGrid>
    </Section>
  );
}
