import { test, expect } from '@parabank-fixtures';
import { RandomDataGenerator } from '@helpers/random-data-generator';

test.describe('ParaBank Web - Transfer', () => {
  test(
    'transfers funds between two accounts using the UI only',
    { tag: '@smoke' },
    async ({ loggedInTransferPage }) => {
      const options = await loggedInTransferPage.accountOptions();
      expect(options.length).toBeGreaterThanOrEqual(2);

      const fromAccountId = Number(options[0]);
      const toAccountId = Number(options[options.length - 1]);
      const amount = RandomDataGenerator.transferAmount();

      await loggedInTransferPage.transfer(fromAccountId, toAccountId, amount);
      await loggedInTransferPage.assertTransferSuccess();
    },
  );

  test('uses the API for setup and verification around a UI transfer', async ({
    apiClient,
    seededAccounts,
    loggedInTransferPage,
  }) => {
    // Setup via API: identify two accounts and snapshot the destination balance.
    expect(seededAccounts.length).toBeGreaterThanOrEqual(2);
    const fromAccount = seededAccounts[0];
    const toAccount = seededAccounts[seededAccounts.length - 1];
    const balanceBefore = (await apiClient.getAccount(toAccount.id)).balance;
    const amount = RandomDataGenerator.transferAmount();

    // Act via UI.
    await loggedInTransferPage.transfer(fromAccount.id, toAccount.id, amount);
    await loggedInTransferPage.assertTransferSuccess();

    // Verify via API: the destination balance must have increased.
    await expect
      .poll(async () => (await apiClient.getAccount(toAccount.id)).balance, { timeout: 10_000 })
      .toBeGreaterThan(balanceBefore);
  });
});
