import type { Analysis, MatchResult } from "@/types/api";

export const MATCH_RESULT: MatchResult = {
  methodology_version: "1.0",
  overall_score: 82,
  components: [
    { key: "required_skills", label: "Required skills", weight: 35, score: 90.9, applicable: true, explanation: "10 of 11 required skills found." },
    { key: "preferred_skills", label: "Preferred skills", weight: 10, score: 0, applicable: true, explanation: "0 of 3 preferred skills found." },
    { key: "experience", label: "Years of experience", weight: 15, score: null, applicable: false, explanation: "The job does not state a minimum number of years." },
    { key: "responsibilities", label: "Responsibility alignment", weight: 20, score: 98.8, applicable: true, explanation: "4 of 4 responsibilities have a closely related bullet in your resume." },
    { key: "education", label: "Education & certifications", weight: 5, score: 100, applicable: true, explanation: "Degree level met." },
    { key: "keywords", label: "Keyword coverage", weight: 15, score: 68.8, applicable: true, explanation: "11 of 16 key terms appear in your resume." },
  ],
  matched_skills: [{ skill: "Python", requirement: "required", evidence: ["Skills section"] }],
  missing_required_skills: ["Integration Testing"],
  missing_preferred_skills: ["Kubernetes", "GraphQL"],
  relevant_experience: [
    { title: "Senior Software Engineer", company: "Northwind Analytics", relevance: 0.4, matched_terms: ["Python"], reason: "Uses Python which the job asks for." },
  ],
  responsibility_alignment: [
    { responsibility: "Build REST APIs using Python", best_match: "Built REST APIs with FastAPI", similarity: 0.48, aligned: true },
    { responsibility: "Own the mobile release process", best_match: null, similarity: 0, aligned: false },
  ],
  experience: { required_years: null, candidate_years: 7.4, explanation: "The job does not state a minimum number of years." },
  education: {
    required_level: "bachelor",
    candidate_level: "bachelor",
    equivalent_experience_accepted: true,
    matched_certifications: [],
    missing_certifications: [],
    explanation: "Your bachelor degree meets the bachelor level mentioned.",
  },
  keyword_coverage: { matched: ["Python"], missing: ["Terraform"], coverage: 0.688 },
  improvement_areas: [{ area: "Missing required skills", detail: "Integration Testing was not found.", priority: "high" }],
};

export const ANALYSIS: Analysis = {
  id: "a1",
  overall_score: 82,
  created_at: "2026-10-20T10:00:00Z",
  job: { id: "j1", title: "Senior Full-Stack Engineer", company: "Acme" },
  resume: { resume_id: "r1", resume_title: "Main resume", version_id: "v1", version_number: 1, version_label: "Original" },
  ai_status: "completed",
  missing_required_count: 1,
  is_stale: false,
  match_result: MATCH_RESULT,
  ai_insights: { summary: "Rule-based summary.", strengths: ["Evidence for Python"], gaps: [], transferable_skills: [], recommendations: [] },
  ai_provider: "mock",
  ai_model: "rule-based-demo",
  ai_is_mock: true,
  ai_message: null,
};
