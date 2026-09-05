# Mobile test integration (Part 2)

Optional design document. No mobile code is included; it just describes how
Android/iOS tests would plug into the same framework structure.

## Goal

The framework is split system-first, then by test type, with layers that share
infrastructure but run on their own. Mobile would be a third layer that reuses
the same region configuration, test-data builders, schema validators and
reporting without copying them.

## Where mobile code would live

```text
src/
  core/mobile/          driver abstraction (Appium/WebdriverIO)
  pages/parabank/mobile/  screen objects (one per screen)
  fixtures/parabank/     extends the existing fixture with a mobile driver
tests/parabank/mobile/   *.mobile.spec.ts
```

## Driver abstraction

Same shape as `BasePage`, but for a mobile driver instead of a browser `Page`:

```text
src/core/mobile/base.screen.ts      # BaseScreen (tap, fill, assertVisible, expect)
src/core/mobile/appium.driver.ts    # wraps the Appium driver lifecycle
```

Because `BaseScreen` would expose the same kind of actions as `BasePage`
(`goto()`, `assertLoaded()`, business actions), a screen object for the mobile
app would mirror its web counterpart. ParaBank has no native app, so in a real
engagement this would target the company's own mobile clients; here it's
structural only.

## Sharing across layers

- **Region configuration** - mobile fixtures read `getRegion()` exactly like the
  web and API fixtures. The mobile app's region-specific base URL or environment
  goes on `RegionConfig` (e.g. `mobileDeepLink`), and switching regions stays a
  one-line `REGION=...` change with no test code edits.
- **Test data** - `CustomerBuilder` and `RandomDataGenerator` are shared
  verbatim; mobile tests register or reference the same unique test customers.
- **Schema validation** - mobile tests that call the API for setup or
  verification reuse `ParabankApiClient` and the ajv `validateAgainstSchema`
  helper.
- **Reporting** - Appium results flow through the same Playwright HTML report via
  a thin adapter (or an attached Allure/ReportPortal), so CI uploads one report
  family per region.

## Configuration & CI

- `playwright.config.ts` gains a `parabank-mobile` project guarded by
  `process.env.MOBILE`, so mobile doesn't run by default.
- CI adds a `mobile` job (matrixed by region) that starts an emulator or
  simulator service and runs `npm run test:mobile`, with `continue-on-error` to
  match the public-demo policy.
- Device farms (BrowserStack, Sauce Labs) are selected through environment
  variables the same way regions are: configuration, never code.

## Key decision

Mobile is not a fork. It's another consumer of the shared `src/config`,
`src/helpers`, `src/models` and `src/builders` layers, with its own thin driver
and screen objects. That's what keeps "new region, new layer" a cheap,
mechanical addition.
