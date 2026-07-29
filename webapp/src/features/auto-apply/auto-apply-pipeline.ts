export function orderedSelectedJobs<T extends { id: string }>(
  jobs: readonly T[],
  selected: ReadonlySet<string>,
): T[] {
  return jobs.filter((job) => selected.has(job.id));
}

export function withoutSelectedJob(
  selected: ReadonlySet<string>,
  id: string,
): Set<string> {
  const next = new Set(selected);
  next.delete(id);
  return next;
}
