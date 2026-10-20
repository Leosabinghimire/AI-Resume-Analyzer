const dateFormatter = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatRelative(value: string, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(value);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function percent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export type ScoreBand = { color: string; label: string };

/** Bands describe coverage of the posting's stated requirements, not likelihood of being hired. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return { color: "teal", label: "Strong alignment" };
  if (score >= 60) return { color: "blue", label: "Good alignment" };
  if (score >= 40) return { color: "yellow", label: "Partial alignment" };
  return { color: "red", label: "Low alignment" };
}

export const VERSION_SOURCE_LABELS: Record<string, string> = {
  parsed: "Parsed",
  manual: "Manual edit",
  ai_assisted: "AI-assisted",
};
