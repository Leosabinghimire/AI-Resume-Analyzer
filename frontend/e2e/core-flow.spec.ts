import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const FIXTURES = path.resolve(__dirname, "../../backend/tests/fixtures");
const JOB_DESCRIPTION = `Senior Full-Stack Engineer

Responsibilities
- Design, build and maintain REST APIs using Python and FastAPI
- Build responsive user interfaces with React and TypeScript
- Write unit and integration tests and participate in code reviews

Requirements
- 4+ years of professional software development experience
- Strong experience with Python, React and TypeScript
- Experience with PostgreSQL and Docker

Nice to have
- Experience with Kubernetes and GraphQL
`;

async function register(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill("Password123");
  await page.getByLabel("Confirm password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Welcome back, E2E/ })).toBeVisible();
}

test("register, upload, add job, analyze, and revisit history", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await register(page, email);

  // Upload a resume
  await page.goto("/resumes/upload");
  await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, "sample_resume.pdf"));
  await expect(page.getByText("sample_resume.pdf")).toBeVisible();
  await page.getByRole("button", { name: "Upload and parse" }).click();
  await expect(page.getByText("Review the extracted details", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("Alex Rivera");
  await expect(page.getByLabel("Company").first()).toHaveValue("Northwind Analytics");

  // Add a job description
  await page.goto("/jobs/new");
  await page.getByLabel("Job title").fill("Senior Full-Stack Engineer");
  await page.getByLabel("Company").fill("E2E Corp");
  await page.getByRole("textbox", { name: "Job description" }).fill(JOB_DESCRIPTION);
  await page.getByRole("button", { name: "Save job" }).click();
  await expect(page.getByRole("heading", { name: "Skills used for matching" })).toBeVisible();

  // Run the analysis
  await page.getByRole("link", { name: "Match a resume" }).click();
  await expect(page.getByRole("checkbox", { name: /Senior Full-Stack Engineer/ })).toBeChecked();
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page).toHaveURL(/\/analyses\/[0-9a-f-]{36}$/);
  const analysisUrl = page.url();

  // View results
  await expect(page.getByLabel(/Match score \d+ out of 100/)).toBeVisible();
  await expect(page.getByText("Missing preferred (2)")).toBeVisible();
  await expect(page.getByText("Kubernetes").first()).toBeVisible();
  await expect(page.getByText("Demo · rule-based (not AI)")).toBeVisible();

  // History lists the analysis and links back to it
  await page.goto("/analyses");
  const row = page.getByRole("row", { name: /Senior Full-Stack Engineer/ });
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: "Senior Full-Stack Engineer" }).click();
  await expect(page).toHaveURL(analysisUrl);

  // Dashboard reflects saved data
  await page.goto("/dashboard");
  await expect(page.getByLabel("Analyses: 1")).toBeVisible();

  // Sign out, sign back in, and revisit the saved analysis
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto(analysisUrl);
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(analysisUrl);
  await expect(page.getByLabel(/Match score \d+ out of 100/)).toBeVisible();
});

test("rejects unsupported files and wrong credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("Wrong12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password." })).toBeVisible();

  await register(page, `e2e-files-${Date.now()}@example.com`);
  await page.goto("/resumes/upload");
  await page.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByText("Only PDF and DOCX files are supported.")).toBeVisible();
});
