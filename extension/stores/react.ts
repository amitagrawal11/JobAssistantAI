import { useStore } from 'zustand';
import { MockSessionRepository } from '../repositories/mock-session-repository';
import { createApplicationStore, type ApplicationStore } from './application-store';

export const applicationStore = createApplicationStore(new MockSessionRepository());

export function useApplicationStore<T>(selector: (state: ApplicationStore) => T) {
  return useStore(applicationStore, selector);
}
