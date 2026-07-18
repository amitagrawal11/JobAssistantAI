import { UserRound } from 'lucide-react';
import { Button } from '../ui/button';

export function ProfileRequired({ onSetup }: { onSetup: () => void }) {
  return <div className="profile-required"><div className="profile-icon"><UserRound /></div><h1>Profile required</h1><p>Add your resume and verify your facts before analyzing or filling a job.</p><Button onClick={onSetup}>Set up profile</Button><Button variant="ghost" onClick={onSetup}>Open saved profile</Button></div>;
}
