import { FlaskConical } from 'lucide-react';
import type { ReactNode } from 'react';

export function MockDataNotice({ children }: { children: ReactNode }) {
  return <aside className="mock-data-notice" role="note"><FlaskConical size={16} /><span>{children}</span></aside>;
}
