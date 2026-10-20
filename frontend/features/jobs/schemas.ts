import { z } from "zod";

export const MIN_DESCRIPTION_CHARS = 80;

export const jobSchema = z.object({
  title: z.string().trim().min(1, "Enter the job title").max(150, "Title is too long"),
  company: z.string().trim().max(150, "Company name is too long"),
  url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\/\S+\.\S+/.test(v), "Enter a full URL starting with http:// or https://"),
  description: z
    .string()
    .trim()
    .min(MIN_DESCRIPTION_CHARS, `Paste the full job description (at least ${MIN_DESCRIPTION_CHARS} characters)`)
    .max(30000, "The description is too long (30,000 characters max)"),
});

export type JobFormValues = z.infer<typeof jobSchema>;

export function toJobInput(values: JobFormValues) {
  return {
    title: values.title,
    company: values.company || null,
    url: values.url || null,
    description: values.description,
  };
}
