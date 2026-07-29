import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Zap } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { getProviders, providersQueryKey, saveAiPreference, testProvider } from '../../api/ai';
import { profileQueryKey } from '../../api/profiles';
import { useActiveBackendProfile } from '../profile/use-active-backend-profile';
import { AgentUnavailableBanner } from '../ai/agent-unavailable-banner';
import type { AiPreference } from '../../schemas/backend';
import { browser } from '../../lib/browser-storage';

const selectClassName =
  'h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50';

export function SettingsPage() {
  const active = useActiveBackendProfile();
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: providersQueryKey, queryFn: getProviders });
  const [provider, setProvider] = useState<AiPreference['provider'] | ''>('');
  const [model, setModel] = useState('');
  const backendProfile = active.state.status === 'available' ? active.state.profile : null;
  useEffect(() => {
    const savedProvider = backendProfile?.ai_preferences.provider;
    const savedModel = backendProfile?.ai_preferences.model;
    if ((savedProvider === 'ollama' || savedProvider === 'openai') && savedModel) {
      setProvider(savedProvider);
      setModel(savedModel);
    }
  }, [backendProfile]);
  const test = useMutation({ mutationFn: () => testProvider(provider as AiPreference['provider'], model) });
  const save = useMutation({
    mutationFn: () => saveAiPreference(active.profileId!, { provider: provider as AiPreference['provider'], model }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileQueryKey(active.profileId!) });
      void browser.storage.local.set({ activeProfileRevision: Date.now() });
    },
  });
  const selectedProvider = providers.data?.providers.find((item) => item.id === provider);

  return <div className="space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Settings</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">AI provider and local data</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose where scoring and tailoring agents run.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>AI provider</CardTitle>
          <CardDescription>Ollama keeps prompts on your configured local service. OpenAI sends the minimum agent input to the selected OpenAI model. Credentials stay in the backend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AgentUnavailableBanner actionLabel="Retry" onAction={() => void providers.refetch()} />
          {providers.isError ? <p className="text-sm text-destructive">{providers.error.message}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              <span>Provider</span>
              <select className={selectClassName} value={provider} disabled={providers.isPending} onChange={(event) => { setProvider(event.target.value as AiPreference['provider']); setModel(''); test.reset(); save.reset(); }}>
                <option value="">Select provider</option>
                {providers.data?.providers.map((item) => <option key={item.id} value={item.id} disabled={!item.available}>{item.label} · {item.status.replace('_', ' ')}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>Model</span>
              <select className={selectClassName} value={model} disabled={!selectedProvider?.available} onChange={(event) => { setModel(event.target.value); test.reset(); save.reset(); }}>
                <option value="">Select model</option>
                {selectedProvider?.models.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className="text-sm text-muted-foreground">
            {test.isSuccess ? <span className="font-medium text-[var(--success)]">● {test.data.message}</span> : test.isError ? <span className="text-destructive">{test.error.message}</span> : <span>Test the selected model before using it for agents.</span>}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" disabled={!provider || !model || test.isPending} onClick={() => test.mutate()}><Zap size={14} /> {test.isPending ? 'Testing…' : 'Test connection'}</Button>
            <Button disabled={!active.profileId || !provider || !model || save.isPending} onClick={() => save.mutate()}><Save size={14} /> {save.isSuccess ? 'Saved' : save.isPending ? 'Saving…' : 'Save preference'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sensitive questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="radio" checked readOnly className="accent-primary" /> Always ask me before using an answer</label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="radio" disabled /> Infer from profile</label>
          <p className="text-sm text-muted-foreground">Sensitive, legal, demographic, disability, veteran, authorization, and sponsorship answers are never inferred.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data controls</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Runtime data comes from the local backend. Profile deletion and export will be added with backend-managed data controls.</p>
        </CardContent>
      </Card>
    </div>
  </div>;
}
