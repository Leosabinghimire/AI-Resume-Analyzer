import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorBlock, LoadingBlock } from "@/components/ui/QueryState";
import { AIInsightsCard } from "@/features/analyses/components/AIInsightsCard";
import { MatchResultView } from "@/features/analyses/components/MatchResultView";
import { ApiError } from "@/lib/api-client";
import { ANALYSIS, MATCH_RESULT } from "../fixtures";
import { renderWithProviders } from "../test-utils";

describe("MatchResultView", () => {
  it("renders the score, breakdown, skills and gaps", () => {
    renderWithProviders(<MatchResultView result={MATCH_RESULT} />);
    expect(screen.getByLabelText("Match score 82 out of 100")).toBeInTheDocument();
    expect(screen.getByText("Strong alignment")).toBeInTheDocument();
    expect(screen.getByText("Not applicable")).toBeInTheDocument(); // experience component skipped
    expect(screen.getByText(/91\/100 · weight 41%/)).toBeInTheDocument(); // 35 / 85 applicable weight
    expect(screen.getAllByText("Integration Testing").length).toBeGreaterThan(0);
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("No related content found")).toBeInTheDocument();
    expect(screen.getByText(/not an ATS score/i)).toBeInTheDocument();
  });
});

describe("AIInsightsCard", () => {
  it("labels mock output as rule-based, not AI", () => {
    renderWithProviders(<AIInsightsCard analysis={ANALYSIS} />);
    expect(screen.getByText("Demo · rule-based (not AI)")).toBeInTheDocument();
    expect(screen.getByText("Rule-based summary.")).toBeInTheDocument();
  });

  it("explains failures and keeps the deterministic result", () => {
    renderWithProviders(
      <AIInsightsCard analysis={{ ...ANALYSIS, ai_status: "failed", ai_insights: null, ai_message: "The AI provider timed out." }} />,
    );
    expect(screen.getByText(/The AI provider timed out/)).toBeInTheDocument();
    expect(screen.getByText(/deterministic analysis above is unaffected/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("asks for consent when AI was skipped", () => {
    renderWithProviders(<AIInsightsCard analysis={{ ...ANALYSIS, ai_status: "skipped_no_consent", ai_insights: null }} />);
    expect(screen.getByText("AI processing is turned off")).toBeInTheDocument();
  });
});

describe("Loading and error states", () => {
  it("renders an accessible loading placeholder", () => {
    renderWithProviders(<LoadingBlock rows={2} />);
    expect(screen.getByLabelText("Loading")).toHaveAttribute("aria-busy", "true");
  });

  it("shows the API error message and retries", async () => {
    const retry = vi.fn();
    renderWithProviders(<ErrorBlock error={new ApiError(0, "network_error", "Could not reach the server.")} onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not reach the server.");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
