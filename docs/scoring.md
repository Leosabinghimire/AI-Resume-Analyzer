# Match scoring methodology (v1.0)

The match score answers one narrow question: **how much of what this job posting explicitly asks for
is evidenced in this resume?** It is a transparent, deterministic heuristic. It is **not** an applicant
tracking system (ATS) score, and it does not predict interview or hiring outcomes.

Implementation: `backend/app/services/matching/engine.py`. Tests: `backend/tests/test_matching.py`.

## Inputs

| Source | Extracted by | What is extracted |
|---|---|---|
| Resume version | `services/parsing/resume_parser.py` (at upload) + user edits | Skills, dated experience, bullets, projects, education, certifications |
| Job description | `services/parsing/job_parser.py` | Required skills, preferred skills, responsibilities, minimum years, education level, certifications, keywords |

Skills are recognized with a curated taxonomy (`services/parsing/skills_taxonomy.py`, about 160 skills with
aliases such as `k8s → Kubernetes`, `Postgres → PostgreSQL`). Skills the taxonomy does not know are
matched by exact phrase, so a user can add any custom skill to a job.

## Components

| Component | Weight | Score (0–100) |
|---|---|---|
| Required skills | 35 | Weighted share of required skills found anywhere in the resume. Soft skills (e.g. "Communication") count 0.5 because they are hard to evidence. |
| Responsibility alignment | 20 | For each responsibility, the best-matching resume bullet by set similarity. Credit per responsibility = `min(1, similarity / 0.35)`; the score is the mean credit. A responsibility is shown as *aligned* at similarity ≥ 0.20. |
| Keyword coverage | 15 | Share of the posting's key terms (all taxonomy skills plus meaningful words that appear at least twice) present in the resume. Single words also match by stem. |
| Years of experience | 15 | `min(100, 100 × candidate_years / required_years)`. Candidate years come from dated roles with overlapping periods merged. |
| Preferred skills | 10 | Same as required skills, for preferred / nice-to-have skills. |
| Education & certifications | 5 | Degree level met = 100; one level short with "or equivalent experience" = 70; otherwise 60% of the level ratio. Averaged with the share of mentioned certifications found. |

**Similarity** is the Ochiai coefficient `|A ∩ B| / √(|A|·|B|)` between sets of lightly stemmed content
terms (stop words and generic posting vocabulary removed) plus canonical skill tokens.

## Overall score

```
overall = round( Σ weight_i × score_i  /  Σ weight_i )   over applicable components only
```

A component is *not applicable* when the job gives no basis for it (for example, no minimum years or no
preferred skills). Its weight is then redistributed proportionally, and the UI shows the effective weight.
If no component applies, the score is 0 and every component explains why.

## Determinism

The same resume version and job always produce the same score. AI insights are generated separately and
**never modify the score**; they add semantic interpretation such as transferable skills.

## Score bands (UI wording)

| Score | Label |
|---|---|
| 80–100 | Strong alignment |
| 60–79 | Good alignment |
| 40–59 | Partial alignment |
| 0–39 | Low alignment |

The labels describe coverage of stated requirements only.

## Known limitations

- **Taxonomy coverage.** Tools outside the taxonomy only match by exact phrase; synonyms that are not
  aliases (e.g. "Postgres-compatible database") are missed.
- **Term overlap is not understanding.** Similarity rewards shared vocabulary; it cannot judge depth,
  seniority or quality of experience. AI insights partly compensate, but do not change the score.
- **Parsing quality.** Multi-column PDFs, tables and unusual headings can misplace content. Users can
  correct everything in the editor.
- **Requirement detection.** Postings without clear "Requirements" / "Nice to have" headings treat all
  mentioned skills as required.
- **Experience dates.** Only roles with parseable start and end dates count toward years of experience.
- **Gaming.** Pasting job keywords into a resume raises the score. The UI repeatedly warns users to add
  only truthful content, and the score should be read as a checklist, not a target.
