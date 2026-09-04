import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export type Region = 'us' | 'eu' | 'apac';

export interface RegionCredentials {
  seededUsername: string;
  seededPassword: string;
}

export interface RegionConfig {
  key: Region;
  name: string;
  locale: string;
  currency: string;
  timeZone: string;
  uiBaseUrl: string;
  apiBaseUrl: string;
  credentials: RegionCredentials;
}

export const REGIONS: readonly Region[] = ['us', 'eu', 'apac'] as const;

const DEFAULT_UI_BASE_URL = 'https://parabank.parasoft.com/parabank';
const DEFAULT_API_BASE_URL = 'https://parabank.parasoft.com/parabank/services/bank';

// Trailing slash required: Playwright resolves relative paths against the last
// directory segment, so without it the `bank` segment would be dropped (→ 404).
const withTrailingSlash = (value: string): string => (value.endsWith('/') ? value : `${value}/`);

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

function isRegion(value: string): value is Region {
  return (REGIONS as readonly string[]).includes(value);
}

export function getRegion(): RegionConfig {
  const requested = (process.env.REGION ?? 'us').toLowerCase();
  if (!isRegion(requested)) {
    throw new Error(`Unknown REGION "${requested}". Expected one of: ${REGIONS.join(', ')}`);
  }
  return regions[requested];
}

export const activeRegion: RegionConfig = getRegion();
