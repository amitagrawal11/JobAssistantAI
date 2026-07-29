import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getProfile, profileQueryKey, verifyProfileFacts } from '../../api/profiles';
import { getSourcePreview, sourcePreviewQueryKey } from '../../api/documents';
import type { BackendProfile } from '../../schemas/backend';
import { Button } from '../../components/ui/button';
import { FactReview } from './fact-review';
import { ParsedSourceText } from './parsed-source-text';
import { browser } from '../../lib/browser-storage';

type Fact = BackendProfile['facts'][number];

export function SourceFactVerification({ profileId, documentId }: { profileId: string; documentId: string }) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: profileQueryKey(profileId), queryFn: () => getProfile(profileId) });
  const previewQuery = useQuery({ queryKey: sourcePreviewQueryKey(documentId), queryFn: () => getSourcePreview(documentId) });
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pendingFactId, setPendingFactId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { fact: Fact; value?: string; verified?: boolean; comparisonResolved?: boolean }) => verifyProfileFacts(profileId, {
      facts: [{ fact_id: input.fact.id, value: input.value, verified: input.verified ?? (input.value === undefined) }],
      source_comparison_resolved: input.comparisonResolved,
    }),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey(profileId), profile);
      void queryClient.invalidateQueries({ queryKey: sourcePreviewQueryKey(documentId) });
      void browser.storage.local.set({ activeProfileRevision: Date.now() });
      setPendingFactId(null);
    },
    onError: () => setPendingFactId(null),
  });
  const profile = profileQuery.data;
  const preview = previewQuery.data;
  const selectedFact = profile?.facts.find((fact) => fact.id === selectedFactId) ?? profile?.facts[0];
  const selectedRegion = preview?.fact_regions.find((region) => region.fact_id === selectedFact?.id);
  const page = preview?.pages.find((candidate) => candidate.number === pageNumber) ?? preview?.pages[0];

  useEffect(() => {
    if (!selectedFactId && profile?.facts[0]) setSelectedFactId(profile.facts[0].id);
  }, [profile, selectedFactId]);
  useEffect(() => {
    if (selectedRegion) setPageNumber(selectedRegion.page_number);
  }, [selectedRegion]);

  const highlightStyle = useMemo(() => {
    if (!selectedRegion?.available || !selectedRegion.normalized_box) return undefined;
    const [left, top, width, height] = selectedRegion.normalized_box;
    return { left: `${left * 100}%`, top: `${top * 100}%`, width: `${width * 100}%`, height: `${height * 100}%` };
  }, [selectedRegion]);

  if (profileQuery.isPending || previewQuery.isPending) return <section className="source-loading"><div className="skeleton" /><div className="skeleton" /><p>Preparing the source comparison…</p></section>;
  if (profileQuery.isError || previewQuery.isError || !profile || !preview || !page) return <section className="state-panel error"><AlertTriangle /><h2>Source comparison unavailable</h2><p>{profileQuery.error?.message ?? previewQuery.error?.message ?? 'The resume preview could not be loaded.'}</p><Button variant="secondary" onClick={() => { void profileQuery.refetch(); void previewQuery.refetch(); }}><RefreshCw size={14} /> Try again</Button></section>;

  const selectFact = (fact: Fact) => {
    setSelectedFactId(fact.id);
    const region = preview.fact_regions.find((candidate) => candidate.fact_id === fact.id);
    if (region) setPageNumber(region.page_number);
  };
  const mutateFact = (fact: Fact, value?: string, comparisonResolved?: boolean, verified?: boolean) => {
    setPendingFactId(fact.id);
    mutation.mutate({ fact, value, comparisonResolved, verified });
  };
  const resolveComparison = () => {
    const fact = profile.facts[0];
    if (fact) mutateFact(fact, undefined, true, fact.verified);
  };

  return <>
    {!profile.source_comparison_resolved ? <aside className="comparison-nudge"><AlertTriangle /><div><strong>Compare the extraction with the source</strong><span>Confirm that names, dates, employers, and skills match the uploaded resume before using them.</span></div><Button size="sm" onClick={resolveComparison} disabled={mutation.isPending || profile.facts.length === 0}><CheckCircle2 size={14} /> Comparison complete</Button></aside> : null}
    {mutation.isError ? <p className="form-error" role="alert">{mutation.error.message}</p> : null}
    <div className="source-comparison-layout">
      <ParsedSourceText preview={preview} pageNumber={page.number} />
      <section className="source-column" aria-label="Original resume">
        <div className="source-toolbar"><div><p className="eyebrow">Original source</p><strong>{preview.filename}</strong></div><div className="page-controls"><Button size="icon" variant="ghost" aria-label="Previous source page" disabled={pageNumber <= 1} onClick={() => setPageNumber((current) => current - 1)}><ChevronLeft /></Button><span>Page {page.number} of {preview.pages.length}</span><Button size="icon" variant="ghost" aria-label="Next source page" disabled={pageNumber >= preview.pages.length} onClick={() => setPageNumber((current) => current + 1)}><ChevronRight /></Button></div></div>
        <div className="source-canvas">
          <div className="source-a4">
            {page.image_data_url ? <img src={page.image_data_url} alt={`Original resume page ${page.number}`} /> : <iframe title={`Resume page ${page.number}`} sandbox="" srcDoc={page.html ?? ''} />}
            {highlightStyle && selectedRegion?.page_number === page.number ? <span className="source-highlight" style={highlightStyle} aria-label="Selected fact source" /> : null}
          </div>
          {selectedFact && !selectedRegion?.available ? <p className="provenance-note">Exact highlighting is unavailable for this DOCX preview. Page {selectedRegion?.page_number ?? selectedFact.source.page ?? 1} contains the extracted source; compare the visible text before verifying.</p> : null}
        </div>
      </section>
    </div>
    <FactReview backendProfile={profile} selectedFactId={selectedFact?.id} pendingFactId={pendingFactId} onSelectFact={selectFact} onSaveFact={(fact, value) => mutateFact(fact, value)} onVerifyFact={(fact) => mutateFact(fact)} />
  </>;
}
