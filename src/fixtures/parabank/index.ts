import { test as base, expect } from '@playwright/test';
import { ParabankApiClient } from '@helpers/api-clients/parabank-api.client';
import { activeRegion, type RegionConfig } from '@config';
import type { AccountDto } from '@models/api/parabank/account.dto';
import type { CustomerDto } from '@models/api/parabank/customer.dto';
import { HomePage } from '@pages/parabank/home.page';
import { AccountsOverviewPage } from '@pages/parabank/accounts-overview.page';
import { TransferFundsPage } from '@pages/parabank/transfer-funds.page';
import { RegisterPage } from '@pages/parabank/register.page';

interface ParabankFixtures {
  /** The active region configuration (locale, currency, URLs, credentials). */
  region: RegionConfig;
  /** Typed client over the ParaBank REST API (own context bound to the API base URL). */
  apiClient: ParabankApiClient;
  /** The seeded demo customer, resolved by logging in with region credentials. */
  seededCustomer: CustomerDto;
  /** All accounts belonging to the seeded customer. */
  seededAccounts: AccountDto[];
  homePage: HomePage;
  accountsOverviewPage: AccountsOverviewPage;
  transferFundsPage: TransferFundsPage;
  registerPage: RegisterPage;
  /** Performs the seeded web login once; afterwards the session is authenticated. */
  loggedIn: boolean;
  /** Logged in as the seeded user, sitting on the transfer form. */
  loggedInTransferPage: TransferFundsPage;
}

export const test = base.extend<ParabankFixtures>({
  region: async ({}, use) => {
    await use(activeRegion);
  },
  apiClient: async ({ playwright, region }, use) => {
    const request = await playwright.request.newContext({
      baseURL: region.apiBaseUrl,
    });
    await use(new ParabankApiClient(request));
    await request.dispose();
  },
  seededCustomer: async ({ apiClient, region }, use) => {
    const customer = await apiClient.login(region.credentials.seededUsername, region.credentials.seededPassword);
    await use(customer);
  },
  seededAccounts: async ({ apiClient, seededCustomer }, use) => {
    await use(await apiClient.getAccounts(seededCustomer.id));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  accountsOverviewPage: async ({ page }, use) => {
    await use(new AccountsOverviewPage(page));
  },
  transferFundsPage: async ({ page }, use) => {
    await use(new TransferFundsPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  loggedIn: async ({ homePage, accountsOverviewPage, region }, use) => {
    await homePage.goto();
    await homePage.login(region.credentials.seededUsername, region.credentials.seededPassword);
    // Login redirects to the accounts overview; waiting on it proves the session is valid.
    await accountsOverviewPage.assertLoaded();
    await use(true);
  },
  loggedInTransferPage: async ({ loggedIn: _loggedIn, transferFundsPage }, use) => {
    // Depending on `loggedIn` (aliased `_loggedIn`) guarantees the seeded UI
    // login above has already run before we open the transfer form.
    await transferFundsPage.goto();
    await transferFundsPage.assertLoaded();
    await use(transferFundsPage);
  },
});

export { expect };
