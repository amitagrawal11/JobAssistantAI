import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';

export function ReadinessSummary({ completed, outstanding }: { completed: number; outstanding: number }) {
  return <div className="readiness-list"><div><CheckCircle2 /> {completed} fields completed</div><div><CheckCircle2 /> Tailored resume selected</div><div><CheckCircle2 /> Cover letter selected</div><div className="warning"><AlertTriangle /> {outstanding} portal questions need your input</div><div className="muted"><Circle /> Final portal validation</div></div>;
}
