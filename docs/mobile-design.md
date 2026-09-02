# Part 2 — Mobile test integration design

_Optional design document. No mobile code is included; this describes how
Android/iOS tests would plug into the same framework structure._

## Goal

The framework is organised **system-first, then test-type**, with layers that
share infrastructure but run independently. Mobile tests are a third layer that
must reuse the same region configuration, test-data builders, schema validators
and reporting without duplicating them.

## Where mobile code lives

```text
src/
  core/mobile/          driver abstraction (Appium/WebdriverIO)
  pages/parabank/mobile/  screen objects (one per screen)
  fixtures/parabank/     extends the existing fixture with a mobile driver
tests/parabank/mobile/   *.mobile.spec.ts
```

## Driver abstraction

The same shape as `BasePage`, but for a mobile driver rather than a browser
`Page`:

```text
src/core/mobile/base.screen.ts      # BaseScreen (tap, fill, assertVisible, expect)
src/core/mobile/appium.driver.ts    # wraps the Appium driver lifecycle
```

Because `BaseScreen` exposes the same intention-revealing actions as `BasePage`
(`goto()`, `assertLoaded()`, business actions), a screen object for the mobile
app mirrors its web counterpart one-to-one. ParaBank has no native app, so in a
real engagement this would target the company's own mobile clients; here it is
structural only.

## Sharing across layers

- **Region configuration** — mobile fixtures read `getRegion()` exactly like the
  web/API fixtures. The mobile app's region-specific base URL / environment is
  added to `RegionConfig` (e.g. `mobileDeepLink`), and switching regions stays a
  one-line `REGION=...` change with no test code edits.
- **Test data** — `CustomerBuilder` / `RandomDataGenerator` are shared verbatim;
  mobile tests register or reference the same unique test customers.
- **Schema validation** — mobile tests that call the API (for setup/verification)
  reuse `ParabankApiClient` and the ajv `validateAgainstSchema` helper.
- **Reporting** — Appium results are surfaced through the same Playwright HTML
  report via a thin adapter (or an attached Allure/ReportPortal), so CI uploads
  one report family per region.

## Configuration & CI

- `playwright.config.ts` gains a `parabank-mobile` project guarded by
  `process.env.MOBILE` so mobile does not run by default.
- CI adds a `mobile` job (matrixed by region) that starts an emulator/simulator
  service and runs `npm run test:mobile`, with `continue-on-error` consistent
  with the public-demo policy.
- Device farms (BrowserStack, Sauce Labs) are selected via environment
  variables in the same way regions are — configuration, never code.

## Key decision

Mobile is **not** a fork. It is another consumer of the shared
`src/config`, `src/helpers`, `src/models` and `src/builders` layers, with its
own thin driver and screen objects. That is what keeps "new region, new layer"
a low-cost, mechanical addition.
