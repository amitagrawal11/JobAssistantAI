import type { ReactNode } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { ProfileSwitcher } from '../features/profile-switcher/profile-switcher';

export type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  backLabel,
  onBack,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {backLabel && onBack ? (
          <button
            type="button"
            aria-label={`Back to ${backLabel}`}
            title={`Back to ${backLabel}`}
            onClick={onBack}
            className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            <ArrowLeft className="size-4.5" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-foreground">
            {title}
          </h1>
          {description ? (
            <div className="mt-1 text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {actions}
        <ProfileSwitcher />
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-4.5" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-danger" />
        </button>
      </div>
    </div>
  );
}
