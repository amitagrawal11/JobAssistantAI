import { createApplicationStore } from '../stores/application-store';
import { MemorySessionRepository } from '../repositories/mock-session-repository';
import {
  backendMaxUnlocked,
  isScanReadOnly,
} from '../features/application/backend-workflow';

const repository = new MemorySessionRepository();
const store = createApplicationStore(repository);

await store.getState().hydrate();
await store.getState().analyzeMockJob();

if (store.getState().workflowStatus !== 'scored') {
  throw new Error('Happy path did not reach scored');
}

const illegal = await store.getState().transitionTo('completed');
if (illegal.ok || store.getState().workflowStatus !== 'scored') {
  throw new Error('Illegal transition mutated the workflow');
}

if (isScanReadOnly(null)) {
  throw new Error('Fresh Scan was made read-only by legacy workflow state');
}
if (!isScanReadOnly({ job_id: 'saved', description: 'Saved job content' })) {
  throw new Error('Completed Scan remained editable');
}
if (backendMaxUnlocked({ profileReady: true, hasJob: false, hasMatch: false, legacyIndex: 5 }) !== 1) {
  throw new Error('Legacy workflow unlocked Match before backend job analysis');
}
if (backendMaxUnlocked({ profileReady: true, hasJob: true, hasMatch: false, legacyIndex: 5 }) !== 2) {
  throw new Error('Legacy workflow unlocked Tailor before backend match scoring');
}

console.log('Validated Phase 1 workflow transitions');
