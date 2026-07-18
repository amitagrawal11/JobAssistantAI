import type { ReactNode } from 'react';
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="state-panel"><h2>{title}</h2><div>{children}</div></div>;
}
