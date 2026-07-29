import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Loader2, Plug, AlertCircle, RefreshCw } from 'lucide-react';
import { getProviders, providersQueryKey, testProvider, saveAiPreference } from '../api/ai';
import { useActiveProfileId } from '../lib/active-profile';
import { BackendError } from '../api/client';
import type { AiPreference } from '../schemas/backend';

const STATUS_TONE: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-700',
  not_configured: 'bg-amber-50 text-amber-700',
  unavailable: 'bg-rose-50 text-rose-700',
  no_models: 'bg-amber-50 text-amber-700',
};
const STATUS_LABEL: Record<string, string> = {
  available: 'Available',
  not_configured: 'Not configured',
  unavailable: 'Unavailable',
  no_models: 'No models',
};
const PROVIDER_DESC: Record<string, string> = {
  ollama: 'Runs locally — prompts stay on your machine.',
  openai: 'Sends the minimum agent input to the selected model.',
};

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick}
      className={'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ' + (on ? 'bg-primary' : 'bg-muted-foreground/30')}>
      <span className="inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: on ? 'translateX(22px)' : 'translateX(2px)' }} />
    </button>
  );
}

export function SettingsPage() {
  const activeProfileId = useActiveProfileId();
  const providersQ = useQuery({ queryKey: providersQueryKey, queryFn: getProviders });

  const [provider, setProvider] = useState<AiPreference['provider']>('ollama');
  const [model, setModel] = useState('');
  const [askSensitive, setAskSensitive] = useState(true);
  const [autoApply, setAutoApply] = useState(false);

  // Seed selection from backend once providers load.
  useEffect(() => {
    if (!providersQ.data) return;
    const first = providersQ.data.providers.find((p) => p.available) ?? providersQ.data.providers[0];
    if (!first) return;
    setProvider(first.id);
    setModel(first.selected_model ?? first.models[0] ?? '');
  }, [providersQ.data]);

  const active = providersQ.data?.providers.find((p) => p.id === provider);

  const test = useMutation({ mutationFn: () => testProvider(provider, model) });
  const save = useMutation({
    mutationFn: () => saveAiPreference(activeProfileId as string, { provider, model }),
  });

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-primary">Settings</p>
      <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-foreground">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose where AI agents run and manage your preferences.</p>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">AI provider</h2>
            <p className="mt-1 text-sm text-muted-foreground">Credentials stay in the backend and are never exposed to the app.</p>
          </div>
          {providersQ.isFetching ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>

        {providersQ.isLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
          </div>
        ) : providersQ.isError ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">{providersQ.error instanceof BackendError ? providersQ.error.message : 'Could not reach the backend.'}</p>
            <button onClick={() => providersQ.refetch()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-muted"><RefreshCw className="size-3.5" /> Retry</button>
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {providersQ.data!.providers.map((p) => (
                <button key={p.id}
                  onClick={() => { setProvider(p.id); setModel(p.selected_model ?? p.models[0] ?? ''); save.reset(); test.reset(); }}
                  className={'rounded-xl border p-3 text-left transition-colors ' + (provider === p.id ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/40')}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{p.label}</span>
                    <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + (STATUS_TONE[p.status] ?? 'bg-muted text-muted-foreground')}>{STATUS_LABEL[p.status] ?? p.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{PROVIDER_DESC[p.id] ?? ''}</p>
                </button>
              ))}
            </div>

            <label className="mt-4 block text-[13px] font-medium text-foreground">
              Model
              <select value={model} onChange={(e) => { setModel(e.target.value); save.reset(); test.reset(); }}
                disabled={!active || active.models.length === 0}
                className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50">
                {active && active.models.length > 0
                  ? active.models.map((m) => <option key={m} value={m}>{m}</option>)
                  : <option value="">No models available</option>}
              </select>
            </label>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={() => save.mutate()} disabled={!activeProfileId || !model || save.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-[0_4px_11px_-5px_oklch(0.66_0.19_265_/_0.5)] hover:bg-[var(--primary-hover)] disabled:opacity-50">
                {save.isPending ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : save.isSuccess ? <><Check className="size-4" /> Saved</> : 'Save preference'}
              </button>
              <button onClick={() => test.mutate()} disabled={!model || test.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50">
                {test.isPending ? <><Loader2 className="size-4 animate-spin" /> Testing…</> : <><Plug className="size-4" /> Test connection</>}
              </button>
              <span className="text-xs text-muted-foreground">{active?.label} · {model || '—'}</span>
            </div>

            {!activeProfileId ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-700"><AlertCircle className="size-3.5" /> Create a profile on the Profile page to save your preference.</p>
            ) : null}
            {test.data ? (
              <p className={'mt-3 rounded-lg px-3 py-2 text-[13px] ' + (test.data.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{test.data.message}</p>
            ) : null}
            {test.isError ? (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{test.error instanceof BackendError ? test.error.message : 'Test failed.'}</p>
            ) : null}
            {save.isError ? (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{save.error instanceof BackendError ? save.error.message : 'Could not save.'}</p>
            ) : null}
          </>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-[15px] font-semibold text-foreground">Preferences</h2>
        <div className="mt-3 divide-y divide-border">
          <div className="flex items-center justify-between py-3">
            <div><p className="text-sm font-medium text-foreground">Always ask before using sensitive answers</p><p className="text-xs text-muted-foreground">Legal, demographic, and authorization answers are never inferred.</p></div>
            <Toggle on={askSensitive} onClick={() => setAskSensitive((v) => !v)} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div><p className="text-sm font-medium text-foreground">Enable Auto-Apply bucket</p><p className="text-xs text-muted-foreground">Queue selected roles for one-click applying.</p></div>
            <Toggle on={autoApply} onClick={() => setAutoApply((v) => !v)} />
          </div>
        </div>
      </section>
    </div>
  );
}
