# Test Automation Standards

Default engineering standards for this repository's test code. Use these when
designing or changing test structure, page objects, API clients, locators,
fixtures, test data, or refactoring decisions.

## Priorities

1. Readability
2. Maintainability
3. Enterprise patterns
4. Strongest locator stability

Prefer long-term clarity over the fastest patch.

## Structure

Organise **system-first, then test-type**:

```text
tests/parabank/{api,web}/   specs
src/pages/parabank/          page objects (one per screen)
src/helpers/api-clients/     typed API clients
src/fixtures/parabank/       Playwright fixtures
src/models/api/parabank/     DTOs
src/builders/                fluent test-data builders
src/schemas/                 JSON Schemas
```

## Locator strategy

Use the strongest stable locator available, in order:

1. roles with accessible names
2. labels and placeholders
3. scoped text within a stable container
4. structural selectors only when unavoidable

Third-party UI (ParaBank) has limited semantics — prefer roles, fall back to
name-based locators, and never duplicate raw selectors across specs.

## Page object design

- one page object per real screen
- `readonly` locators set in the constructor
- `goto()` / `assertLoaded()` plus intention-revealing business actions
- no raw selectors inside spec files

## API design

- typed clients extend `BaseApiClient`
- DTOs model transport; builders create data
- happy-path methods throw on non-2xx; `*Raw` variants return `APIResponse`
  for error-state assertions
- JSON is forced via `_type=json` (ParaBank defaults to XML)

## Test design

- short, intention-revealing tests; clear arrange → act → assert
- business-focused assertions
- idempotency/edge cases and error states alongside happy paths
- schema validation via `validateAgainstSchema` + JSON Schemas in `src/schemas`
- known-defect tests tagged `@known-defect`, cross-referencing
  `docs/parabank/bugs.md`

## Test data

- build via fluent builders (`CustomerBuilder`, `RandomDataGenerator`)
- unique per run (timestamp/region-prefixed) — never depend on seeded balances
- the shared demo DB is volatile; treat all seeded data as read-only reference
