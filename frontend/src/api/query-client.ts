import { QueryClient } from '@tanstack/react-query';
import { BackendError } from './client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) =>
        error instanceof BackendError && error.retryable && failureCount < 2,
    },
    mutations: {
      retry: false,
    },
  },
});
