# AI Profile Extraction and Editable Rescan Design

## Goal

Convert the complete Docling representation into comprehensive, source-grounded profile facts and allow users to analyze a new job after a previous analysis.

## Profile extraction

Docling remains the document parser and provenance source. The selected profile provider/model receives bounded reading-order element chunks and returns structured facts covering identity, contact details, summary, experience, achievements, skills, education, certifications, projects, and languages. Each fact must cite valid Docling element IDs; unsupported facts are discarded. Exact duplicate facts are removed and duplicate keys are made unique.

The local Qwen extraction role uses an 8K context and 4K output budget. Other agent roles retain their existing smaller budget. If the profile lacks an explicit preference, the first configured model for the configured default provider is selected and persisted. If AI extraction fails, the parse request returns a retryable error without replacing current facts.

Existing resumes expose an `Extract again with AI` action. New uploads run the AI extractor automatically. Extracted facts remain unverified until the user reviews them.

## Scan behavior

The Scan description is always editable. A successful new analysis replaces the active job and removes the previous persisted match so a stale score cannot be attached to the new job.

## Verification

Contract tests validate evidence filtering and reprocessing. A live read-only run against the stored resume must produce substantially more than the legacy three facts. Extension workflow validation covers editable rescanning and the production build covers UI integration.
