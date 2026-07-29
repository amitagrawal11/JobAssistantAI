# Global Profile Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a resilient active-profile selector beside the notification button.

**Architecture:** A focused `ProfileSwitcher` component queries profiles, resolves the active/default state, persists automatic fallbacks, and renders an accessible dropdown. `Shell` only positions it in the header.

**Tech Stack:** React 19, TanStack Query, React Router, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Profile resolution

- [ ] Add failing unit tests for zero, one, multiple, default fallback, and stale active identifiers.
- [ ] Implement a pure `resolveHeaderProfile` helper.
- [ ] Run focused tests until green.

### Task 2: Header control

- [ ] Add failing component tests for empty, single, and multi-profile displays and selection.
- [ ] Implement `ProfileSwitcher` with loading, error, create, single, dropdown, outside-click, and manage states.
- [ ] Persist single/default fallbacks through `setActiveProfileId`.
- [ ] Run focused tests until green.

### Task 3: Shell integration and verification

- [ ] Render `ProfileSwitcher` immediately before the notification button.
- [ ] Run all frontend tests, build, lint, and `git diff --check`.
- [ ] Verify all states and profile switching in the live header.
