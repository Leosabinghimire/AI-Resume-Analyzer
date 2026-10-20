// Mirrors the FastAPI response/request schemas (backend/app/schemas). Keep both sides in sync.

export type Priority = "high" | "medium" | "low";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  ai_processing_consent: boolean;
  ai_consent_at: string | null;
  created_at: string;
}

export interface AIConfig {
  provider: string;
  model: string;
  is_mock: boolean;
  is_external: boolean;
  requires_consent: boolean;
}

// ----- Resume content -----
export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  details: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  url: string;
  technologies: string[];
  bullets: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface ResumeData {
  contact: ContactInfo;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
}

export type VersionSource = "parsed" | "manual" | "ai_assisted";

export interface ResumeVersionSummary {
  id: string;
  version_number: number;
  label: string;
  source: VersionSource;
  created_at: string;
  updated_at: string;
}

export interface ResumeVersion extends ResumeVersionSummary {
  resume_id: string;
  data: ResumeData;
}

export interface Resume {
  id: string;
  title: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  page_count: number | null;
  created_at: string;
  updated_at: string;
  version_count: number;
  latest_version: ResumeVersionSummary | null;
}

export interface ResumeDetail extends Resume {
  versions: ResumeVersionSummary[];
  parse_warnings: string[];
}

export interface ResumeUploadResult {
  resume: ResumeDetail;
  version: ResumeVersion;
  warnings: string[];
}

export interface TextDiffSegment {
  op: "equal" | "insert" | "delete";
  text: string;
}

export interface SectionDiff {
  section: string;
  label: string;
  changed: boolean;
  segments: TextDiffSegment[];
  added: string[];
  removed: string[];
}

export interface VersionComparison {
  base: ResumeVersionSummary;
  target: ResumeVersionSummary;
  sections: SectionDiff[];
}

// ----- Jobs -----
export interface JobParsed {
  responsibilities: string[];
  required_qualifications: string[];
  preferred_qualifications: string[];
  min_years_experience: number | null;
  education_level: string | null;
  education_equivalent_accepted: boolean;
  certifications: string[];
  keywords: string[];
}

export interface JobSummary {
  id: string;
  title: string;
  company: string | null;
  url: string | null;
  required_skills: string[];
  preferred_skills: string[];
  created_at: string;
  updated_at: string;
  analysis_count: number;
  best_score: number | null;
}

export interface Job extends JobSummary {
  description: string;
  skills_customized: boolean;
  parsed: JobParsed;
}

export interface JobInput {
  title: string;
  company?: string | null;
  url?: string | null;
  description: string;
}

export interface JobUpdate extends Partial<JobInput> {
  required_skills?: string[];
  preferred_skills?: string[];
}

// ----- Matching -----
export type ComponentKey =
  | "required_skills"
  | "preferred_skills"
  | "experience"
  | "responsibilities"
  | "education"
  | "keywords";

export interface ScoreComponent {
  key: ComponentKey;
  label: string;
  weight: number;
  score: number | null;
  applicable: boolean;
  explanation: string;
}

export interface MatchedSkill {
  skill: string;
  requirement: "required" | "preferred";
  evidence: string[];
}

export interface RelevantExperience {
  title: string;
  company: string;
  relevance: number;
  matched_terms: string[];
  reason: string;
}

export interface ResponsibilityAlignment {
  responsibility: string;
  best_match: string | null;
  similarity: number;
  aligned: boolean;
}

export interface MatchResult {
  methodology_version: string;
  overall_score: number;
  components: ScoreComponent[];
  matched_skills: MatchedSkill[];
  missing_required_skills: string[];
  missing_preferred_skills: string[];
  relevant_experience: RelevantExperience[];
  responsibility_alignment: ResponsibilityAlignment[];
  experience: { required_years: number | null; candidate_years: number | null; explanation: string };
  education: {
    required_level: string | null;
    candidate_level: string | null;
    equivalent_experience_accepted: boolean;
    matched_certifications: string[];
    missing_certifications: string[];
    explanation: string;
  };
  keyword_coverage: { matched: string[]; missing: string[]; coverage: number };
  improvement_areas: { area: string; detail: string; priority: Priority }[];
}

