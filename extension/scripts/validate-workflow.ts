import { createApplicationStore } from '../stores/application-store';
import { MemorySessionRepository } from '../repositories/mock-session-repository';

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

console.log('Validated Phase 1 workflow transitions');
