# Job Copilot

Job Copilot is a Chrome extension proof of concept for reviewing and preparing job applications while keeping the candidate in control. Phase 1 demonstrates the complete experience with fictional, browser-local mock data.

## Phase 1 surfaces

- **Side panel:** Scan → Match → Tailor → Fill → Confirm.
- **Dashboard:** Profile, Documents, Applications, and Settings.

Phase 1 does not read the active page, parse resumes, call AI services, create PDFs, fill employer forms, or communicate with a backend.

## Requirements

- Node.js 20 or newer.
- pnpm 10 or newer.
- Google Chrome with extension Developer mode enabled.

## Development

```bash
cd extension
pnpm install
pnpm dev
```

## Production build

```bash
cd extension
pnpm validate:fixtures
pnpm validate:workflow
pnpm validate:sync
pnpm compile
pnpm build
pnpm inspect:manifest
```

Load `extension/.output/chrome-mv3` from `chrome://extensions` → **Developer mode** → **Load unpacked**. On macOS, press `Command + Shift + .` in the directory picker if `.output` is hidden.

After rebuilding an already loaded copy, select **Reload** on the Job Copilot card in `chrome://extensions` and reopen the side panel.

## Phase 1 data

The demonstration uses the fictional candidate Jordan Lee, fictional company Northstar Labs, and `.example.test` URLs. Durable demo decisions are stored in extension-local browser storage. Use Dashboard → Settings → Reset mock data to restore the seed state.

## Manual acceptance

Follow [the Phase 1 checklist](docs/manual-testing/phase-1-checklist.md). Automated test frameworks are intentionally excluded from the initial POC by the locked product specification.
