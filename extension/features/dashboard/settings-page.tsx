import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { getProviders, providersQueryKey, saveAiPreference, testProvider } from '../../api/ai';
import { profileQueryKey } from '../../api/profiles';
import { useActiveBackendProfile } from '../profile/use-active-backend-profile';
import type { AiPreference } from '../../schemas/backend';

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

  return <><div className="page-heading"><div><p className="eyebrow">Settings</p><h1>AI provider and local data</h1><p>Choose where scoring and tailoring agents run.</p></div></div><div className="settings-grid">
    <section className="settings-card ai-settings"><h2>AI provider</h2><p>Ollama keeps prompts on your configured local service. OpenAI sends the minimum agent input to the selected OpenAI model. Credentials stay in the backend.</p>{providers.isError ? <p className="form-error">{providers.error.message}</p> : null}<label className="field-label">Provider<select className="input" value={provider} disabled={providers.isPending} onChange={(event) => { setProvider(event.target.value as AiPreference['provider']); setModel(''); test.reset(); save.reset(); }}><option value="">Select provider</option>{providers.data?.providers.map((item) => <option key={item.id} value={item.id} disabled={!item.available}>{item.label} · {item.status.replace('_', ' ')}</option>)}</select></label><label className="field-label">Model<select className="input" value={model} disabled={!selectedProvider?.available} onChange={(event) => { setModel(event.target.value); test.reset(); save.reset(); }}><option value="">Select model</option>{selectedProvider?.models.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div className="provider-status">{test.isSuccess ? <span className="ready">● {test.data.message}</span> : test.isError ? <span className="form-error">{test.error.message}</span> : <span>Test the selected model before using it for agents.</span>}</div><div className="inline-actions"><Button variant="secondary" disabled={!provider || !model || test.isPending} onClick={() => test.mutate()}>{test.isPending ? 'Testing…' : 'Test connection'}</Button><Button disabled={!active.profileId || !provider || !model || save.isPending} onClick={() => save.mutate()}>{save.isSuccess ? 'Saved' : save.isPending ? 'Saving…' : 'Save preference'}</Button></div></section>
    <section className="settings-card"><h2>Sensitive questions</h2><label><input type="radio" checked readOnly /> Always ask me before using an answer</label><label><input type="radio" disabled /> Infer from profile</label><p>Sensitive, legal, demographic, disability, veteran, authorization, and sponsorship answers are never inferred.</p></section>
    <section className="settings-card"><h2>Data controls</h2><p>Runtime data comes from the local backend. Profile deletion and export will be added with backend-managed data controls.</p></section>
  </div></>;
}
