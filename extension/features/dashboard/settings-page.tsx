import { ConfirmDialog } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useApplicationStore } from '../../stores/react';
import { MockDataNotice } from '../../components/states/mock-data-notice';

export function SettingsPage() {
  const profile = useApplicationStore((state) => state.profile);
  const applications = useApplicationStore((state) => state.applications);
  const setAnswer = useApplicationStore((state) => state.setReusableAnswer);
  const reset = useApplicationStore((state) => state.resetDemo);
  const exportData = () => { const blob = new Blob([JSON.stringify({ profile, applications }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'job-copilot-phase-1-mock.json'; anchor.click(); URL.revokeObjectURL(url); };
  return <><div className="page-heading"><div><p className="eyebrow">Settings</p><h1>Reusable answers and local data</h1><p>Phase 1 settings affect fictional browser-local mock data only.</p></div></div><MockDataNotice>Reusable answers and data controls are still mock settings; provider and model settings arrive in Task 7.</MockDataNotice><div className="settings-grid"><section className="settings-card"><h2>Reusable answers</h2>{Object.entries(profile.reusableAnswers).map(([key, value]) => <label className="field-label" key={key}>{key}<Input defaultValue={value} onBlur={(event) => void setAnswer(key, event.target.value)} /></label>)}</section><section className="settings-card"><h2>Sensitive questions</h2><label><input type="radio" checked readOnly /> Always ask me before using an answer</label><label><input type="radio" disabled /> Infer from profile</label><p>Sensitive, legal, demographic, disability, veteran, authorization, and sponsorship answers are never inferred.</p></section><section className="settings-card"><h2>Data controls</h2><div className="inline-actions"><Button variant="secondary" onClick={exportData}>Export mock data</Button><ConfirmDialog trigger={<Button variant="danger">Reset mock data</Button>} title="Reset Phase 1 mock data?" description="This removes local demo decisions and restores the fictional seed records." confirmLabel="Reset data" onConfirm={() => void reset()} /></div></section></div></>;
}
