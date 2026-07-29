import type { CanonicalResume } from '../../schemas/tailoring';

export function BasicA4Resume({
  resume,
  focusedFactIds = new Set<string>(),
  showChanges = false,
}: {
  resume: CanonicalResume;
  focusedFactIds?: Set<string>;
  showChanges?: boolean;
}) {
  return (
    <article className="tailor-a4-page" aria-label="A4 resume preview">
      <header>
        <h1>{resume.name}</h1>
        <p>{[resume.email, ...Object.values(resume.contact)].filter(Boolean).join(' · ')}</p>
      </header>
      {resume.sections.map((section) => (
        <section key={section.id} data-section-id={section.id}>
          <h2>{section.title}</h2>
          {section.items.map((item) => {
            const highlighted = showChanges && item.source_fact_ids.some((id) => focusedFactIds.has(id));
            return (
              <div key={item.id} className="tailor-resume-item" data-node-id={item.id} data-highlighted={highlighted ? 'true' : 'false'}>
                {!['summary', 'skills'].includes(section.id) ? <strong>{item.label}: </strong> : null}
                <span data-highlighted={highlighted ? 'true' : 'false'}>{item.value}</span>
              </div>
            );
          })}
        </section>
      ))}
    </article>
  );
}
