import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { Button } from './button';

export function ConfirmDialog({ trigger, title, description, confirmLabel, onConfirm }: { trigger: ReactNode; title: string; description: string; confirmLabel: string; onConfirm: () => void }) {
  return <DialogPrimitive.Root><DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger><DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay" /><DialogPrimitive.Content className="dialog-content"><DialogPrimitive.Title>{title}</DialogPrimitive.Title><DialogPrimitive.Description>{description}</DialogPrimitive.Description><div className="dialog-actions"><DialogPrimitive.Close asChild><Button variant="secondary">Cancel</Button></DialogPrimitive.Close><DialogPrimitive.Close asChild><Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button></DialogPrimitive.Close></div></DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>;
}
