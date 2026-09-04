import { test, expect } from '@parabank-fixtures';
import { CustomerBuilder } from '@builders/objects/customer.builder';

test.describe('ParaBank Web - Register', () => {
  test('registers a new customer and confirms they are logged in', async ({ registerPage }) => {
    const registration = new CustomerBuilder().build();

    await registerPage.goto();
    await registerPage.assertLoaded();

    await registerPage.register(registration);

    await expect(registerPage.successMessage).toBeVisible();
    await expect(registerPage.welcomeHeading).toContainText(registration.username);
  });
});
