import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return <div className="state-panel error" role="alert"><AlertTriangle aria-hidden="true" /><h2>{title}</h2><p>{message}</p>{onRetry && <Button onClick={onRetry}>Retry</Button>}</div>;
}
