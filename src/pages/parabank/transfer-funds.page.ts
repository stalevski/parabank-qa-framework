import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '@core/ui/base.page';
import { formatAmount } from '@helpers/money';
import { uiTransferConfirmation } from '@helpers/fund-movement';

/** Transfer funds form (`/transfer.htm`). */
export class TransferFundsPage extends BasePage {
  readonly amountInput: Locator;
  readonly fromAccountSelect: Locator;
  readonly toAccountSelect: Locator;
  readonly transferButton: Locator;
  /** Result panel shown after a successful transfer. */
  readonly successPanel: Locator;
  private readonly form: Locator;

  constructor(page: Page) {
    super(page);
    // The form is the natural scope for its own controls, so the fields are
    // resolved inside it rather than page-wide (locator.within()).
    this.form = page.locator('#transferForm');
    this.amountInput = page.locator('#amount').within(this.form);
    this.fromAccountSelect = page.locator('#fromAccountId').within(this.form);
    this.toAccountSelect = page.locator('#toAccountId').within(this.form);
    this.transferButton = page.getByRole('button', { name: 'Transfer' });
    this.successPanel = page.locator('#showResult');
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

  async assertTransferSuccess(amount: number, fromAccountId: number, toAccountId: number): Promise<void> {
    await expect(this.successPanel).toBeVisible();
    await expect(this.successPanel).toContainText('Transfer Complete!');
    await expect(this.successPanel).toContainText(uiTransferConfirmation(amount, fromAccountId, toAccountId));
  }
}
