import { useQuery } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { getProviders, providersQueryKey } from '../../api/ai';
import { isAgentAvailable } from './ai-default';

export function AgentUnavailableBanner({
  actionLabel,
  onAction,
}: {
  actionLabel: string;
  onAction: () => void;
}) {
  const providers = useQuery({ queryKey: providersQueryKey, queryFn: getProviders });
  if (providers.isPending || providers.isError || !providers.data) return null;
  if (isAgentAvailable(providers.data.providers)) return null;
  return (
    <div className="agent-banner" role="alert">
      <TriangleAlert size={18} />
      <div>
        <strong>Configure an agent first</strong>
        <span>
          No AI provider is available. Start Ollama with a model, or set an OpenAI key in the
          backend, then retry.
        </span>
      </div>
      <button type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
