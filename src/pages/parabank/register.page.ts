import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '@core/ui/base.page';
import type { CustomerRegistrationDto } from '@models/api/parabank/customer.dto';

/** Registration form (`/register.htm`) - new customers are created via the web UI only. */
export class RegisterPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly streetInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly zipCodeInput: Locator;
  readonly phoneNumberInput: Locator;
  readonly ssnInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly successMessage: Locator;
  readonly welcomeHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.locator('input[name="customer.firstName"]');
    this.lastNameInput = page.locator('input[name="customer.lastName"]');
    this.streetInput = page.locator('input[name="customer.address.street"]');
    this.cityInput = page.locator('input[name="customer.address.city"]');
    this.stateInput = page.locator('input[name="customer.address.state"]');
    this.zipCodeInput = page.locator('input[name="customer.address.zipCode"]');
    this.phoneNumberInput = page.locator('input[name="customer.phoneNumber"]');
    this.ssnInput = page.locator('input[name="customer.ssn"]');
    this.usernameInput = page.locator('input[name="customer.username"]');
    this.passwordInput = page.locator('input[name="customer.password"]');
    this.confirmPasswordInput = page.locator('input[name="repeatedPassword"]');
    this.registerButton = page.locator('input[type="submit"][value="Register"]');
    this.successMessage = page.getByText('Your account was created successfully');
    this.welcomeHeading = page.locator('h1');
  }

  async goto(): Promise<void> {
    await this.visit('register.htm');
  }

  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.registerButton);
  }

  async register(registration: CustomerRegistrationDto): Promise<void> {
    await this.firstNameInput.fill(registration.firstName);
    await this.lastNameInput.fill(registration.lastName);
    await this.streetInput.fill(registration.street);
    await this.cityInput.fill(registration.city);
    await this.stateInput.fill(registration.state);
    await this.zipCodeInput.fill(registration.zipCode);
    await this.phoneNumberInput.fill(registration.phoneNumber);
    await this.ssnInput.fill(registration.ssn);
    await this.usernameInput.fill(registration.username);
    await this.passwordInput.fill(registration.password);
    await this.confirmPasswordInput.fill(registration.password);
    await this.registerButton.click();
  }
}
