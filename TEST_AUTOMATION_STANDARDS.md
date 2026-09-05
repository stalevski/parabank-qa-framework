# Test automation standards

These are the defaults for test code in this repo. Use them when designing or
changing test structure, page objects, API clients, locators, fixtures, test
data, or refactor decisions.

## Priorities

1. Readability
2. Maintainability
3. Enterprise patterns
4. Strongest locator stability

Long-term clarity wins over the fastest patch.

## Structure

Split system-first, then by test type:

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

Use the strongest stable locator available, in this order:

1. roles with accessible names
2. labels and placeholders
3. scoped text inside a stable container
4. structural selectors only when there's nothing better

ParaBank is a third-party UI with limited semantics, so prefer roles and fall
back to name-based locators. Never repeat a raw selector across specs.

## Page object design

- one page object per real screen
- `readonly` locators set in the constructor
- `goto()` / `assertLoaded()` plus business actions that say what they do
- no raw selectors inside spec files

## API design

- typed clients extend `BaseApiClient`
- DTOs model transport; builders create data
- happy-path methods fail the test on non-2xx; `*Raw` variants return
  `APIResponse` for error-state assertions
- JSON is requested with an `Accept: application/json` header on every request
  (ParaBank returns XML by default)

## Test design

- short tests with a clear arrange → act → assert shape
- assert business outcomes, not internals
- cover error states and idempotency/edge cases alongside happy paths
- schema validation via `validateAgainstSchema` plus JSON Schemas in
  `src/schemas`
- known-defect tests tagged `@known-defect`, cross-referencing
  `docs/parabank/bugs.md`
- prefer `expect.poll` and `waitForURL` for eventual consistency; avoid
  arbitrary sleeps

## Test data

- build through fluent builders (`CustomerBuilder`, `RandomDataGenerator`)
- unique per run (random suffixes); never depend on seeded balances
- the shared demo DB is volatile, so treat seeded data as read-only reference

## Refactor vs patch

Patch minimally when the problem is isolated and the current abstraction is
already good. Refactor only when the issue repeats elsewhere, the abstraction is
wrong, or a broader change clearly reduces future churn.
