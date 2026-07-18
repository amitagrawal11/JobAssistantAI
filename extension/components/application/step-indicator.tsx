import { cn } from '../../lib/cn';

const steps = ['Profile', 'Scan', 'Match', 'Tailor', 'Fill', 'Confirm'] as const;
export type StepName = Lowercase<(typeof steps)[number]>;

export function StepIndicator({ current, maxUnlocked, onNavigate }: { current: StepName; maxUnlocked: number; onNavigate: (step: StepName) => void }) {
  const active = Math.max(0, steps.findIndex((step) => step.toLowerCase() === current));
  return <ol className="step-indicator" aria-label="Application progress">
    {steps.map((step, index) => <li key={step} className={cn(index === active && 'active', index < maxUnlocked && 'complete')} aria-current={index === active ? 'step' : undefined}><button type="button" disabled={index > maxUnlocked} onClick={() => onNavigate(step.toLowerCase() as StepName)} aria-label={`${step}${index > maxUnlocked ? ' locked' : ''}`}><span>{index + 1}</span>{step}</button></li>)}
  </ol>;
}
