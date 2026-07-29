import type { z } from 'zod';
import { backendErrorSchema } from '../schemas/backend';
import { browser } from '../lib/browser-storage';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';
const DEFAULT_DEVELOPMENT_TOKEN = 'change-me-for-local-development';
const DEFAULT_TIMEOUT_MS = 15_000;

type BackendConnection = {
  baseUrl: string;
  bearerToken: string;
};

export class BackendError extends Error {
  code: string;
  retryable: boolean;
  status: number | null;
  details: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    retryable: boolean,
    status: number | null,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
    this.details = details;
  }
}

async function connection(): Promise<BackendConnection> {
  const stored = await browser.storage.local.get([
    'backendBaseUrl',
    'backendBearerToken',
  ]);
  return {
    baseUrl:
      typeof stored.backendBaseUrl === 'string'
        ? stored.backendBaseUrl.replace(/\/$/, '')
        : DEFAULT_BASE_URL,
    bearerToken:
      typeof stored.backendBearerToken === 'string'
        ? stored.backendBearerToken
        : DEFAULT_DEVELOPMENT_TOKEN,
  };
}

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const backend = await connection();
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  init.signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${backend.bearerToken}`);
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(`${backend.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      const parsedError = backendErrorSchema.safeParse(payload);
      if (parsedError.success) {
        throw new BackendError(
          parsedError.data.error.code,
          parsedError.data.error.message,
          parsedError.data.error.retryable,
          response.status,
          parsedError.data.error.details,
        );
      }
      throw new BackendError(
        'INVALID_ERROR_RESPONSE',
        'The backend returned an unexpected error response.',
        false,
        response.status,
      );
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new BackendError(
        'INVALID_BACKEND_RESPONSE',
        'The backend returned data that does not match the application contract.',
        false,
        response.status,
        { issues: parsed.error.issues },
      );
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof BackendError) throw error;
    if (controller.signal.aborted) {
      throw new BackendError(
        'BACKEND_TIMEOUT',
        'The backend did not respond in time.',
        true,
        null,
      );
    }
    throw new BackendError(
      'BACKEND_UNAVAILABLE',
      'The local backend is unavailable.',
      true,
      null,
    );
  } finally {
    globalThis.clearTimeout(timeout);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
}
