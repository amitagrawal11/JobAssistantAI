import { useState } from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';

export function ProfileSetup() {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [filename, setFilename] = useState('');
  return <section className="profile-setup"><div className="segmented"><Button size="sm" variant={mode === 'upload' ? 'primary' : 'secondary'} onClick={() => setMode('upload')}>Upload resume</Button><Button size="sm" variant={mode === 'paste' ? 'primary' : 'secondary'} onClick={() => setMode('paste')}>Paste resume</Button></div>{mode === 'upload' ? <label className="upload-zone"><FileUp /><strong>Choose a PDF or DOCX resume</strong><span>{filename || 'File selection is captured; parsing arrives in Phase 3.'}</span><input type="file" accept=".pdf,.docx" onChange={(event) => setFilename(event.target.files?.[0]?.name ?? '')} /></label> : <label className="field-label">Markdown or plain text<Textarea placeholder="# Jordan Lee&#10;&#10;## Experience…" /><span>Phase 1 preview only; pasted text is not parsed.</span></label>}</section>;
}
