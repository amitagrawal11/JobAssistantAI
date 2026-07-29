import { mockSession } from '../mock/session';
import { sessionSchema, type PersistedSession } from '../schemas/session';
import type { SessionLoadResult, SessionRepository } from './session-repository';
import { browser, type StorageChange } from '../lib/browser-storage';

const STORAGE_KEY = 'job-copilot.phase-1.session';
const cloneSeed = () => structuredClone(mockSession);

export class MemorySessionRepository implements SessionRepository {
  protected checkpoint: PersistedSession | null = null;
  private listeners = new Set<() => void>();

  async load(): Promise<SessionLoadResult> {
    if (!this.checkpoint) return { status: 'seeded', session: cloneSeed() };
    return { status: 'restored', session: structuredClone(this.checkpoint) };
  }

  async save(checkpoint: PersistedSession): Promise<void> {
    this.checkpoint = sessionSchema.parse(structuredClone(checkpoint));
    this.listeners.forEach((listener) => listener());
  }

  async reset(): Promise<PersistedSession> {
    this.checkpoint = cloneSeed();
    this.listeners.forEach((listener) => listener());
    return structuredClone(this.checkpoint);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export class MockSessionRepository implements SessionRepository {
  async load(): Promise<SessionLoadResult> {
    const record = await browser.storage.local.get(STORAGE_KEY);
    const stored = record[STORAGE_KEY];
    if (!stored) return { status: 'seeded', session: cloneSeed() };

    const parsed = sessionSchema.safeParse(stored);
    if (!parsed.success) {
      await browser.storage.local.remove(STORAGE_KEY);
      return {
        status: 'recovered',
        session: cloneSeed(),
        reason: 'Saved demo data was incompatible and has been safely reset.',
      };
    }
    return { status: 'restored', session: parsed.data };
  }

  async save(checkpoint: PersistedSession): Promise<void> {
    await browser.storage.local.set({ [STORAGE_KEY]: sessionSchema.parse(checkpoint) });
  }

  async reset(): Promise<PersistedSession> {
    const session = cloneSeed();
    await this.save(session);
    return session;
  }

  subscribe(listener: () => void) {
    const handleChange = (changes: Record<string, StorageChange>, areaName: string) => {
      if (areaName === 'local' && changes[STORAGE_KEY]) listener();
    };
    browser.storage.onChanged.addListener(handleChange);
    return () => browser.storage.onChanged.removeListener(handleChange);
  }
}
