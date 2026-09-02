import { test, expect } from '@parabank-fixtures';
import { validateAgainstSchema } from '@helpers/schema-validator';
import customerSchema from '@schemas/customer.schema.json';
import accountSchema from '@schemas/account.schema.json';

test.describe('ParaBank API — Customers', () => {
  test('logs in with seeded credentials and returns a customer', { tag: '@smoke' }, async ({ seededCustomer }) => {
    expect(seededCustomer.id).toBeGreaterThan(0);
    expect(seededCustomer.firstName).toBeTruthy();
    expect(seededCustomer.lastName).toBeTruthy();
  });

  test('login is idempotent: repeated calls return the same customer id', async ({ apiClient, region }) => {
    const first = await apiClient.login(region.credentials.seededUsername, region.credentials.seededPassword);
    const second = await apiClient.login(region.credentials.seededUsername, region.credentials.seededPassword);
    expect(first.id).toBe(second.id);
  });

  test('rejects login with an invalid password (HTTP 400)', async ({ apiClient, region }) => {
    const response = await apiClient.loginRaw(region.credentials.seededUsername, 'definitely-wrong-password');
    expect(response.status()).toBe(400);
  });

  test('returns customer details by id', async ({ apiClient, seededCustomer }) => {
    const customer = await apiClient.getCustomer(seededCustomer.id);

    expect(customer.id).toBe(seededCustomer.id);
    expect(customer.address).toBeTruthy();
    expect(customer.address.street).toBeTruthy();
  });

  test('returns HTTP 400 for an unknown customer id', async ({ apiClient }) => {
    const response = await apiClient.getCustomerRaw(0);
    expect(response.status()).toBe(400);
  });

  test('customer and account responses conform to the OpenAPI contract (schema validation)', async ({
    apiClient,
    seededCustomer,
  }) => {
    const customer = await apiClient.getCustomer(seededCustomer.id);
    expect(validateAgainstSchema(customerSchema, customer)).toEqual([]);

    const accounts = await apiClient.getAccounts(seededCustomer.id);
    expect(accounts.length).toBeGreaterThan(0);
    for (const account of accounts) {
      expect(validateAgainstSchema(accountSchema, account)).toEqual([]);
    }
  });
});
