import { describe, expect, it, vi } from "vitest";
import { cleanDraft, findBulletPath, findPlaceholders } from "@/features/resumes/draft";
import { ApiError, apiFetch, buildUrl, onUnauthorized } from "@/lib/api-client";
import { formatFileSize, scoreBand } from "@/lib/format";
import type { ResumeData } from "@/types/api";
import { jsonResponse, mockFetch } from "../test-utils";

const DATA: ResumeData = {
  contact: { name: "", email: "", phone: "", location: "", links: [] },
  summary: "Engineer. [Add your years of experience]",
  skills: [" Python ", ""],
  experience: [
    { id: "e1", title: "Dev", company: "Acme", location: "", start_date: "", end_date: "", bullets: ["Built APIs", "  ", "Led   a team"] },
  ],
  education: [],
  projects: [{ id: "p1", name: "App", url: "", technologies: [], bullets: ["Shipped v1, resulting in [add metric]"] }],
  certifications: [],
};

describe("resume draft helpers", () => {
  it("finds placeholders that must be replaced before saving", () => {
    expect(findPlaceholders(DATA).sort()).toEqual(["[Add your years of experience]", "[add metric]"]);
  });

  it("locates bullets by normalized text", () => {
    expect(findBulletPath(DATA, "led a team")).toBe("experience.0.bullets.2");
    expect(findBulletPath(DATA, "Shipped v1, resulting in [add metric]")).toBe("projects.0.bullets.0");
    expect(findBulletPath(DATA, "Not in the resume")).toBeNull();
  });

  it("cleans empty bullets and skills", () => {
    const clean = cleanDraft(DATA);
    expect(clean.skills).toEqual(["Python"]);
    expect(clean.experience[0]!.bullets).toEqual(["Built APIs", "Led   a team"]);
  });
});

describe("api client", () => {
  it("builds query strings and skips empty values", () => {
    expect(buildUrl("/analyses", { q: "", ids: ["a", "b"], page: 2, x: undefined })).toBe("/api/v1/analyses?ids=a&ids=b&page=2");
  });

  it("parses the error envelope into ApiError with field errors", async () => {
    mockFetch(
      jsonResponse(
        { error: { code: "validation_error", message: "Some fields are invalid.", details: [{ loc: ["body", "title"], msg: "Value error, Too long" }] } },
        422,
      ),
    );
    const error = await apiFetch("/jobs", { method: "POST", body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
    expect((error as ApiError).fieldErrors()).toEqual({ title: "Too long" });
  });

  it("reports network failures distinctly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const error = (await apiFetch("/jobs").catch((e: unknown) => e)) as ApiError;
    expect(error.isNetworkError).toBe(true);
  });

  it("notifies the session handler on 401 for protected requests", async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    mockFetch(jsonResponse({ error: { code: "session_expired", message: "Expired" } }, 401));
    await apiFetch("/resumes").catch(() => undefined);
    expect(handler).toHaveBeenCalledWith("session_expired");
    onUnauthorized(null);
  });

  it("returns undefined for 204 responses", async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(apiFetch("/resumes/1", { method: "DELETE" })).resolves.toBeUndefined();
  });
});

describe("formatting", () => {
  it("describes score bands without implying hiring outcomes", () => {
    expect(scoreBand(85).label).toBe("Strong alignment");
    expect(scoreBand(30).label).toBe("Low alignment");
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
