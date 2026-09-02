import { test, expect } from '@parabank-fixtures';
import { validateAgainstSchema } from '@helpers/schema-validator';
import { RandomDataGenerator } from '@helpers/random-data-generator';
import accountSchema from '@schemas/account.schema.json';
import transactionsSchema from '@schemas/transactions.schema.json';

test.describe('ParaBank API — Accounts', () => {
  test('lists accounts for the seeded customer', { tag: '@smoke' }, async ({ seededCustomer, seededAccounts }) => {
    expect(seededAccounts.length).toBeGreaterThan(0);
    for (const account of seededAccounts) {
      expect(account.customerId).toBe(seededCustomer.id);
    }
  });

  test('returns a single account by id', async ({ apiClient, seededAccounts }) => {
    const account = await apiClient.getAccount(seededAccounts[0].id);

    expect(account.id).toBe(seededAccounts[0].id);
    expect(account.type).toMatch(/CHECKING|SAVINGS|LOAN/);
  });

  test('returns HTTP 400 for an unknown account id', async ({ apiClient }) => {
    const response = await apiClient.getAccountRaw(999999999);
    expect(response.status()).toBe(400);
  });

  test('returns the transaction history for an account', async ({ apiClient, seededAccounts }) => {
    const transactions = await apiClient.getTransactions(seededAccounts[0].id);
    expect(Array.isArray(transactions)).toBeTruthy();
  });

  test('transfers funds between two accounts', async ({ apiClient, seededAccounts }) => {
    const [from, to] = seededAccounts;
    const amount = RandomDataGenerator.transferAmount();

    const confirmation = await apiClient.transfer(from.id, to.id, amount);

    expect(confirmation).toContain('Successfully transferred');
  });

  test('account and transaction responses conform to the OpenAPI contract (schema validation)', async ({
    apiClient,
    seededAccounts,
  }) => {
    for (const account of seededAccounts.slice(0, 2)) {
      expect(validateAgainstSchema(accountSchema, await apiClient.getAccount(account.id))).toEqual([]);
    }

    const transactions = await apiClient.getTransactions(seededAccounts[0].id);
    if (transactions.length > 0) {
      expect(validateAgainstSchema(transactionsSchema, transactions)).toEqual([]);
    }
  });

  test.describe('Known defects', () => {
    test('@known-defect CONTRACT: transaction date is epoch milliseconds, not the documented date-time string', async ({
      apiClient,
      seededAccounts,
    }) => {
      const seeded = seededAccounts;
      let sample = null;
      for (const account of seeded) {
        const transactions = await apiClient.getTransactions(account.id);
        if (transactions.length > 0) {
          sample = transactions[0];
          break;
        }
      }
      expect(sample, 'expected at least one transaction in the seeded data').toBeTruthy();
      // The OpenAPI schema declares `date` as `string (date-time)`; the API returns a number.
      expect(typeof sample!.date).toBe('number');
    });

    test('@known-defect FUNDS: withdraw does not reject insufficient funds (allows overdraft)', async ({
      apiClient,
      seededAccounts,
    }) => {
      // Pick the account with the smallest balance so the overdraft is minimal.
      const account = [...seededAccounts].sort((a, b) => a.balance - b.balance)[0];
      const overBalanceAmount = Math.max(1, account.balance + 1);

      const response = await apiClient.withdrawRaw(account.id, overBalanceAmount);

      expect(response.status()).toBe(200);
      expect(await response.text()).toContain('Successfully withdrew');
    });
  });
});
