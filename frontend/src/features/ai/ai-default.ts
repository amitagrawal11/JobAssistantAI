import type { AiPreference, ProviderInfo } from '../../schemas/backend';

type SavedPreference = { provider?: string | null; model?: string | null } | null | undefined;

export function deriveAiDefault(providers: ProviderInfo[]): AiPreference | null {
  for (const provider of providers) {
    if (!provider.available) continue;
    const model = provider.selected_model ?? provider.models[0];
    if (model) {
      return { provider: provider.id, model };
    }
  }
  return null;
}

export function isAgentAvailable(providers: ProviderInfo[]): boolean {
  return deriveAiDefault(providers) !== null;
}

export function isPreferenceValid(providers: ProviderInfo[], saved: SavedPreference): boolean {
  if (!saved || (saved.provider !== 'ollama' && saved.provider !== 'openai') || !saved.model) {
    return false;
  }
  const provider = providers.find((item) => item.id === saved.provider);
  return Boolean(provider && provider.available && provider.models.includes(saved.model));
}

export function formatDefaultNotice(preference: AiPreference): string {
  const labels: Record<AiPreference['provider'], string> = { ollama: 'Ollama', openai: 'OpenAI' };
  return `Defaulted to ${labels[preference.provider]} · ${preference.model}`;
}
