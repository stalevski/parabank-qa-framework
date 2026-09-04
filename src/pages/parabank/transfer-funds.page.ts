import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '@core/ui/base.page';
import { formatAmount } from '@helpers/money';

/** Transfer funds form (`/transfer.htm`). */
export class TransferFundsPage extends BasePage {
  readonly amountInput: Locator;
  readonly fromAccountSelect: Locator;
  readonly toAccountSelect: Locator;
  readonly transferButton: Locator;
  readonly successMessage: Locator;
  readonly transferError: Locator;

  constructor(page: Page) {
    super(page);
    this.amountInput = page.locator('#amount');
    this.fromAccountSelect = page.locator('#fromAccountId');
    this.toAccountSelect = page.locator('#toAccountId');
    this.transferButton = page.getByRole('button', { name: 'Transfer' });
    this.successMessage = page.locator('#amountResult');
    this.transferError = page.getByText(/An internal error has occurred and has been logged/i);
  }

  async goto(): Promise<void> {
    await this.visit('transfer.htm');
  }

  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.transferButton);
    // The account dropdowns are populated by the page's jQuery on load; waiting
    // for an option proves the JS (including the submit/validation handlers) is ready.
    await expect(this.fromAccountSelect.locator('option').first()).toBeAttached();
  }

  async transfer(fromAccountId: number, toAccountId: number, amount: number): Promise<void> {
    await this.fromAccountSelect.selectOption(String(fromAccountId));
    await this.toAccountSelect.selectOption(String(toAccountId));
    await this.amountInput.fill(formatAmount(amount));
    await this.transferButton.click();
  }

  /** Returns the account ids offered by the "from account" dropdown. */
  async accountOptions(): Promise<string[]> {
    await expect(this.fromAccountSelect.locator('option').first()).toBeAttached();
    return this.fromAccountSelect
      .locator('option')
      .evaluateAll((options) => options.map((option) => option.getAttribute('value') ?? ''));
  }

  async assertTransferSuccess(): Promise<void> {
    await expect(this.successMessage).not.toHaveText('');
  }

  async assertAmountErrorVisible(): Promise<void> {
    await expect(this.transferError).toBeVisible();
  }
}
