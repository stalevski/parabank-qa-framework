import { test, expect } from '@playwright/test';
import { REGIONS, getRegion, regions } from '@config';

/** Runs `fn` with `process.env.REGION` set, then restores the previous value. */
function withRegionEnv(region: string, fn: () => void): void {
  const original = process.env.REGION;
  try {
    process.env.REGION = region;
    fn();
  } finally {
    if (original === undefined) {
      delete process.env.REGION;
    } else {
      process.env.REGION = original;
    }
  }
}

/**
 * Configuration parity checks. These run without a browser and prove that the
 * multi-region abstraction actually behaves: every region is well-formed,
 * switching regions is a pure configuration change, and unknown regions fail
 * loudly.
 */
test.describe('Region configuration', () => {
  test('defines all supported regions with distinct simulated properties', () => {
    expect(REGIONS).toHaveLength(3);

    const locales = new Set(REGIONS.map((key) => regions[key].locale));
    const currencies = new Set(REGIONS.map((key) => regions[key].currency));
    const timeZones = new Set(REGIONS.map((key) => regions[key].timeZone));

    expect(locales.size).toBe(REGIONS.length);
    expect(currencies.size).toBe(REGIONS.length);
    expect(timeZones.size).toBe(REGIONS.length);
  });

  test('every region resolves to valid URLs and credentials', () => {
    for (const key of REGIONS) {
      const region = regions[key];
      expect(region.uiBaseUrl).toMatch(/^https?:\/\//);
      expect(region.apiBaseUrl).toMatch(/^https?:\/\//);
      expect(region.credentials.seededUsername).toBeTruthy();
      expect(region.credentials.seededPassword).toBeTruthy();
    }
  });

  test('getRegion() honours the REGION env var without code changes', () => {
    withRegionEnv('eu', () => expect(getRegion().key).toBe('eu'));
    withRegionEnv('apac', () => expect(getRegion().key).toBe('apac'));
  });

  test('getRegion() rejects an unknown region', () => {
    withRegionEnv('mars', () => expect(() => getRegion()).toThrow(/Unknown REGION/));
  });
});
