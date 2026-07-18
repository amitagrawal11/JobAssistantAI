import { cn } from '../../lib/cn';

const steps = ['Scan', 'Match', 'Tailor', 'Fill', 'Confirm'] as const;

export function StepIndicator({ current }: { current: string }) {
  const active = Math.max(0, steps.findIndex((step) => step.toLowerCase() === current));
  return <ol className="step-indicator" aria-label="Application progress">
    {steps.map((step, index) => <li key={step} className={cn(index === active && 'active', index < active && 'complete')} aria-current={index === active ? 'step' : undefined}><span>{index + 1}</span>{step}</li>)}
  </ol>;
}
