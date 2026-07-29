import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { quickApplyToJobPosting } from '../../api/job-postings';
import { BackendError } from '../../api/client';
import { useActiveBackendProfile } from '../profile/use-active-backend-profile';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import type { JobPosting } from '../../schemas/job-posting';

type QuickApplyDialogProps = {
  posting: JobPosting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuickApplyDialog({ posting, open, onOpenChange }: QuickApplyDialogProps) {
  const { profileId } = useActiveBackendProfile();
  const [phone, setPhone] = useState('');
  const [comments, setComments] = useState('');

  const submit = useMutation({
    mutationFn: () => quickApplyToJobPosting(posting.id, {
      profile_id: profileId!,
      phone: phone.trim() || undefined,
      comments: comments.trim() || undefined,
    }),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) submit.reset();
    onOpenChange(next);
  };

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Quick Apply</DialogTitle>
        <DialogDescription>
          Submits your active profile's resume, name, and email directly to {posting.company} via Lever — no browser form to fill out.
        </DialogDescription>
      </DialogHeader>

      {!profileId ? (
        <p className="text-sm text-destructive">Select a profile from the sidebar before using Quick Apply.</p>
      ) : submit.isSuccess ? (
        <p className="text-sm font-medium text-primary">Application submitted to {posting.company}.</p>
      ) : <>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="quick-apply-phone" className="text-sm font-medium">Phone (optional)</label>
            <Input id="quick-apply-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 555 5555" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="quick-apply-comments" className="text-sm font-medium">Note to the team (optional)</label>
            <Textarea id="quick-apply-comments" value={comments} onChange={(event) => setComments(event.target.value)} rows={3} />
          </div>
        </div>
        {submit.isError ? (
          <p className="text-sm text-destructive">
            {submit.error instanceof BackendError ? submit.error.message : 'Something went wrong submitting this application.'}
          </p>
        ) : null}
      </>}

      <DialogFooter>
        {submit.isSuccess ? (
          <Button onClick={() => handleOpenChange(false)}>Done</Button>
        ) : <>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button disabled={!profileId || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? 'Submitting…' : 'Submit application'}
          </Button>
        </>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
