import { mockSession } from '../mock/session';

const facts = new Map(mockSession.profile.facts.map((fact) => [fact.id, fact]));
const referencedFactIds = [
  ...mockSession.matchResult.items.flatMap((item) => item.sourceFactIds),
  ...mockSession.documents.resume.changes.flatMap((change) => change.sourceFactIds),
];

for (const factId of referencedFactIds) {
  const fact = facts.get(factId);
  if (!fact) throw new Error(`Fixture references missing fact: ${factId}`);
  if (!fact.verified) throw new Error(`Fixture references unverified fact: ${factId}`);
}

console.log('Validated Phase 1 fixtures');
