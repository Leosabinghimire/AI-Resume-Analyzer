"use client";

import { SimpleGrid, Stack, Textarea, TextInput } from "@mantine/core";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { ResumeData } from "@/types/api";
import { AddEntryButton, EntryCard, newId } from "./EntryCard";

export function EducationEditor() {
  const { control, register, watch } = useFormContext<ResumeData>();
  const { fields, append, remove } = useFieldArray({ control, name: "education", keyName: "_key" });

  return (
    <Stack gap="md">
      {fields.map((field, index) => (
        <EntryCard
          key={field._key}
          title={watch(`education.${index}.degree`) || watch(`education.${index}.institution`) || `Education ${index + 1}`}
          onRemove={() => remove(index)}
        >
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput label="Degree" maxLength={200} {...register(`education.${index}.degree`)} />
            <TextInput label="Field of study" maxLength={200} {...register(`education.${index}.field_of_study`)} />
            <TextInput label="Institution" maxLength={200} {...register(`education.${index}.institution`)} />
            <SimpleGrid cols={2} spacing="sm">
              <TextInput label="Start" maxLength={30} {...register(`education.${index}.start_date`)} />
              <TextInput label="End" maxLength={30} {...register(`education.${index}.end_date`)} />
            </SimpleGrid>
          </SimpleGrid>
          <Textarea label="Details" autosize minRows={1} maxLength={1000} mt="sm" {...register(`education.${index}.details`)} />
        </EntryCard>
      ))}
      <AddEntryButton label="Add education" onClick={() =>
          append({ id: newId(), institution: "", degree: "", field_of_study: "", start_date: "", end_date: "", details: "" })} />
    </Stack>
  );
}

export function CertificationsEditor() {
  const { control, register, watch } = useFormContext<ResumeData>();
  const { fields, append, remove } = useFieldArray({ control, name: "certifications", keyName: "_key" });

  return (
    <Stack gap="md">
      {fields.map((field, index) => (
        <EntryCard
          key={field._key}
          title={watch(`certifications.${index}.name`) || `Certification ${index + 1}`}
          onRemove={() => remove(index)}
        >
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <TextInput label="Name" maxLength={200} {...register(`certifications.${index}.name`)} />
            <TextInput label="Issuer" maxLength={200} {...register(`certifications.${index}.issuer`)} />
            <TextInput label="Date" maxLength={30} {...register(`certifications.${index}.date`)} />
          </SimpleGrid>
        </EntryCard>
      ))}
      <AddEntryButton label="Add certification" onClick={() => append({ id: newId(), name: "", issuer: "", date: "" })} />
    </Stack>
  );
}
