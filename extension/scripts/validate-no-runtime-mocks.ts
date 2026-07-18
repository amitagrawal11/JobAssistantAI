import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const runtimeFiles = [
  'entrypoints/sidepanel/App.tsx',
  'entrypoints/dashboard/App.tsx',
  'features/dashboard/documents-page.tsx',
  'features/dashboard/applications-page.tsx',
  'features/dashboard/settings-page.tsx',
];
const forbidden = [
  'Northstar Labs',
  'Jordan Lee',
  'MockDataNotice',
  'useApplicationStore',
  'Reset mock data',
  'Export mock data',
  'Local mock data',
];

for (const file of runtimeFiles) {
  const source = readFileSync(resolve(file), 'utf8');
  for (const marker of forbidden) {
    if (source.includes(marker)) {
      throw new Error(`${file} still contains runtime mock marker: ${marker}`);
    }
  }
}

const scanSource = readFileSync(resolve('features/job-analysis/scan-view.tsx'), 'utf8');
for (const removedLabel of ['>Title<', '>Company<', '>Location<', '>Source URL<']) {
  if (scanSource.includes(removedLabel)) {
    throw new Error(`Scan reintroduced removed metadata control: ${removedLabel}`);
  }
}

console.log('Validated runtime screens contain no Phase 1 mock data');
