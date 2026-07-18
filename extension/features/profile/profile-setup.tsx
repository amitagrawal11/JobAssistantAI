import { useState, type ChangeEvent } from 'react';
import { CheckCircle2, FileUp, LoaderCircle } from 'lucide-react';
import { createProfile } from '../../api/profiles';
import { executeParse, uploadDocument } from '../../api/documents';
import { BackendError } from '../../api/client';

export type ActiveProfileSource = {
  profileId: string;
  documentId: string;
};

type UploadStage = 'idle' | 'uploading' | 'parsing' | 'complete';

export function ProfileSetup({
  activeSource,
  onBackendReady,
}: {
  activeSource: ActiveProfileSource | null;
  onBackendReady: (source: ActiveProfileSource) => void;
}) {
  const [filename, setFilename] = useState('');
  const [stage, setStage] = useState<UploadStage>('idle');
  const [error, setError] = useState('');

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setError('');
    try {
      setStage('uploading');
      let profileId = activeSource?.profileId;
      if (!profileId) {
        const profile = await createProfile({ display_name: 'Candidate' });
        profileId = profile.id;
      }
      const upload = await uploadDocument(profileId, file);
      setStage('parsing');
      await executeParse(upload.operation_id);
      const source = { profileId, documentId: upload.document_id };
      await browser.storage.local.set({
        activeProfileId: source.profileId,
        activeDocumentId: source.documentId,
      });
      setStage('complete');
      onBackendReady(source);
    } catch (caught) {
      setStage('idle');
      setError(
        caught instanceof BackendError
          ? caught.message
          : 'The resume could not be processed.',
      );
    } finally {
      event.target.value = '';
    }
  }

  const busy = stage === 'uploading' || stage === 'parsing';
  return (
    <section className="profile-setup">
      <div>
        <p className="eyebrow">Source resume</p>
        <h2>Upload and compare</h2>
        <p className="setup-copy">
          We extract candidate facts locally, then place them beside the original
          document for review.
        </p>
      </div>
      <label className={`upload-zone${busy ? ' busy' : ''}`}>
        {busy ? <LoaderCircle className="spin" /> : stage === 'complete' ? <CheckCircle2 /> : <FileUp />}
        <strong>{busy ? (stage === 'uploading' ? 'Uploading resume…' : 'Extracting facts…') : 'Choose a PDF or DOCX resume'}</strong>
        <span>{filename || 'Maximum 5 MB. A new upload replaces the active source.'}</span>
        <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={busy} onChange={(event) => void handleFile(event)} />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {activeSource ? <small className="active-source-note">An extracted source is ready for comparison below.</small> : null}
    </section>
  );
}
