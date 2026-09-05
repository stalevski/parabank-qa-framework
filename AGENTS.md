# AGENTS.md

Guidance for AI coding agents working in this repository. This is the **single
source of truth** for agents.

## What this project is

A multi-region Playwright + TypeScript QA framework targeting **ParaBank** - a
public demo banking app with a web UI and a REST API. Two layers (API, Web)
share infrastructure but run independently, and region selection is
configuration-only (`REGION=us|eu|apac`).

## Source-of-truth documents

- [TEST_AUTOMATION_STANDARDS.md](TEST_AUTOMATION_STANDARDS.md) - engineering
  standards. Follow it.
- [docs/design-decisions.md](docs/design-decisions.md) - WHY things are built
  this way. Defend every non-obvious choice from here.
- [README.md](README.md) - overview, commands, architecture.
- [docs/parabank/app.md](docs/parabank/app.md) - what the app under test is.
- [docs/parabank/bugs.md](docs/parabank/bugs.md) - known defects and quirks.

## Architecture map

```text
src/config/regions.config.ts   region registry (the multi-region seam)
src/core/                      BaseApiClient · BasePage (base classes)
src/helpers/api-clients/       typed ParaBank API client
src/helpers/money.ts           formatAmount (two-decimal serialisation)
src/helpers/fund-movement.ts   builds the fund-movement confirmation sentence
src/helpers/schema-validator.ts ajv wrapper
src/models/api/parabank/       DTOs
src/builders/                  fluent test-data builders
src/schemas/                   JSON Schemas (from ParaBank's OpenAPI spec)
src/pages/parabank/            page objects
src/fixtures/parabank/         Playwright fixtures
tests/parabank/{api,web}/      specs; regions.spec.ts = config parity
```

Path aliases (see `tsconfig.json`): `@config`, `@core/*`, `@pages/*`,
`@helpers/*`, `@fixtures/*`, `@parabank-fixtures`, `@models/*`, `@builders/*`,
`@schemas/*`.

## How to run

| Goal          | Command                                      |
| ------------- | -------------------------------------------- |
| All tests     | `npm test`                                   |
| API layer     | `npm run test:api`                           |
| Web layer     | `npm run test:web` (Chromium/Firefox/WebKit) |
| Region parity | `npm run test:regions`                       |
| Smoke         | `npm run test:smoke`                         |
| Lint / format | `npm run lint` · `npm run format:check`      |
| Type check    | `npm run doctor` (also prints tool versions) |
| HTML report   | `npm run report`                             |

Choose a region with `REGION=us|eu|apac` before any test command. Install
browsers once with `npx playwright install`.

## Conventions

- **Priorities**: readability → maintainability → enterprise patterns →
  strongest locator stability. Long-term clarity beats the fastest patch.
- **Locators**: roles + accessible names first, then labels, then scoped text.
  No raw selectors in specs - they live in page objects.
- **Page objects**: extend `BasePage`; `readonly` locators in the constructor;
  `goto()` / `assertLoaded()` + intention-revealing actions.
- **API**: typed client extends `BaseApiClient`; DTOs for transport; builders
  for data; AAA in specs. `*Raw` methods return `APIResponse` for error states.
- **Regions**: never branch test logic on region. Read configuration through
  the `region` fixture.
- **Known-defect tests**: tagged `@known-defect`, assert current buggy
  behaviour, and cross-reference `docs/parabank/bugs.md`.
- **Async hygiene**: prefer `expect.poll` and `waitForURL` for eventual
  consistency; no arbitrary sleeps.

## Key decisions (full rationale in `docs/design-decisions.md`)

- **Regions are simulated config, not real servers.** ParaBank has one demo; the
  seam exists so a real deployment is a config change (`REGION` + per-region env
  URLs), never a test-code change.
- **Interfaces for DTOs, classes only for behaviour/state.** Data shapes are
  erased at compile time; object literals/builders satisfy them, no `new` needed.
- **Every client method maps to a test** - no dead wrappers.
- **`*Raw` variants exist only where an error-state test asserts a status code.**
- **`Accept: application/json` header, not the CXF `?_type=json` shortcut** -
  portable, not ParaBank-specific.
- **`apiClient` owns its request context** because the UI and API base URLs
  differ; page objects navigate the UI base, API calls need the API base.
- **Money is always sent with two decimals via `formatAmount`** because ParaBank
  echoes the decimal scale it receives.
- **Known defects are pinned by tests, not skipped** - a vendor fix flips the
  pinned test instead of silently passing.

## Guardrails

- The shared ParaBank demo mutates under other users - tests must not assert on
  specific seeded balances; derive data per run.
- The demo also **rate-limits** (HTTP 429 / Cloudflare) under heavy load. A 429
  is the demo throttling, not a test problem - don't "fix" it by deleting or
  skipping tests; retry after a pause.
- Don't add features beyond what's requested. Don't commit `.env` or secrets.
- Public-demo flakiness is handled in CI via `continue-on-error`, never by
  deleting or skipping tests.

## Validation before declaring done

1. `npm run lint` and `npm run format:check` pass.
2. `npx tsc --noEmit` clean (`npm run doctor`).
3. Run the affected suite, e.g. `npm run test:api` or `npm run test:web`.
4. Update the docs in the same change - do not wait to be asked. When
   behaviour, structure, commands, or coverage change, update every affected
   file: [README.md](README.md), [docs/parabank/app.md](docs/parabank/app.md),
   [docs/parabank/bugs.md](docs/parabank/bugs.md),
   [docs/design-decisions.md](docs/design-decisions.md), this file, and
   [TEST_AUTOMATION_STANDARDS.md](TEST_AUTOMATION_STANDARDS.md). A change that
   leaves the Markdown stale is incomplete.
