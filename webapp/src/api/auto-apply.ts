import {
  autoApplyQueueItemSchema,
  autoApplyQueueListSchema,
  type AutoApplyQueueItem,
  type AutoApplyQueueList,
  type AutoApplyStatus,
  autoApplyPipelineSchema,
  autoApplyPipelineListSchema,
  type AutoApplyPipeline,
  type AutoApplyPipelineList,
} from '../schemas/auto-apply';
import { apiRequest } from './client';
import { z } from 'zod';

export const autoApplyQueueKey = (profileId: string) => ['auto-apply', profileId] as const;

export function listAutoApplyQueue(profileId: string): Promise<AutoApplyQueueList> {
  return apiRequest(`/auto-apply/queue?profile_id=${encodeURIComponent(profileId)}`, autoApplyQueueListSchema);
}

export function enqueueAutoApply(input: { profile_id: string; job_posting_id: string; note?: string }): Promise<AutoApplyQueueItem> {
  return apiRequest(`/auto-apply/queue`, autoApplyQueueItemSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAutoApplyStatus(id: string, status: AutoApplyStatus): Promise<AutoApplyQueueItem> {
  return apiRequest(`/auto-apply/queue/${id}`, autoApplyQueueItemSchema, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function removeAutoApplyItem(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/auto-apply/queue/${id}`, z.object({ ok: z.boolean() }), {
    method: 'DELETE',
  });
}

export const autoApplyPipelinesKey = (profileId: string) =>
  ['auto-apply-pipelines', profileId] as const;

export function createAutoApplyPipeline(input: {
  profile_id: string;
  job_posting_ids: string[];
}): Promise<AutoApplyPipeline> {
  return apiRequest('/auto-apply/pipelines', autoApplyPipelineSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listAutoApplyPipelines(profileId: string): Promise<AutoApplyPipelineList> {
  return apiRequest(
    `/auto-apply/pipelines?profile_id=${encodeURIComponent(profileId)}`,
    autoApplyPipelineListSchema,
  );
}
