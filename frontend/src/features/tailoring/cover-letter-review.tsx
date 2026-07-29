import { ShieldCheck } from 'lucide-react';
import { useApplicationStore } from '../../stores/react';

export function CoverLetterReview() {
  const letter = useApplicationStore((state) => state.documents.coverLetter);
  return <article className="letter-page"><header><span>Jordan Lee</span><span>Austin, TX</span></header>{letter.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<footer><ShieldCheck size={15} /> Supported by {letter.sourceFactIds.length} verified candidate facts</footer></article>;
}
