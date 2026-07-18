import { createApplicationStore } from '../stores/application-store';
import { MemorySessionRepository } from '../repositories/mock-session-repository';

const repository = new MemorySessionRepository();
const dashboard = createApplicationStore(repository);
const sidepanel = createApplicationStore(repository);

await dashboard.getState().hydrate();
await sidepanel.getState().hydrate();
await dashboard.getState().editJobDescription('Cross-surface update');
await new Promise((resolve) => setTimeout(resolve, 0));

if (sidepanel.getState().job.description !== 'Cross-surface update') {
  throw new Error('Repository change did not refresh the second surface');
}

console.log('Validated cross-surface repository synchronization');
