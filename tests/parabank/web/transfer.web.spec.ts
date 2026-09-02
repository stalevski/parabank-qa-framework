import { test, expect } from '@parabank-fixtures';
import { RandomDataGenerator } from '@helpers/random-data-generator';

test.describe('ParaBank Web — Transfer', () => {
  test(
    'transfers funds between two accounts using the UI only',
    { tag: '@smoke' },
    async ({ homePage, accountsOverviewPage, transferFundsPage, region }) => {
      await homePage.goto();
      await homePage.login(region.credentials.seededUsername, region.credentials.seededPassword);
      await accountsOverviewPage.assertLoaded();

      await transferFundsPage.goto();
      await transferFundsPage.assertLoaded();

      const options = await transferFundsPage.accountOptions();
      expect(options.length).toBeGreaterThanOrEqual(2);

      const fromAccountId = Number(options[0]);
      const toAccountId = Number(options[options.length - 1]);
      const amount = RandomDataGenerator.transferAmount();

      await transferFundsPage.transfer(fromAccountId, toAccountId, amount);
      await transferFundsPage.assertTransferSuccess();
    },
  );

  test('shows an error when submitting a transfer with an empty amount', async ({
    homePage,
    accountsOverviewPage,
    transferFundsPage,
    region,
  }) => {
    await homePage.goto();
    await homePage.login(region.credentials.seededUsername, region.credentials.seededPassword);
    await accountsOverviewPage.assertLoaded();
    await transferFundsPage.goto();
    await transferFundsPage.assertLoaded();
    await transferFundsPage.transferButton.click();
    await transferFundsPage.assertAmountErrorVisible();
  });

  test('uses the API for setup and verification around a UI transfer', async ({
    apiClient,
    homePage,
    accountsOverviewPage,
    transferFundsPage,
    seededAccounts,
    region,
  }) => {
    // Setup via API: identify two accounts and snapshot the destination balance.
    expect(seededAccounts.length).toBeGreaterThanOrEqual(2);
    const fromAccount = seededAccounts[0];
    const toAccount = seededAccounts[seededAccounts.length - 1];
    const balanceBefore = (await apiClient.getAccount(toAccount.id)).balance;
    const amount = RandomDataGenerator.transferAmount();

    // Act via UI.
    await homePage.goto();
    await homePage.login(region.credentials.seededUsername, region.credentials.seededPassword);
    await accountsOverviewPage.assertLoaded();
    await transferFundsPage.goto();
    await transferFundsPage.assertLoaded();
    await transferFundsPage.transfer(fromAccount.id, toAccount.id, amount);
    await transferFundsPage.assertTransferSuccess();

    // Verify via API: the destination balance must have increased.
    await expect
      .poll(async () => (await apiClient.getAccount(toAccount.id)).balance, { timeout: 10_000 })
      .toBeGreaterThan(balanceBefore);
  });
});
