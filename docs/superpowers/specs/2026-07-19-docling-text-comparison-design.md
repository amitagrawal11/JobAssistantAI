# Docling Text Comparison Design

## Goal

After a resume is parsed, show the text Docling actually produced beside the rendered source so the user can validate document ingestion before AI fact extraction.

## Approved layout

- Left: readable plain text grouped by Docling page, with search and parser metadata.
- Right: the existing A4 source rendering.
- One shared page number controls both columns.
- Existing extracted-fact review remains below the source comparison.
- This view reports parser output only; it does not imply that the text is a verified candidate fact.

## Data contract

The source-preview response includes parser name, parser version, total element count, and `parsed_text` for every preview page. Text is assembled from non-empty Docling elements in reading order. Elements without a page number are assigned to the first page so text is not silently discarded.

## Empty and error behavior

An empty parsed page displays a clear message. Search is local and case-insensitive. Existing preview loading, retry, and provenance highlighting behavior remains intact.

## Verification

Backend smoke coverage verifies parser metadata and page text. Extension contract validation, TypeScript checking, and the production build verify the UI integration.