export interface MatchInsights {
  summary: string;
  strengths: string[];
  gaps: string[];
  transferable_skills: { missing_skill: string; related_evidence: string; explanation: string }[];
  recommendations: string[];
}

export type AIStatus = "completed" | "failed" | "skipped_no_consent" | "not_requested";

export interface AnalysisSummary {
  id: string;
  overall_score: number;
  created_at: string;
  job: { id: string; title: string; company: string | null };
  resume: { resume_id: string; resume_title: string; version_id: string; version_number: number; version_label: string };
  ai_status: AIStatus;
  missing_required_count: number;
  is_stale: boolean;
}

export interface Analysis extends AnalysisSummary {
  match_result: MatchResult;
  ai_insights: MatchInsights | null;
  ai_provider: string | null;
  ai_model: string | null;
  ai_is_mock: boolean;
  ai_message: string | null;
}

export interface AnalysisFilters {
  q?: string;
  resume_id?: string;
  resume_version_id?: string;
  job_id?: string;
  min_score?: number;
  max_score?: number;
  sort?: "newest" | "oldest" | "score_desc" | "score_asc";
  page?: number;
  page_size?: number;
}

// ----- Coaching -----
export interface WeakBullet {
  original: string;
  issues: string[];
  suggestion: string;
  requires_verification: boolean;
}

export interface ResumeFeedbackResult {
  overall_summary: string;
  structure_feedback: string[];
  readability_feedback: string[];
  weak_bullets: WeakBullet[];
  keyword_recommendations: { keyword: string; reason: string }[];
  summary_suggestion: { suggested_summary: string; rationale: string; requires_verification: boolean } | null;
  grammar_suggestions: { original: string; suggestion: string; explanation: string }[];
  checklist: { item: string; priority: Priority }[];
}

export interface ResumeMetrics {
  word_count: number;
  bullet_count: number;
  quantified_bullet_ratio: number;
  action_verb_ratio: number;
  avg_bullet_words: number;
  long_bullets: number;
  short_bullets: number;
  vague_phrase_count: number;
  first_person_count: number;
  missing_sections: string[];
  summary_word_count: number;
  skills_count: number;
  flagged_bullets: { bullet: string; issues: string[] }[];
}

export interface Feedback {
  id: string;
  resume_version_id: string;
  job_id: string | null;
  provider: string;
  model: string;
  is_mock: boolean;
  metrics: ResumeMetrics;
  result: ResumeFeedbackResult;
  created_at: string;
}

export interface InterviewQuestion {
  question: string;
  why_asked: string;
  answer_outline: string[];
  resume_evidence: string | null;
}

export interface InterviewPrepSummary {
  id: string;
  job_id: string;
  job_title: string;
  company: string | null;
  resume_title: string;
  version_label: string;
  provider: string;
  is_mock: boolean;
  created_at: string;
}

export interface InterviewPrep extends InterviewPrepSummary {
  resume_version_id: string;
  disclaimer: string;
  result: {
    technical_questions: InterviewQuestion[];
    behavioral_questions: InterviewQuestion[];
    project_questions: InterviewQuestion[];
    study_topics: { topic: string; reason: string; priority: Priority }[];
  };
}

// ----- Dashboard -----
export interface DashboardSummary {
  counts: {
    resumes: number;
    resume_versions: number;
    jobs: number;
    analyses: number;
    feedback_reports: number;
    interview_preps: number;
    average_score: number | null;
  };
  recent_analyses: AnalysisSummary[];
  recent_versions: {
    id: string;
    resume_id: string;
    resume_title: string;
    version_number: number;
    label: string;
    source: VersionSource;
    updated_at: string;
  }[];
  score_trend: { analysis_id: string; created_at: string; score: number; job_title: string }[];
  skill_gaps: { skill: string; job_count: number }[];
}
