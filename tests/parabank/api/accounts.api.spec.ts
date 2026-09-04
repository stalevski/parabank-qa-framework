import { test, expect } from '@parabank-fixtures';
import { validateAgainstSchema } from '@helpers/schema-validator';
import { RandomDataGenerator } from '@helpers/random-data-generator';
import { confirmationMessage } from '@helpers/fund-movement';
import accountSchema from '@schemas/account.schema.json';
import transactionsSchema from '@schemas/transactions.schema.json';

test.describe('ParaBank API - Accounts', () => {
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

  test('creates a new account for the seeded customer via the REST API', async ({
    apiClient,
    seededCustomer,
    seededAccounts,
  }) => {
    const fromAccountId = seededAccounts[0].id;

    const created = await test.step('open a SAVINGS account funded from the first seeded account', () =>
      apiClient.createAccount(seededCustomer.id, 1, fromAccountId));

    expect(created.id).toBeGreaterThan(0);
    expect(created.customerId).toBe(seededCustomer.id);
    expect(created.type).toBe('SAVINGS');

    const persisted = await test.step(`fetch the new account ${created.id} back`, () =>
      apiClient.getAccount(created.id));

    expect(persisted.id).toBe(created.id);
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
    expect(seededAccounts.length).toBeGreaterThanOrEqual(2);
    const [from, to] = seededAccounts;
    const amount = RandomDataGenerator.transferAmount();

    const confirmation = await test.step(`transfer $${amount.toFixed(2)} from ${from.id} to ${to.id}`, () =>
      apiClient.transfer(from.id, to.id, amount));

    expect(confirmation).toBe(confirmationMessage('transfer', amount, from.id, to.id));
  });

  test('deposits funds into an account', async ({ apiClient, seededAccounts }) => {
    const account = seededAccounts[0];
    const amount = RandomDataGenerator.transferAmount();

    const confirmation = await test.step(`deposit $${amount.toFixed(2)} into account ${account.id}`, () =>
      apiClient.deposit(account.id, amount));

    expect(confirmation).toBe(confirmationMessage('deposit', amount, account.id));
  });

  test('returns a single transaction by id', async ({ apiClient, seededAccounts }) => {
    const accountId = seededAccounts[0].id;

    const transactions = await test.step(`list transactions for account ${accountId}`, () =>
      apiClient.getTransactions(accountId));

    expect(transactions.length).toBeGreaterThan(0);

    const transaction = await test.step(`fetch transaction ${transactions[0].id}`, () =>
      apiClient.getTransaction(transactions[0].id));

    expect(transaction.id).toBe(transactions[0].id);
    expect(transaction.accountId).toBe(accountId);
  });

  test('accepts a zero-amount transfer (edge case)', async ({ apiClient, seededAccounts }) => {
    expect(seededAccounts.length).toBeGreaterThanOrEqual(2);
    const [from, to] = seededAccounts;

    const confirmation = await test.step(`transfer $0 from ${from.id} to ${to.id}`, () =>
      apiClient.transfer(from.id, to.id, 0));

    expect(confirmation).toBe(confirmationMessage('transfer', 0, from.id, to.id));
  });

  test('account and transaction responses conform to the OpenAPI contract (schema validation)', async ({
    apiClient,
    seededAccounts,
  }) => {
    for (const account of seededAccounts.slice(0, 2)) {
      expect(validateAgainstSchema(accountSchema, await apiClient.getAccount(account.id))).toEqual([]);
    }

    // An empty history still satisfies the array schema (no `minItems`), so we
    // validate unconditionally rather than silently skipping on empty data.
    const transactions = await apiClient.getTransactions(seededAccounts[0].id);
    expect(validateAgainstSchema(transactionsSchema, transactions)).toEqual([]);
  });
});
