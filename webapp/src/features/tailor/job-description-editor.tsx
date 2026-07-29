import { useMemo, useRef, useState } from 'react';
import { Expand, Minimize2, Redo2, Search, Trash2, Undo2, X } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function JobDescriptionEditor({ value, onChange, disabled = false }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [finding, setFinding] = useState(false);
  const [query, setQuery] = useState('');
  const words = useMemo(() => value.trim() ? value.trim().split(/\s+/).length : 0, [value]);

  const history = (command: 'undo' | 'redo') => {
    ref.current?.focus();
    document.execCommand(command);
  };
  const findNext = () => {
    if (!query || !ref.current) return;
    const start = ref.current.selectionEnd;
    const index = value.toLocaleLowerCase().indexOf(query.toLocaleLowerCase(), start);
    const found = index >= 0 ? index : value.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    if (found >= 0) {
      ref.current.focus();
      ref.current.setSelectionRange(found, found + query.length);
    }
  };

  return (
    <div className={expanded ? 'tailor-editor-shell is-expanded' : 'tailor-editor-shell'}>
      <div className="tailor-editor-toolbar">
        <button type="button" onClick={() => history('undo')} title="Undo"><Undo2 /></button>
        <button type="button" onClick={() => history('redo')} title="Redo"><Redo2 /></button>
        <span className="tailor-toolbar-separator" />
        <button type="button" onClick={() => setFinding((open) => !open)} title="Find"><Search /></button>
        {finding ? (
          <div className="tailor-find">
            <input aria-label="Find in job description" value={query} onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && findNext()} placeholder="Find…" />
            <button type="button" onClick={findNext}>Next</button>
            <button type="button" onClick={() => setFinding(false)} aria-label="Close find"><X /></button>
          </div>
        ) : null}
        <span className="tailor-toolbar-spacer" />
        <button type="button" onClick={() => onChange('')} title="Clear" disabled={disabled || !value}><Trash2 /></button>
        <button type="button" onClick={() => setExpanded((open) => !open)} title={expanded ? 'Exit expanded view' : 'Expand editor'}>
          {expanded ? <Minimize2 /> : <Expand />}
        </button>
      </div>
      <textarea
        ref={ref}
        className="tailor-document-editor"
        aria-label="Job description"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={'Paste the complete job description here…\n\nResponsibilities\n• …\n\nRequirements\n• …'}
        spellCheck
      />
      <footer className="tailor-editor-status">
        <span>Plain text · formatting and bullet breaks preserved</span>
        <span>{words.toLocaleString()} words · {value.length.toLocaleString()} characters</span>
      </footer>
    </div>
  );
}
