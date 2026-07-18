import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const Checkbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>(({ className, ...props }, ref) => (
  <input ref={ref} type="checkbox" className={cn('checkbox', className)} {...props} />
));
Checkbox.displayName = 'Checkbox';
