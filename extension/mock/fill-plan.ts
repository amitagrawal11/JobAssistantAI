import { fillPlanSchema } from '../schemas/fill-plan';

export const mockFillPlan = fillPlanSchema.parse({
  id: 'fill_plan_001', applicationId: 'application_001', schemaVersion: 1,
  status: 'proposed', approvedAt: null,
  entries: [
    { fieldId: 'first_name', label: 'First name', type: 'text', required: true, proposedValue: 'Jordan', sourceFactIds: ['fact_name'], confidence: 'high', sensitivity: 'none', requiresReview: false, selected: true, status: 'proposed' },
    { fieldId: 'last_name', label: 'Last name', type: 'text', required: true, proposedValue: 'Lee', sourceFactIds: ['fact_name'], confidence: 'high', sensitivity: 'none', requiresReview: false, selected: true, status: 'proposed' },
    { fieldId: 'email', label: 'Email', type: 'email', required: true, proposedValue: 'jordan.lee@example.test', sourceFactIds: ['fact_email'], confidence: 'high', sensitivity: 'none', requiresReview: false, selected: true, status: 'proposed' },
    { fieldId: 'phone', label: 'Phone', type: 'tel', required: true, proposedValue: '+1 555 014 7821', sourceFactIds: ['fact_phone'], confidence: 'high', sensitivity: 'none', requiresReview: false, selected: true, status: 'proposed' },
    { fieldId: 'salary', label: 'Salary expectation', type: 'text', required: true, proposedValue: '$165,000–$180,000', sourceFactIds: [], confidence: 'medium', sensitivity: 'none', requiresReview: true, selected: false, status: 'needs_review' },
    { fieldId: 'portfolio', label: 'Portfolio attachment', type: 'file', required: false, proposedValue: null, sourceFactIds: [], confidence: 'low', sensitivity: 'none', requiresReview: true, selected: false, status: 'needs_user_input' },
    { fieldId: 'authorization', label: 'Are you authorized to work in this country?', type: 'select', required: true, proposedValue: null, sourceFactIds: [], confidence: 'unknown', sensitivity: 'work_authorization', requiresReview: true, selected: false, status: 'needs_user_input' },
    { fieldId: 'demographic', label: 'Demographic questions', type: 'select', required: false, proposedValue: null, sourceFactIds: [], confidence: 'unknown', sensitivity: 'demographic', requiresReview: true, selected: false, status: 'needs_user_input' },
  ],
});
