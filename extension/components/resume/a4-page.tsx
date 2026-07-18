import type { GeneratedDocuments } from '../../schemas/document';

export function A4Page({ resume }: { resume: GeneratedDocuments['resume'] }) {
  return <article className="a4-page" aria-label="A4 resume preview"><header><h1>Jordan Lee</h1><p>Senior Frontend Engineer · Austin, TX</p></header>{resume.sections.map((section) => <section key={section.title}><h2>{section.title}</h2>{section.content.map((line) => <p key={line}>{line}</p>)}</section>)}</article>;
}
