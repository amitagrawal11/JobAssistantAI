import { ProfileSetup } from '../profile/profile-setup';
import { FactReview } from '../profile/fact-review';

export function ProfilePage() {
  return <><div className="page-heading"><div><p className="eyebrow">Profile</p><h1>Candidate profile</h1><p>Add a resume once, then review the facts that may support tailored content.</p></div></div><div className="profile-layout"><ProfileSetup /><FactReview /></div></>;
}
