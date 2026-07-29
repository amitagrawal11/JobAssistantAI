import { useMutation } from '@tanstack/react-query';
import { Check, ShieldCheck, X } from 'lucide-react';
import { reviewDocumentChange } from '../../api/tailoring';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import type { DocumentChange, DocumentTailorResponse } from '../../schemas/tailoring';

export function TailorView({
  tailored,
  onChangeReviewed,
}: {
  tailored: DocumentTailorResponse;
  onChangeReviewed: (changeId: string, status: 'approved' | 'rejected') => void;
}) {
  return <div className="space-y-6">
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Application package</p>
      <h2 className="text-lg font-semibold tracking-tight">Review the proposed changes</h2>
      <p className="text-sm text-muted-foreground">Every rewrite is grounded in your verified candidate facts.</p>
    </div>

    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Resume changes</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {tailored.resume.changes.map((change) => <ChangeCard key={change.id} change={change} onReviewed={onChangeReviewed} />)}
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Cover letter</h3>
      <Card>
        <CardContent className="space-y-3">
          {tailored.cover_letter.paragraphs.map((paragraph, index) => <p key={index} className="text-sm leading-relaxed">{paragraph}</p>)}
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--success)]">
            <ShieldCheck size={14} /> {tailored.cover_letter.source_fact_ids.length} verified source fact{tailored.cover_letter.source_fact_ids.length === 1 ? '' : 's'}
          </p>
        </CardContent>
      </Card>
    </section>
  </div>;
}

function ChangeCard({ change, onReviewed }: { change: DocumentChange; onReviewed: (changeId: string, status: 'approved' | 'rejected') => void }) {
  const unsupported = change.classification === 'NEW_CLAIM';
  const review = useMutation({
    mutationFn: (status: 'approved' | 'rejected') => reviewDocumentChange(change.id, status),
    onSuccess: (result) => onReviewed(change.id, result.status as 'approved' | 'rejected'),
  });

  return <Card className={change.status === 'rejected' ? 'opacity-60' : undefined}>
    <CardContent className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Badge variant="secondary">{change.classification}</Badge><h4 className="text-sm font-semibold">{change.section}</h4></div>
        <Badge variant={change.status === 'approved' ? 'default' : change.status === 'rejected' ? 'destructive' : 'outline'}>{change.status}</Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><p className="text-xs font-semibold text-muted-foreground">Before</p><p className="text-sm">{change.before || <span className="italic text-muted-foreground">(new addition)</span>}</p></div>
        <div><p className="text-xs font-semibold text-muted-foreground">After</p><p className="text-sm">{change.after}</p></div>
      </div>
      <p className="text-sm text-muted-foreground">{change.reason}</p>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--success)]">
        <ShieldCheck size={14} /> {change.source_fact_ids.length} verified source fact{change.source_fact_ids.length === 1 ? '' : 's'}
      </p>
      {unsupported ? <p className="text-xs text-destructive">Unsupported new claims should be rejected unless you can personally verify them.</p> : null}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" disabled={review.isPending} onClick={() => review.mutate('rejected')}><X size={14} /> Reject</Button>
        <Button size="sm" disabled={review.isPending} onClick={() => review.mutate('approved')}><Check size={14} /> Accept</Button>
      </div>
    </CardContent>
  </Card>;
}
