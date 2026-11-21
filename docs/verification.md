# Verification: what "done" means

Reference for humans and agents working in this repo. It covers the offline
gate, the suites that need ParaBank, and how to read a CI run's verdict without
guessing.

## Verify (required before claiming done)

```bash
npm run verify
```

This is the gate. It never touches the network, so it works offline, in a
container, and while the public demo is down.

| Step                | Command                    | Catches                                        |
| ------------------- | -------------------------- | ---------------------------------------------- |
| Lint                | `npm run lint`             | ESLint + the Playwright guardrails (below)     |
| Format              | `npm run format:check`     | Prettier drift                                 |
| Typecheck           | `npm run typecheck`        | `tsc --noEmit` over the whole project          |
| Assertion guardrail | `npm run check:assertions` | a spec that lost assertions or silenced a test |

`npm run verify:api` runs the same four steps and then `test:api`.
**`test:api` needs the live demo**, so `verify:api` is not the offline gate:
use it when you changed the API layer and want the suite behind the static
checks. `verify` alone is what a doc-only, config-only or refactor change needs.

Browser suites (`npm run test:web`, `test:smoke`, `test:shuffle`) also require
the live demo and three browser engines. They are **not** part of `verify`; run
them before claiming a _UI_ change works, and expect them to fail when ParaBank
is rate-limiting (HTTP 429 / Cloudflare 1015) or returning 5xx.

`npm run doctor` still prints the tool versions and runs `tsc --noEmit`; it is
diagnostic, not a gate.

## The Playwright guardrails

`eslint.config.mjs` enables these for `tests/**` as **errors**, so `verify`
fails on any of them:

- `playwright/no-skipped-test` - a skipped test is coverage that stopped
  existing. Known defects are pinned with `@known-defect` and assert today's
  buggy behaviour; they are never skipped.
- `playwright/no-force-option` - `force: true` hides an actionability bug.
- `playwright/no-wait-for-timeout` - arbitrary sleeps paper over a missing
  `expect.poll` / `waitFor`.
- `playwright/no-conditional-expect` - an expectation inside `if` only runs on
  the branch that happens to be taken.
- `playwright/expect-expect` - every test must assert something. A page object's
  `assertLoaded()` does not satisfy this rule, so a navigating test also asserts
  the landing element explicitly.
- `playwright/no-restricted-matchers` - `toBeTruthy` / `toBeDefined` are
  rejected: they pass on a value that is present but wrong. Use `toBe`,
  `toEqual`, `toMatch`, `toBeGreaterThan` - or `.not.toBeUndefined()` where
  "exists" is genuinely the property under test.

## `scripts/check-assertions.sh` - the diff gate

`npm run check:assertions` diffs the working tree against `origin/main` and
fails when a change:

- lowers a spec's `expect(...)` count, or deletes a spec file, or
- adds a line that silences a test (`test.skip`, `test.only`, `test.fixme`,
  `describe.only`, `waitForTimeout`, `force: true`).

This is the one guardrail ESLint cannot express: a test that still passes after
its assertions were deleted. If a spec really changed shape, keep the assertion
count and make the new assertion stronger - do not delete the old one to go
green.

Set `BASE_REF=<ref>` to compare against something else. When the base ref cannot
be resolved (shallow clone without `origin/main`), the gate prints a notice and
passes; CI checks out with `fetch-depth: 0`, so it is live there.

## Reading a CI run verdict

`gh run list` shows a single conclusion, and `continue-on-error` used to make
that conclusion lie: run **44798937153** failed `Run Web tests` and
`Run Web known-defect pins` and still concluded `success`. The **Run verdict**
job now owns the conclusion. Read it, not the colour of the run icon:

| verdict        | meaning                                                                  | run |
| -------------- | ------------------------------------------------------------------------ | --- |
| `pass`         | every selected suite ran and passed                                      | ✅  |
| `not-verified` | ParaBank was unhealthy, so no demo suite ran - the run proves nothing    | ⏭️  |
| `fail`         | a suite failed, or a selected suite never ran while ParaBank was healthy | ❌  |

Where to read it:

- Job summary of **Run verdict** (starts with `### Run verdict: <verdict>`), or
  the `::error` / `::warning` annotation on the run.
- The `run-verdict` artifact, `run-verdict.json`:

```json
{
  "verdict": "fail",
  "event": "pull_request",
  "layer": "all",
  "upstream": { "healthy": true, "uiStatus": "200", "apiStatus": "200" },
  "suites": { "api": "passed", "web": "failed", "known-defects": "failed", "shuffle": "passed" },
  "failures": ["web: tests failed", "known-defects: tests failed"],
  "skipped": []
}
```

### Vendor failure or test defect?

| evidence in the run                                                              | conclusion                                                                             |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| upstream probe `UI`/`API` != 200, verdict `not-verified`                         | vendor down - nothing was tested, re-run later                                         |
| report shows HTTP 429 / 1015 / 5xx from `parabank.parasoft.com`                  | vendor rate-limiting the demo - re-run later; **not** a repo regression, but still red |
| report shows an assertion diff, 4xx, or a locator timeout on a page that renders | test defect - fix it                                                                   |
| verdict `fail` with `... while ParaBank was healthy`                             | a suite silently did not run - fix the workflow, not the test                          |

Never resolve any of these by deleting or skipping a test. A red run caused by
the vendor is expected and documented; a red run with no vendor explanation is
the signal you are looking for.
