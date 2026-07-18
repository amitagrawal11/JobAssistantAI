import { mockSession } from '../mock/session';
import { sessionSchema, type PersistedSession } from '../schemas/session';
import type { SessionLoadResult, SessionRepository } from './session-repository';

const STORAGE_KEY = 'job-copilot.phase-1.session';
const cloneSeed = () => structuredClone(mockSession);

export class MemorySessionRepository implements SessionRepository {
  protected checkpoint: PersistedSession | null = null;

  async load(): Promise<SessionLoadResult> {
    if (!this.checkpoint) return { status: 'seeded', session: cloneSeed() };
    return { status: 'restored', session: structuredClone(this.checkpoint) };
  }

  async save(checkpoint: PersistedSession): Promise<void> {
    this.checkpoint = sessionSchema.parse(structuredClone(checkpoint));
  }

  async reset(): Promise<PersistedSession> {
    this.checkpoint = cloneSeed();
    return structuredClone(this.checkpoint);
  }
}

export class MockSessionRepository implements SessionRepository {
  async load(): Promise<SessionLoadResult> {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { status: 'seeded', session: cloneSeed() };

    try {
      const parsed = sessionSchema.safeParse(JSON.parse(stored));
      if (!parsed.success) {
        localStorage.removeItem(STORAGE_KEY);
        return {
          status: 'recovered',
          session: cloneSeed(),
          reason: 'Saved demo data was incompatible and has been safely reset.',
        };
      }
      return { status: 'restored', session: parsed.data };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return {
        status: 'recovered',
        session: cloneSeed(),
        reason: 'Saved demo data could not be read and has been safely reset.',
      };
    }
  }

  async save(checkpoint: PersistedSession): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionSchema.parse(checkpoint)));
  }

  async reset(): Promise<PersistedSession> {
    const session = cloneSeed();
    await this.save(session);
    return session;
  }
}
