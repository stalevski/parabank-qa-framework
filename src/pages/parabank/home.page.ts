import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '@core/ui/base.page';

/** Login / landing page (`/index.htm`). */
export class HomePage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly logInButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.logInButton = page.getByRole('button', { name: 'Log In' });
  }

  async goto(): Promise<void> {
    await this.visit('index.htm');
  }

  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.usernameInput);
    await this.expectVisible(this.logInButton);
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.logInButton.click();
  }
}
