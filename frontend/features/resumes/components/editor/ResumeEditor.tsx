"use client";

import { Accordion, SimpleGrid, Stack, TagsInput, Text, Textarea, TextInput } from "@mantine/core";
import { Controller, useFormContext } from "react-hook-form";
import type { ResumeData } from "@/types/api";
import { CertificationsEditor, EducationEditor } from "./EducationEditor";
import { ExperienceEditor, ProjectsEditor } from "./ExperienceEditor";

const SECTIONS = ["contact", "summary", "skills", "experience", "projects", "education", "certifications"];

export function ResumeEditor() {
  const { control, register, watch } = useFormContext<ResumeData>();
  const counts = {
    skills: watch("skills").length,
    experience: watch("experience").length,
    projects: watch("projects").length,
    education: watch("education").length,
    certifications: watch("certifications").length,
  };
  const count = (n: number) => (
    <Text component="span" size="sm" c="dimmed">
      {" "}
      ({n})
    </Text>
  );

  return (
    <Accordion multiple defaultValue={SECTIONS} variant="separated" chevronPosition="left">
      <Accordion.Item value="contact">
        <Accordion.Control>Contact details</Accordion.Control>
        <Accordion.Panel>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput label="Full name" maxLength={200} {...register("contact.name")} />
            <TextInput label="Email" maxLength={200} {...register("contact.email")} />
            <TextInput label="Phone" maxLength={50} {...register("contact.phone")} />
            <TextInput label="Location" maxLength={200} {...register("contact.location")} />
          </SimpleGrid>
          <Controller
            control={control}
            name="contact.links"
            render={({ field }) => (
              <TagsInput
                mt="sm"
                label="Links"
                description="Portfolio, LinkedIn, GitHub. Press Enter after each link."
                value={field.value}
                onChange={field.onChange}
                maxTags={10}
              />
            )}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="summary">
        <Accordion.Control>Professional summary</Accordion.Control>
        <Accordion.Panel>
          <Textarea
            aria-label="Professional summary"
            autosize
            minRows={3}
            maxRows={10}
            maxLength={3000}
            description="2–4 sentences on your focus, strengths and the kind of role you want."
            {...register("summary")}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="skills">
        <Accordion.Control>Skills{count(counts.skills)}</Accordion.Control>
        <Accordion.Panel>
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <TagsInput
                aria-label="Skills"
                description="Press Enter or comma to add a skill. Only list skills you can discuss in an interview."
                value={field.value}
                onChange={field.onChange}
                maxTags={150}
                clearable
                splitChars={[",", ";"]}
              />
            )}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="experience">
        <Accordion.Control>Work experience{count(counts.experience)}</Accordion.Control>
        <Accordion.Panel>
          <ExperienceEditor />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="projects">
        <Accordion.Control>Projects{count(counts.projects)}</Accordion.Control>
        <Accordion.Panel>
          <ProjectsEditor />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="education">
        <Accordion.Control>Education{count(counts.education)}</Accordion.Control>
        <Accordion.Panel>
          <Stack>
            <EducationEditor />
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="certifications">
        <Accordion.Control>Certifications{count(counts.certifications)}</Accordion.Control>
        <Accordion.Panel>
          <CertificationsEditor />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
