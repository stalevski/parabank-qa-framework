import dotenv from 'dotenv';

// Load .env before reading process.env so region selection and credential
// overrides work from a local .env file (never committed).
dotenv.config({ quiet: true });

/**
 * Regions the framework can target.
 *
 * Adding a new region is a one-line change to `REGIONS` plus one entry in the
 * `regions` record below — no test code changes. Tests never branch on region;
 * they read configuration through fixtures. This mirrors how a real financial
 * platform rolls coverage out to a new regional deployment: same tests, new
 * configuration.
 */
export type Region = 'us' | 'eu' | 'apac';

export interface RegionCredentials {
  seededUsername: string;
  seededPassword: string;
}

export interface RegionConfig {
  /** Stable key used in reports and environment variables. */
  key: Region;
  /** Human-readable label. */
  name: string;
  /** BCP 47 locale tag — simulated (the shared demo is locale-agnostic). */
  locale: string;
  /** ISO 4217 currency code — simulated. */
  currency: string;
  /** IANA time zone — simulated. */
  timeZone: string;
  /** Customer-facing web UI base URL. */
  uiBaseUrl: string;
  /** REST API base URL. */
  apiBaseUrl: string;
  /** Seeded read-only demo credentials (the demo has a single shared DB). */
  credentials: RegionCredentials;
}

export const REGIONS: readonly Region[] = ['us', 'eu', 'apac'] as const;

const DEFAULT_UI_BASE_URL = 'https://parabank.parasoft.com/parabank';
const DEFAULT_API_BASE_URL = 'https://parabank.parasoft.com/parabank/services/bank';

/**
 * Base URLs must end with `/` so Playwright resolves relative paths against the
 * last *directory* segment rather than treating it as a file. Without the
 * trailing slash, `new URL('login/x', '.../bank')` would replace `bank` and
 * drop the segment entirely.
 */
const withTrailingSlash = (value: string): string => (value.endsWith('/') ? value : `${value}/`);

/**
 * Resolves a region's base URLs, honouring per-region overrides
 * (`PARABANK_US_API_BASE_URL`) before the global overrides
 * (`PARABANK_API_BASE_URL`) and the public demo defaults.
 */
function resolveBaseUrls(region: Region): { uiBaseUrl: string; apiBaseUrl: string } {
  const key = region.toUpperCase();
  const uiBaseUrl =
    process.env[`PARABANK_${key}_UI_BASE_URL`] ?? process.env.PARABANK_UI_BASE_URL ?? DEFAULT_UI_BASE_URL;
  const apiBaseUrl =
    process.env[`PARABANK_${key}_API_BASE_URL`] ?? process.env.PARABANK_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  return { uiBaseUrl: withTrailingSlash(uiBaseUrl), apiBaseUrl: withTrailingSlash(apiBaseUrl) };
}

const seededUsername = process.env.PARABANK_SEEDED_USERNAME ?? 'john';
const seededPassword = process.env.PARABANK_SEEDED_PASSWORD ?? 'demo';

function buildRegionConfig(
  region: Region,
  name: string,
  locale: string,
  currency: string,
  timeZone: string,
): RegionConfig {
  const { uiBaseUrl, apiBaseUrl } = resolveBaseUrls(region);
  return {
    key: region,
    name,
    locale,
    currency,
    timeZone,
    uiBaseUrl,
    apiBaseUrl,
    credentials: { seededUsername, seededPassword },
  };
}

export const regions: Record<Region, RegionConfig> = {
  us: buildRegionConfig('us', 'United States', 'en-US', 'USD', 'America/New_York'),
  eu: buildRegionConfig('eu', 'European Union', 'de-DE', 'EUR', 'Europe/Berlin'),
  apac: buildRegionConfig('apac', 'Asia-Pacific', 'en-AU', 'AUD', 'Australia/Sydney'),
};

/** Returns the region selected via the REGION env var (default: `us`). */
export function getRegion(): RegionConfig {
  const requested = (process.env.REGION ?? 'us').toLowerCase();
  if (!REGIONS.includes(requested as Region)) {
    throw new Error(`Unknown REGION "${requested}". Expected one of: ${REGIONS.join(', ')}`);
  }
  return regions[requested as Region];
}

/** The region for the current process, resolved once. */
export const activeRegion: RegionConfig = getRegion();
