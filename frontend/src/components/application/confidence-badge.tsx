import { Badge } from '../ui/badge';

export function ConfidenceBadge({ confidence, sensitive }: { confidence: string; sensitive: boolean }) {
  return <Badge className={sensitive ? 'badge-sensitive' : `badge-${confidence}`}>{sensitive ? 'Sensitive' : confidence[0].toUpperCase() + confidence.slice(1)}</Badge>;
}
