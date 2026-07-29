import type { HTMLAttributes } from 'react';

export function PageLayout({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-testid="page-layout"
      className={`flex h-full min-h-0 w-full flex-col ${className}`}
      {...props}
    />
  );
}

export function PageScrollArea({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-testid="page-scroll-area"
      className={`min-h-0 flex-1 overflow-y-auto ${className}`}
      {...props}
    />
  );
}
