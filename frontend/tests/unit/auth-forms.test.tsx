import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { safeNextPath } from "@/features/auth/schemas";
import { jsonResponse, mockFetch, renderWithProviders } from "../test-utils";

const USER = { id: "u1", email: "a@example.com", full_name: "A", ai_processing_consent: false, ai_consent_at: null, created_at: "" };

describe("LoginForm", () => {
  it("validates fields before calling the API", async () => {
    const fetchMock = mockFetch();
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/email/i), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits credentials with the CSRF header and calls onSuccess", async () => {
    const fetchMock = mockFetch(jsonResponse(USER));
    const onSuccess = vi.fn();
    renderWithProviders(<LoginForm onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText(/email/i), "a@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/v1/auth/login");
    expect((init!.headers as Record<string, string>)["X-Requested-With"]).toBe("fetch");
    expect(JSON.parse(init!.body as string)).toEqual({ email: "a@example.com", password: "Password123" });
  });

  it("shows the server error message", async () => {
    mockFetch(jsonResponse({ error: { code: "invalid_credentials", message: "Incorrect email or password." } }, 401));
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/email/i), "a@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });

  it("explains an expired session", () => {
    renderWithProviders(<LoginForm onSuccess={vi.fn()} sessionExpired />);
    expect(screen.getByText(/your session expired/i)).toBeInTheDocument();
  });
});

describe("RegisterForm", () => {
  it("requires matching, sufficiently strong passwords", async () => {
    const fetchMock = mockFetch();
    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/full name/i), "Sam");
    await userEvent.type(screen.getByLabelText(/^email/i), "sam@example.com");
    await userEvent.type(screen.getByLabelText(/^password/i), "lettersonly");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "different1");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Include at least one number")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a taken email to the email field and omits confirm_password from the request", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ error: { code: "email_taken", message: "An account with this email already exists." } }, 409),
    );
    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/full name/i), "Sam");
    await userEvent.type(screen.getByLabelText(/^email/i), "sam@example.com");
    await userEvent.type(screen.getByLabelText(/^password/i), "Password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "Password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      full_name: "Sam",
      email: "sam@example.com",
      password: "Password123",
    });
  });
});

describe("safeNextPath", () => {
  it("only allows same-site relative paths", () => {
    expect(safeNextPath("/resumes/1")).toBe("/resumes/1");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
  });
});
