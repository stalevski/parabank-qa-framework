# AGENTS.md

Guidance for AI coding agents working in this repository. This is the **single
source of truth** for agents.

## What this project is

A multi-region Playwright + TypeScript QA framework targeting **ParaBank** — a
public demo banking app with a web UI and a REST API. Two layers (API, Web)
share infrastructure but run independently, and region selection is
configuration-only (`REGION=us|eu|apac`).

## Source-of-truth documents

- [TEST_AUTOMATION_STANDARDS.md](TEST_AUTOMATION_STANDARDS.md) — engineering
  standards. Follow it.
- [README.md](README.md) — overview, commands, architecture.
- [docs/parabank/bugs.md](docs/parabank/bugs.md) — known defects and quirks.

## Architecture map

```text
src/config/regions.config.ts   region registry (the multi-region seam)
src/core/                      BaseApiClient, BasePage, global setup
src/helpers/api-clients/       typed ParaBank API client
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

## Conventions

- **Locators**: roles + accessible names first, then labels, then scoped text.
  No raw selectors in specs — they live in page objects.
- **Page objects**: extend `BasePage`; `readonly` locators in the constructor;
  `goto()` / `assertLoaded()` + intention-revealing actions.
- **API**: typed client extends `BaseApiClient`; DTOs for transport; builders
  for data; AAA in specs. `*Raw` methods return `APIResponse` for error states.
- **Regions**: never branch test logic on region. Read configuration through
  the `region` fixture.
- **Known-defect tests**: tagged `@known-defect`, assert current buggy
  behaviour, and cross-reference `docs/parabank/bugs.md`.

## Guardrails

- The shared ParaBank demo mutates under other users — tests must not assert on
  specific seeded balances; derive data per run.
- Don't add features beyond what's requested. Don't commit `.env` or secrets.
- Public-demo flakiness is handled in CI via `continue-on-error`, never by
  deleting or skipping tests.

## Validation before declaring done

1. `npm run lint` and `npm run format:check` pass.
2. `npx tsc --noEmit` clean (`npm run doctor`).
3. Run the affected suite, e.g. `npm run test:api` or `npm run test:web`.
4. Update docs in the same change if behaviour/structure/commands change.
