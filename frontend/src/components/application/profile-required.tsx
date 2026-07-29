import { RefreshCw, UserRound } from 'lucide-react';
import { Button } from '../ui/button';

export function ProfileRequired({ title = 'Profile required', message = 'Add your resume and verify your facts before analyzing or filling a job.', onSetup, onRetry }: { title?: string; message?: string; onSetup: () => void; onRetry?: () => void }) {
  return <div className="profile-required"><div className="profile-icon"><UserRound /></div><h1>{title}</h1><p>{message}</p><Button onClick={onSetup}><UserRound size={14} /> Open Profile</Button>{onRetry ? <Button variant="secondary" onClick={onRetry}><RefreshCw size={14} /> Retry backend</Button> : null}</div>;
}
