import type { ResumeData } from "@/types/api";

// Must match backend/app/schemas/resume_data.py PLACEHOLDER_PATTERN.
export const PLACEHOLDER_PATTERN = /\[(?:add|insert|verify|your|x+|number|metric)[^\]]*\]/gi;

export function findPlaceholders(data: ResumeData): string[] {
  const texts = [
    data.summary,
    ...data.experience.flatMap((e) => e.bullets),
    ...data.projects.flatMap((p) => p.bullets),
  ];
  const found = new Set<string>();
  for (const text of texts) for (const match of text.matchAll(PLACEHOLDER_PATTERN)) found.add(match[0]);
  return [...found];
}

/** Drop empty bullets and trim text so saved versions stay clean. */
export function cleanDraft(data: ResumeData): ResumeData {
  const bullets = (list: string[]) => list.map((b) => b.trim()).filter(Boolean);
  return {
    ...data,
    summary: data.summary.trim(),
    skills: data.skills.map((s) => s.trim()).filter(Boolean),
    experience: data.experience.map((e) => ({ ...e, bullets: bullets(e.bullets) })),
    projects: data.projects.map((p) => ({ ...p, bullets: bullets(p.bullets) })),
  };
}

export type BulletPath = `experience.${number}.bullets.${number}` | `projects.${number}.bullets.${number}`;

const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

/** Locate a bullet in the draft so an AI suggestion can replace exactly that bullet. */
export function findBulletPath(data: ResumeData, original: string): BulletPath | null {
  const target = normalize(original);
  for (const [i, exp] of data.experience.entries()) {
    const j = exp.bullets.findIndex((b) => normalize(b) === target);
    if (j >= 0) return `experience.${i}.bullets.${j}`;
  }
  for (const [i, proj] of data.projects.entries()) {
    const j = proj.bullets.findIndex((b) => normalize(b) === target);
    if (j >= 0) return `projects.${i}.bullets.${j}`;
  }
  return null;
}
