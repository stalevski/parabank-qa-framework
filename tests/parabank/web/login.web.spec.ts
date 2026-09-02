import { test, expect } from '@parabank-fixtures';

test.describe('ParaBank Web — Login', () => {
  test(
    'logs in with seeded credentials and reaches the accounts overview',
    { tag: '@smoke' },
    async ({ homePage, accountsOverviewPage, region }) => {
      await homePage.goto();
      await homePage.assertLoaded();
      await homePage.login(region.credentials.seededUsername, region.credentials.seededPassword);
      await accountsOverviewPage.assertLoaded();
    },
  );

  test('logs out and the session round-trips back to the login form', async ({
    homePage,
    accountsOverviewPage,
    region,
  }) => {
    await homePage.goto();
    await homePage.login(region.credentials.seededUsername, region.credentials.seededPassword);
    await accountsOverviewPage.assertLoaded();

    await accountsOverviewPage.logOut();

    // After logout the application returns to the login screen.
    await homePage.assertLoaded();
    await expect(homePage.usernameInput).toBeVisible();
  });
});
