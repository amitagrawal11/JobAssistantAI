# Lightweight Resume Extraction Design

## Decision

Resume ingestion is deterministic-first. Docling owns document reading, layout,
reading order, pages, and bounding boxes. A section engine then recognizes
heading aliases and emits evidence-linked facts for identity, contact, summary,
skills, experience, projects, education, and certifications.

AI is an optional enhancement, never a prerequisite for profile setup. The
initial upload uses deterministic extraction only. “Extract again with AI”
reuses the parsed document and sends only ambiguous structured sections to a
bounded extraction model.

## Model

The recommended local extraction model is `qwen2.5:1.5b`. It is small enough for
CPU-only and low-memory systems, while its official model card specifically
calls out instruction following and structured JSON output. The application
does not silently substitute a larger installed model. If the configured model
is absent or unavailable, extraction completes deterministically.

`RESUME_EXTRACTION_MODEL` controls the optional Ollama model and defaults to
`qwen2.5:1.5b`. The existing profile AI preference remains available for other
features and is not reused for resume ingestion.

## Data Flow

1. Validate and store PDF or DOCX.
2. Docling emits normalized elements with provenance.
3. Section segmentation identifies canonical sections from heading aliases.
4. Deterministic extractors emit exact-text facts:
   - regex and header rules for identity/contact;
   - line/token rules for summary, skills, and certifications;
   - entry grouping for experience and projects;
   - date-bounded splitting for multiple education entries.
5. Initial upload persists these facts immediately.
6. AI reprocess sends only experience, education, and project section text to
   `qwen2.5:1.5b`, validates output against source text, and keeps the
   deterministic result whenever AI coverage is worse.

## Safety and Performance

- No whole-resume LLM fallback.
- No automatic selection of an arbitrary installed model.
- One bounded structured call, then at most one retry for a missing section.
- Every fact retains Docling element IDs, page, and bounding box where present.
- Model failures, malformed JSON, and missing runtime degrade to deterministic
  extraction rather than failing the profile.

## Verification

- Unit tests cover section aliases, multi-role grouping, multi-degree splitting,
  deterministic upload mode, and explicit AI reprocess mode.
- A real fixture smoke compares deterministic section coverage with optional AI
  coverage and records runtime/model metadata.
- Existing profile, scoring, Tailor, and Auto-Apply regression suites remain
  green.
