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

/**
 * Fixtures scoped to a worker rather than a test, so their setup cost (creating
 * and funding accounts through the API) is paid once per worker.
 */
export interface ParabankWorkerFixtures {
  /**
   * Two accounts belonging to the seeded customer that this worker owns
   * exclusively: SAVINGS as the source, CHECKING as the destination, with a
   * known deposit on the source. Mutating tests use these instead of the shared
   * seeded accounts, so parallel workers never race on the same balance or
   * transaction history.
   */
  workerAccounts: AccountDto[];
}

// A freshly created account starts at 0, so the source needs a deposit before
// transfers and overdraft checks have a balance to work with.
const WORKER_FUNDING_DEPOSIT = 100;

// Parallel workers create accounts for the same shared demo customer at the
// same moment, and ParaBank intermittently rejects a burst of concurrent
// creations ("Could not create new account ..."). Setup is retried; assertions
// never are, because the demo - not the code under test - is the unstable part.
const CREATE_ACCOUNT_ATTEMPTS = 3;
const CREATE_ACCOUNT_BACKOFF_MS = 500;

async function createAccountWithRetry(
  client: ParabankApiClient,
  customerId: number,
  accountType: number,
  fromAccountId: number,
): Promise<AccountDto> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await client.createAccount(customerId, accountType, fromAccountId);
    } catch (error) {
      if (attempt >= CREATE_ACCOUNT_ATTEMPTS) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * CREATE_ACCOUNT_BACKOFF_MS));
    }
  }
}

export const test = base.extend<ParabankFixtures, ParabankWorkerFixtures>({
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
  workerAccounts: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext({ baseURL: activeRegion.apiBaseUrl });
      try {
        const client = new ParabankApiClient(request);
        const customer = await client.login(
          activeRegion.credentials.seededUsername,
          activeRegion.credentials.seededPassword,
        );
        const accounts = await client.getAccounts(customer.id);
        // Fund from the account with the most headroom: the demo database is
        // shared, and some seeded accounts sit deeply negative after other
        // users' overdrafts.
        const fundingAccount = [...accounts].sort((a, b) => b.balance - a.balance)[0];

        // 1 = SAVINGS (source), 0 = CHECKING (destination) - see app.md for the
        // integer ordinals the REST endpoint accepts.
        const source = await createAccountWithRetry(client, customer.id, 1, fundingAccount.id);
        const destination = await createAccountWithRetry(client, customer.id, 0, fundingAccount.id);
        await client.deposit(source.id, WORKER_FUNDING_DEPOSIT);

        await use([source, destination]);
      } finally {
        await request.dispose();
      }
    },
    { scope: 'worker' },
  ],
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
