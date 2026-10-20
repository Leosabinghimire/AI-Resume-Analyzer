import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UploadResumePage from "@/app/(app)/resumes/upload/page";
import { JobForm } from "@/features/jobs/components/JobForm";
import { rejectionMessage } from "@/features/resumes/components/ResumeDropzone";
import { ApiError } from "@/lib/api-client";
import { jsonResponse, mockFetch, renderWithProviders } from "../test-utils";

const DESCRIPTION =
  "Responsibilities\n- Build REST APIs with Python and FastAPI\n- Build React user interfaces\nRequirements\n- 3+ years experience";

describe("JobForm", () => {
  it("rejects a too-short description and invalid URL", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<JobForm submitLabel="Save job" pending={false} error={null} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/job title/i), "Engineer");
    await userEvent.type(screen.getByLabelText(/job posting url/i), "example");
    await userEvent.type(screen.getByRole("textbox", { name: /job description/i }), "Too short");
    await userEvent.click(screen.getByRole("button", { name: "Save job" }));
    expect(await screen.findByText(/paste the full job description/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a full url/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits normalized values", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<JobForm submitLabel="Save job" pending={false} error={null} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/job title/i), "Backend Engineer");
    fireEvent.change(screen.getByRole("textbox", { name: /job description/i }), { target: { value: DESCRIPTION } });
    await userEvent.click(screen.getByRole("button", { name: "Save job" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ title: "Backend Engineer", company: null, url: null, description: DESCRIPTION }),
    );
  });

  it("links to the existing job on a duplicate error", () => {
    const error = new ApiError(409, "duplicate_job", "You have already saved a job with this description.", { job_id: "j1" });
    renderWithProviders(<JobForm submitLabel="Save" pending={false} error={error} onSubmit={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("already saved");
    expect(screen.getByRole("link", { name: "Open the saved job" })).toHaveAttribute("href", "/jobs/j1");
  });
});

describe("Resume upload", () => {
  it("maps dropzone rejections to clear messages", () => {
    const reject = (code: string) => rejectionMessage([{ file: new File([], "x"), errors: [{ code, message: "" }] }]);
    expect(reject("file-too-large")).toMatch(/larger than 5 MB/);
    expect(reject("file-invalid-type")).toMatch(/Only PDF and DOCX/);
  });

  it("uploads the chosen file and reports server-side validation errors", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ error: { code: "no_text_found", message: "This looks like a scanned or image-only PDF." } }, 422),
    );
    const { container } = renderWithProviders(<UploadResumePage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4 test"], "cv.pdf", { type: "application/pdf" });
    await userEvent.upload(input, file);
    expect(await screen.findByText("cv.pdf")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("cv");
    await userEvent.click(screen.getByRole("button", { name: "Upload and parse" }));
    expect(await screen.findByText(/scanned or image-only PDF/)).toBeInTheDocument();
    const body = fetchMock.mock.calls[0]![1]!.body as FormData;
    expect((body.get("file") as File).name).toBe("cv.pdf");
    expect(body.get("title")).toBe("cv");
  });
});
