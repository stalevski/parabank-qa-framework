import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '@core/ui/base.page';

/** Accounts overview shown after a successful login (`/overview.htm`). */
export class AccountsOverviewPage extends BasePage {
  readonly accountTable: Locator;
  readonly transferFundsLink: Locator;
  readonly logOutLink: Locator;

  constructor(page: Page) {
    super(page);
    this.accountTable = page.locator('#accountTable');
    this.transferFundsLink = page.getByRole('link', { name: 'Transfer Funds' });
    this.logOutLink = page.getByRole('link', { name: 'Log Out' });
  }

  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.accountTable);
  }

  async logOut(): Promise<void> {
    await this.logOutLink.click();
  }

  async assertLoggedOut(): Promise<void> {
    await expect(this.logOutLink).toBeHidden();
  }
}
