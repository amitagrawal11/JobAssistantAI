import { candidateProfileSchema } from '../schemas/profile';

export const mockCandidate = candidateProfileSchema.parse({
  id: 'profile_001',
  personal: {
    fullName: 'Jordan Lee',
    email: 'jordan.lee@example.test',
    phone: '+1 555 014 7821',
    location: 'Austin, TX',
    links: ['https://example.test/jordan', 'https://linkedin.example.test/jordan'],
  },
  summary: 'Frontend engineering leader focused on accessible product platforms.',
  skills: ['React', 'TypeScript', 'Design systems', 'Accessibility', 'Node.js'],
  facts: [
    { id: 'fact_name', type: 'personal.fullName', value: 'Jordan Lee', confidence: 1, verified: true },
    { id: 'fact_email', type: 'personal.email', value: 'jordan.lee@example.test', confidence: 1, verified: true },
    { id: 'fact_phone', type: 'personal.phone', value: '+1 555 014 7821', confidence: 1, verified: true },
    { id: 'fact_location', type: 'personal.location', value: 'Austin, TX', confidence: 1, verified: true },
    { id: 'fact_react', type: 'skill', value: 'Built React products for 9 years', confidence: 0.98, verified: true },
    { id: 'fact_leadership', type: 'experience.achievement', value: 'Led a frontend platform group of 12 engineers', confidence: 0.95, verified: true },
    { id: 'fact_accessibility', type: 'experience.achievement', value: 'Introduced WCAG-focused release checks across three products', confidence: 0.92, verified: true },
    { id: 'fact_unverified', type: 'experience.achievement', value: 'Improved conversion by 40%', confidence: 0.45, verified: false },
  ],
  verification: {
    status: 'ready',
    verifiedFactIds: ['fact_name', 'fact_email', 'fact_phone', 'fact_location', 'fact_react', 'fact_leadership', 'fact_accessibility'],
  },
  reusableAnswers: { noticePeriod: 'Four weeks', salaryExpectation: '$165,000–$180,000' },
});
