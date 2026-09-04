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
    seededAccounts,
  }) => {
    const account = [...seededAccounts].sort((a, b) => a.balance - b.balance)[0];
    const overBalanceAmount = Math.max(1, account.balance + 1);

    const response = await apiClient.withdrawRaw(account.id, overBalanceAmount);

    expect(response.status()).toBe(200);
    expect(await response.text()).toBe(confirmationMessage('withdraw', overBalanceAmount, account.id));
  });
});
