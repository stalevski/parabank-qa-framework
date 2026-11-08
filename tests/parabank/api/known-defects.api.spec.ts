import { test, expect } from '@parabank-fixtures';
import { confirmationMessage } from '@helpers/fund-movement';

test.describe('ParaBank API - Known defects', () => {
  test('@known-defect CONTRACT: transaction date is epoch milliseconds, not the documented date-time string', async ({
    apiClient,
    seededAccounts,
  }) => {
    const histories = await Promise.all(seededAccounts.map((account) => apiClient.getTransactions(account.id)));
    const sample = histories.find((history) => history.length > 0)?.[0];

    expect(sample, 'expected at least one transaction in the seeded data').toBeTruthy();
    expect(typeof sample!.date).toBe('number');
  });

  test('@known-defect FUNDS: withdraw does not reject insufficient funds (allows overdraft)', async ({
    apiClient,
    workerAccounts,
  }) => {
    // Fresh balance: the fixture's deposit happened before any other test ran,
    // and this account is owned by this worker only.
    const account = await apiClient.getAccount(workerAccounts[0].id);
    const overBalanceAmount = Math.max(1, Number((account.balance + 1).toFixed(2)));

    const response = await apiClient.withdrawRaw(account.id, overBalanceAmount);

    expect(response.status()).toBe(200);
    expect(await response.text()).toBe(confirmationMessage('withdraw', overBalanceAmount, account.id));
  });
});
