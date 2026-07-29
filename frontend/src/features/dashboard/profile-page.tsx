import { ProfileSetup } from '../profile/profile-setup';
import { SourceFactVerification } from '../profile/source-preview';
import { useActiveBackendProfile } from '../profile/use-active-backend-profile';

export function ProfilePage() {
  const active = useActiveBackendProfile();
  const activeSource = active.profileId && active.documentId ? { profileId: active.profileId, documentId: active.documentId } : null;
  return <><div className="page-heading"><div><p className="eyebrow">Profile</p><h1>Candidate profile</h1><p>Upload a resume, compare each extracted fact with its source, and verify only what is correct.</p></div></div><ProfileSetup activeSource={activeSource} onBackendReady={() => undefined} />{activeSource ? <SourceFactVerification profileId={activeSource.profileId} documentId={activeSource.documentId} /> : <section className="empty-source"><p className="eyebrow">Verification workspace</p><h2>Your A4 source comparison will appear here</h2><p>Upload a PDF or DOCX above to review the original resume beside its extracted facts.</p></section>}</>;
}
