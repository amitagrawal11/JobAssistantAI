import { Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from '../../components/ui/input';
import type { SourcePreview } from '../../schemas/backend';
import { parsedTextMatches } from './parsed-source-contract';

export function ParsedSourceText({ preview, pageNumber }: { preview: SourcePreview; pageNumber: number }) {
  const [query, setQuery] = useState('');
  const page = preview.pages.find((candidate) => candidate.number === pageNumber) ?? preview.pages[0];
  const matches = parsedTextMatches(page?.parsed_text ?? '', query);

  return <section className="parsed-source-column" aria-label="Docling parsed text">
    <div className="source-toolbar">
      <div><p className="eyebrow">Docling parsed text</p><strong>Page {page?.number ?? 1}</strong></div>
      <label className="parsed-source-search"><Search aria-hidden="true" /><Input type="search" placeholder="Search parsed text" aria-label="Search parsed text" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div>
    <div className="parsed-source-body">
      {page?.parsed_text.trim() && matches ? <pre>{page.parsed_text}</pre> : <div className="parsed-source-empty"><strong>{query.trim() ? 'No matches on this page' : 'No parsed text on this page'}</strong><span>{query.trim() ? 'Try another term or page.' : 'Docling did not return readable text for this page.'}</span></div>}
    </div>
    <footer>{preview.element_count.toLocaleString()} elements · {preview.parser} {preview.parser_version}</footer>
  </section>;
}
