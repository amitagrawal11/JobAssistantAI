import { createStore } from 'zustand/vanilla';
import { mockSession } from '../mock/session';
import type { SessionRepository } from '../repositories/session-repository';
import type { ApplicationStatus } from '../schemas/common';
import { sessionSchema, type PersistedSession } from '../schemas/session';
import { err, ok, type Result } from '../lib/result';
import type { ApplicationFilter, ApplicationState, DashboardSection } from './state';

const allowedTransitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  idle: ['job_detected'], job_detected: ['analyzing'], analyzing: ['scored', 'failed'],
  scored: ['tailoring', 'job_detected'], tailoring: ['reviewing', 'failed'],
  reviewing: ['ready_to_fill', 'tailoring'], ready_to_fill: ['filling', 'reviewing'],
  filling: ['awaiting_submission', 'failed'], awaiting_submission: ['completed', 'ready_to_fill'],
  completed: [], failed: ['job_detected', 'tailoring', 'ready_to_fill'],
};

export interface ApplicationActions {
  hydrate(): Promise<void>;
  resetDemo(): Promise<void>;
  transitionTo(next: ApplicationStatus): Promise<Result>;
  editJobDescription(description: string): Promise<void>;
  analyzeMockJob(options?: { fail?: boolean }): Promise<void>;
  retryLastOperation(): Promise<void>;
  setFactValue(factId: string, value: string): Promise<void>;
  verifyFact(factId: string): Promise<void>;
  rejectFact(factId: string): Promise<void>;
  setReusableAnswer(key: string, value: string): Promise<void>;
  approveTailoredChange(changeId: string): Promise<void>;
  rejectTailoredChange(changeId: string): Promise<void>;
  approveFieldEntry(fieldId: string, selected: boolean): Promise<void>;
  setFieldAnswer(fieldId: string, value: string): Promise<void>;
  simulateFill(): Promise<void>;
  markApplicationReady(): Promise<void>;
  setDashboardSection(section: DashboardSection): void;
  setApplicationFilter(filter: ApplicationFilter): void;
  dismissRecoveryNotice(): void;
}

export type ApplicationStore = ApplicationState & ApplicationActions;

const initialState: ApplicationState = {
  hydrated: false, recoveryNotice: null, transientError: null,
  ...structuredClone(mockSession), dashboardSection: 'profile', applicationFilter: 'all',
};

export function createApplicationStore(repository: SessionRepository) {
  return createStore<ApplicationStore>((set, get) => {
    const checkpoint = (): PersistedSession => sessionSchema.parse({
      schemaVersion: 1, workflowStatus: get().workflowStatus, profile: get().profile,
      job: get().job, matchResult: get().matchResult, documents: get().documents,
      fillPlan: get().fillPlan, applications: get().applications,
    });
    const persist = () => repository.save(checkpoint());

    return {
      ...initialState,
      hydrate: async () => {
        const loaded = await repository.load();
        set({ ...loaded.session, hydrated: true, recoveryNotice: loaded.status === 'recovered' ? loaded.reason : null });
      },
      resetDemo: async () => {
        const session = await repository.reset();
        set({ ...session, hydrated: true, recoveryNotice: null, transientError: null });
      },
      transitionTo: async (next) => {
        const current = get().workflowStatus;
        if (!allowedTransitions[current].includes(next)) {
          return err('INVALID_WORKFLOW_TRANSITION', `Cannot move from ${current} to ${next}.`);
        }
        set({ workflowStatus: next, transientError: null });
        await persist();
        return ok(undefined);
      },
      editJobDescription: async (description) => {
        set((state) => ({ job: { ...state.job, description } }));
        await persist();
      },
      analyzeMockJob: async (options) => {
        await get().transitionTo('analyzing');
        if (options?.fail) {
          set({ workflowStatus: 'failed', transientError: 'The mock analysis was interrupted. Your edited job description is safe.' });
        } else {
          set({ workflowStatus: 'scored', transientError: null });
        }
        await persist();
      },
      retryLastOperation: async () => {
        if (get().workflowStatus !== 'failed') return;
        set({ workflowStatus: 'job_detected', transientError: null });
        await persist();
        await get().analyzeMockJob();
      },
      setFactValue: async (factId, value) => {
        set((state) => ({ profile: { ...state.profile, facts: state.profile.facts.map((fact) => fact.id === factId ? { ...fact, value, verified: false } : fact) } }));
        await persist();
      },
      verifyFact: async (factId) => {
        set((state) => ({ profile: { ...state.profile, facts: state.profile.facts.map((fact) => fact.id === factId ? { ...fact, verified: true } : fact), verification: { ...state.profile.verification, verifiedFactIds: [...new Set([...state.profile.verification.verifiedFactIds, factId])] } } }));
        await persist();
      },
      rejectFact: async (factId) => {
        set((state) => ({ profile: { ...state.profile, facts: state.profile.facts.filter((fact) => fact.id !== factId), verification: { ...state.profile.verification, verifiedFactIds: state.profile.verification.verifiedFactIds.filter((id) => id !== factId) } } }));
        await persist();
      },
      setReusableAnswer: async (key, value) => {
        set((state) => ({ profile: { ...state.profile, reusableAnswers: { ...state.profile.reusableAnswers, [key]: value } } }));
        await persist();
      },
      approveTailoredChange: async (changeId) => {
        set((state) => ({ documents: { ...state.documents, resume: { ...state.documents.resume, changes: state.documents.resume.changes.map((change) => change.id === changeId && change.classification !== 'NEW_CLAIM' ? { ...change, status: 'accepted' as const } : change) } } }));
        await persist();
      },
      rejectTailoredChange: async (changeId) => {
        set((state) => ({ documents: { ...state.documents, resume: { ...state.documents.resume, changes: state.documents.resume.changes.map((change) => change.id === changeId ? { ...change, status: 'rejected' as const } : change) } } }));
        await persist();
      },
      approveFieldEntry: async (fieldId, selected) => {
        set((state) => ({ fillPlan: { ...state.fillPlan, entries: state.fillPlan.entries.map((entry) => entry.fieldId === fieldId ? { ...entry, selected, status: selected ? 'approved' as const : entry.status } : entry) } }));
        await persist();
      },
      setFieldAnswer: async (fieldId, value) => {
        set((state) => ({ fillPlan: { ...state.fillPlan, entries: state.fillPlan.entries.map((entry) => entry.fieldId === fieldId ? { ...entry, proposedValue: value, requiresReview: true, selected: false, status: 'needs_review' as const } : entry) } }));
        await persist();
      },
      simulateFill: async () => {
        await get().transitionTo('filling');
        set((state) => ({ fillPlan: { ...state.fillPlan, status: 'executed' as const, entries: state.fillPlan.entries.map((entry, index) => !entry.selected ? entry : { ...entry, status: index === 1 ? 'changed_since_scan' as const : index === 2 ? 'failed' as const : 'filled' as const }) }, workflowStatus: 'awaiting_submission' }));
        await persist();
      },
      markApplicationReady: async () => {
        const now = new Date().toISOString();
        set((state) => ({ applications: state.applications.map((application) => application.id === state.fillPlan.applicationId ? { ...application, status: 'ready' as const, events: [...application.events, { id: `event_ready_${Date.now()}`, type: 'USER_MARKED_READY', occurredAt: now }] } : application) }));
        await persist();
      },
      setDashboardSection: (dashboardSection) => set({ dashboardSection }),
      setApplicationFilter: (applicationFilter) => set({ applicationFilter }),
      dismissRecoveryNotice: () => set({ recoveryNotice: null }),
    };
  });
}
