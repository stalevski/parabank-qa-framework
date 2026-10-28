import { test, expect } from '@parabank-fixtures';

test.describe('ParaBank Web - Login', () => {
  // This spec exercises the login flow itself, so it deliberately does the
  // login manually instead of using the authenticated fixture.
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

  // ParaBank's demo login no longer validates the password (see AUTH-1 in
  // docs/parabank/bugs.md), so the failure message is pinned as a known defect
  // instead of being expected to appear.
  test(
    'accepts an invalid password instead of showing the verification error (known defect AUTH-1)',
    { tag: '@known-defect' },
    async ({ homePage, page, region }) => {
      await homePage.goto();
      await homePage.login(region.credentials.seededUsername, 'definitely-wrong-password');

      await expect(page).toHaveURL(/overview\.htm/);
      await expect(homePage.loginError).toHaveCount(0);
    },
  );
});
