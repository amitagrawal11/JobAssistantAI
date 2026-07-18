import type { PersistedSession } from '../schemas/session';

export type SessionLoadResult =
  | { status: 'restored'; session: PersistedSession }
  | { status: 'seeded'; session: PersistedSession }
  | { status: 'recovered'; session: PersistedSession; reason: string };

export interface SessionRepository {
  load(): Promise<SessionLoadResult>;
  save(checkpoint: PersistedSession): Promise<void>;
  reset(): Promise<PersistedSession>;
}
