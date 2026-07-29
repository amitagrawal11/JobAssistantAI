import { Check } from 'lucide-react';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '../reui/stepper';

const steps = [
  { id: 'profile', label: 'Profile' },
  { id: 'scan', label: 'Job' },
  { id: 'match', label: 'Match' },
  { id: 'tailor', label: 'Tailor' },
  { id: 'fill', label: 'Fill' },
  { id: 'confirm', label: 'Confirm' },
] as const;
export type StepName = (typeof steps)[number]['id'];

export function StepIndicator({ current, maxUnlocked, onNavigate }: { current: StepName; maxUnlocked: number; onNavigate: (step: StepName) => void }) {
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === current));
  return <Stepper
    value={activeIndex + 1}
    onValueChange={(value) => onNavigate(steps[value - 1].id)}
    indicators={{ completed: <Check className="size-3.5" /> }}
  >
    <StepperNav aria-label="Application progress">
      {steps.map((step, index) => (
        <StepperItem key={step.id} step={index + 1} disabled={index > maxUnlocked} className="relative">
          <StepperTrigger aria-label={`${step.label}${index > maxUnlocked ? ' locked' : ''}`}>
            <StepperIndicator>{index + 1}</StepperIndicator>
            <StepperTitle>{step.label}</StepperTitle>
          </StepperTrigger>
          {index < steps.length - 1 ? <StepperSeparator /> : null}
        </StepperItem>
      ))}
    </StepperNav>
  </Stepper>;
}
