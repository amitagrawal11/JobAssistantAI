export function LoadingState({ label = 'Loading saved application…' }: { label?: string }) {
  return <div className="state-panel" role="status"><div className="skeleton" /><div className="skeleton short" /><p>{label}</p></div>;
}
