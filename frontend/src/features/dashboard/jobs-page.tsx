import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, ChevronLeft, ChevronRight, ExternalLink, MapPin, Search } from 'lucide-react';
import { jobPostingsQueryKey, listJobPostings } from '../../api/job-postings';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { QUICK_APPLY_VENDORS, type JobPosting } from '../../schemas/job-posting';
import { QuickApplyDialog } from './quick-apply-dialog';

const PAGE_SIZE = 24;

export function JobsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [quickApplyPosting, setQuickApplyPosting] = useState<JobPosting | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const postings = useQuery({
    queryKey: jobPostingsQueryKey(search, page, PAGE_SIZE),
    queryFn: () => listJobPostings(search, page, PAGE_SIZE),
    placeholderData: (previous) => previous,
  });

  const totalPages = postings.data ? Math.max(1, Math.ceil(postings.data.total / PAGE_SIZE)) : 1;

  return <div className="space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Jobs</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Browse jobs</h1>
      <p className="mt-1 text-sm text-muted-foreground">Synced from company job boards and stored locally, so browsing here doesn't hit vendor APIs directly.</p>
    </div>

    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search by skill, title, team, or location…"
        className="pl-9"
        aria-label="Search jobs"
      />
    </div>

    {postings.isPending ? <Card><CardContent className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">Loading postings…</CardContent></Card>
      : postings.isError ? <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-2 text-center"><Briefcase className="size-8 text-muted-foreground" /><h2 className="text-base font-semibold">Could not load postings</h2><p className="max-w-sm text-sm text-muted-foreground">{postings.error.message}</p></CardContent></Card>
        : postings.data.items.length === 0 ? <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-2 text-center"><Briefcase className="size-8 text-muted-foreground" /><h2 className="text-base font-semibold">No job listings found</h2><p className="max-w-sm text-sm text-muted-foreground">{search ? 'No postings match your search.' : 'No open postings right now.'}</p></CardContent></Card>
          : <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {postings.data.items.map((posting) => (
                <Card key={posting.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{posting.company}</p>
                      <h3 className="text-sm font-semibold leading-snug">{posting.title}</h3>
                      {posting.team ? <p className="text-xs text-muted-foreground">{posting.team}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {posting.location ? <Badge variant="secondary"><MapPin size={12} /> {posting.location}</Badge> : null}
                      {posting.commitment ? <Badge variant="outline">{posting.commitment}</Badge> : null}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <a
                        href={posting.hosted_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                      >
                        View posting <ExternalLink size={14} />
                      </a>
                      {QUICK_APPLY_VENDORS.has(posting.vendor) ? (
                        <Button size="sm" onClick={() => setQuickApplyPosting(posting)}>Quick Apply</Button>
                      ) : (
                        <Button asChild size="sm">
                          <a href={posting.apply_url ?? posting.hosted_url} target="_blank" rel="noreferrer">
                            Apply
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{postings.data.total.toLocaleString()} postings · page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={14} /> Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight size={14} /></Button>
              </div>
            </div>
          </>}

    {quickApplyPosting ? (
      <QuickApplyDialog
        posting={quickApplyPosting}
        open
        onOpenChange={(next) => { if (!next) setQuickApplyPosting(null); }}
      />
    ) : null}
  </div>;
}
