"use client";

import { SimpleGrid, Stack, TagsInput, TextInput } from "@mantine/core";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import type { ResumeData } from "@/types/api";
import { BulletListInput } from "./BulletListInput";
import { AddEntryButton, EntryCard, newId } from "./EntryCard";

export function ExperienceEditor() {
  const { control, register, watch } = useFormContext<ResumeData>();
  const { fields, append, remove } = useFieldArray({ control, name: "experience", keyName: "_key" });

  return (
    <Stack gap="md">
      {fields.map((field, index) => {
        const title = watch(`experience.${index}.title`) || watch(`experience.${index}.company`) || `Role ${index + 1}`;
        return (
          <EntryCard key={field._key} title={title} onRemove={() => remove(index)}>
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput label="Job title" maxLength={200} {...register(`experience.${index}.title`)} />
                <TextInput label="Company" maxLength={200} {...register(`experience.${index}.company`)} />
                <TextInput label="Start date" placeholder="e.g. Jan 2022" maxLength={30} {...register(`experience.${index}.start_date`)} />
                <TextInput label="End date" placeholder="e.g. Present" maxLength={30} {...register(`experience.${index}.end_date`)} />
              </SimpleGrid>
              <TextInput label="Location" maxLength={200} {...register(`experience.${index}.location`)} />
              <Controller
                control={control}
                name={`experience.${index}.bullets`}
                render={({ field: f }) => <BulletListInput value={f.value} onChange={f.onChange} itemLabel={title} />}
              />
            </Stack>
          </EntryCard>
        );
      })}
      <AddEntryButton label="Add experience" onClick={() => append({ id: newId(), title: "", company: "", location: "", start_date: "", end_date: "", bullets: [""] })} />
    </Stack>
  );
}

export function ProjectsEditor() {
  const { control, register, watch } = useFormContext<ResumeData>();
  const { fields, append, remove } = useFieldArray({ control, name: "projects", keyName: "_key" });

  return (
    <Stack gap="md">
      {fields.map((field, index) => {
        const title = watch(`projects.${index}.name`) || `Project ${index + 1}`;
        return (
          <EntryCard key={field._key} title={title} onRemove={() => remove(index)}>
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput label="Project name" maxLength={200} {...register(`projects.${index}.name`)} />
                <TextInput label="URL" maxLength={300} {...register(`projects.${index}.url`)} />
              </SimpleGrid>
              <Controller
                control={control}
                name={`projects.${index}.technologies`}
                render={({ field: f }) => (
                  <TagsInput label="Technologies" value={f.value} onChange={f.onChange} maxTags={40} clearable />
                )}
              />
              <Controller
                control={control}
                name={`projects.${index}.bullets`}
                render={({ field: f }) => <BulletListInput value={f.value} onChange={f.onChange} itemLabel={title} />}
              />
            </Stack>
          </EntryCard>
        );
      })}
      <AddEntryButton label="Add project" onClick={() => append({ id: newId(), name: "", url: "", technologies: [], bullets: [""] })} />
    </Stack>
  );
}
