# Design decisions

The code is kept deliberately lean, so the reasoning behind the non-obvious
choices lives here. When a decision has a practical consequence, the code keeps
a one-line pointer and the full explanation goes in this file.

## The multi-region seam (`src/config/regions.config.ts`)

Regions are simulated through configuration, not code. Tests never branch on
region: they read config through fixtures, so adding a region is one entry in
the `regions` record.

- **Base URLs must keep a trailing slash.** The client is only given the base
  URL and calls relative paths like `customers/12212`, so Playwright has to join
  the two. Joining a path onto a base that ends in `bank` (no slash) treats
  `bank` as a file name and replaces it (`.../services/customers/12212`, 404).
  A base ending in `bank/` (slash) is treated as a folder, so the path is put
  inside it (`.../services/bank/customers/12212`, 200). `withTrailingSlash`
  forces every base URL to end in `/` so this never happens.
- **`getRegion()` uses `us` when `REGION` is absent, and throws otherwise.**
  "Absent" means the variable is simply not set in the environment (the
  `?? 'us'` fallback only catches null/undefined). If it is set but not a valid
  region - including an empty string or a typo such as `euu` - `getRegion()`
  throws. Missing should default to `us`; a wrong value should fail loudly,
  because a green run against the wrong region is worse than no run at all.
- **A base URL comes from one of three places, in order:** (1) a per-region
  variable such as `PARABANK_EU_API_BASE_URL`, to point a single region
  elsewhere; (2) otherwise the shared `PARABANK_API_BASE_URL`, to change every
  region at once; (3) otherwise the built-in default, which targets the public
  ParaBank demo. The same pattern applies to `..._UI_BASE_URL`. In plain terms:
  "this region first, otherwise all regions, otherwise the demo".

## JSON vs XML

ParaBank returns XML by default. `BaseApiClient` sends `Accept: application/json`
on every request so the JSON-capable endpoints respond with JSON; the standard
header keeps the client portable (the CXF-specific `?_type=json` shortcut would
also work, but it couples the client to ParaBank). The fund-movement endpoints
return a plain-text confirmation string no matter what, which is why `postText`
reads them as text.

## Why `apiClient` has its own request context

Each Playwright project is configured with a single `baseURL`. In the API
project that base is the API URL, so the built-in `request` fixture already
points at the right host. In the Web project the base is the UI URL - that is
what makes `page.goto(...)` open the site - so the same `request` fixture would
aim any API call at the UI URL and 404. A web test that also talks to the API
therefore can't use that fixture. Instead, the `apiClient` fixture creates its
own request context bound to `region.apiBaseUrl`, so the client behaves
identically in both the API and Web projects.

## Seeded data

Most tests read the demo's pre-seeded customer (`john`/`demo`, customer `12212`)
through the `seededCustomer` and `seededAccounts` fixtures. The web registration
test is the exception: it creates its own customer through the `register.htm`
web form. Unique values (transfer amounts, usernames) come from
`RandomDataGenerator`.

## Interfaces vs classes

DTOs are interfaces: plain data shapes that describe what the API sends and
accepts. In TypeScript, unlike C#, an `interface` exists only at compile time -
it is erased from the emitted JavaScript, so there is no runtime object, no
`instanceof`, and no cost. To build DTO-shaped data (such as a request body) you
do not need a class: write an object literal, or use a builder that returns one,
because TypeScript's structural typing accepts anything with the right fields.
Classes are reserved for objects with real behaviour and state (API client, page
objects, builder), where a constructor and methods are genuinely useful.

## Lean API surface

`ParabankApiClient` only wraps endpoints the suite exercises: every public
method maps to at least one test. Adding a wrapper for an endpoint no test calls
would be dead code that implies coverage that doesn't exist. (Registration, for
example, is web-only - there is no REST register operation - so the client has
no register method; see `docs/parabank/app.md`.)

## Known-defect pins

`@known-defect` tests assert the current buggy behaviour so a vendor fix shows
up as a failing test, which is the signal to remove the pin. They live in their
own spec and CI job so they don't clutter the happy-path signal.

## Defects and drift found in ParaBank

- **CONTRACT:** `Transaction.date` is epoch milliseconds, but the OpenAPI spec
  says `string (date-time)`.
- **FUNDS:** `withdraw` and `transfer` don't reject insufficient funds; balances
  go negative.
- **TRANSFER-UI:** an empty transfer amount shows a generic "internal error"
  page instead of the inline "amount cannot be empty" message.

## Flakiness policy

ParaBank is a shared public demo. CI marks its jobs `continue-on-error`, tests
derive their own data, and whatever flakiness remains is written down in
`docs/parabank/bugs.md`.
