import { aiPreferenceSchema, providerListSchema, providerTestSchema, type AiPreference } from '../schemas/backend';
import { apiRequest } from './client';

export const providersQueryKey = ['ai', 'providers'] as const;

export function getProviders() {
  return apiRequest('/ai/providers', providerListSchema, {}, 30_000);
}

export function testProvider(provider: AiPreference['provider'], model: string) {
  return apiRequest(`/ai/providers/${provider}/test`, providerTestSchema, {
    method: 'POST', body: JSON.stringify({ model }),
  }, 120_000);
}

export function saveAiPreference(profileId: string, preference: AiPreference) {
  return apiRequest(`/profiles/${profileId}/ai-preferences`, aiPreferenceSchema, {
    method: 'PATCH', body: JSON.stringify(preference),
  });
}
