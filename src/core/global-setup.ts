import { activeRegion } from '@config';

/**
 * Best-effort global setup for the public ParaBank target.
 *
 * ParaBank is a shared demo we do not own, so there is nothing to reset or
 * seed here. We only log the resolved region so each run's report makes it
 * obvious which regional configuration was exercised.
 */
async function globalSetup(): Promise<void> {
  console.info(
    `[globalSetup] active region: ${activeRegion.name} (${activeRegion.key}) — UI ${activeRegion.uiBaseUrl}, API ${activeRegion.apiBaseUrl}`,
  );
}

export default globalSetup;
