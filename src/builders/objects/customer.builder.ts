import { RandomDataGenerator } from '@helpers/random-data-generator';
import type { CustomerRegistrationDto } from '@models/api/parabank/customer.dto';

/**
 * Fluent builder for a web-registration payload.
 *
 * Every instance gets a unique username by default so tests that register
 * through the UI never collide with each other or with prior runs — the shared
 * demo database is not reset by this framework.
 */
export class CustomerBuilder {
  private registration: CustomerRegistrationDto;

  constructor() {
    this.registration = {
      firstName: RandomDataGenerator.firstName(),
      lastName: RandomDataGenerator.lastName(),
      street: RandomDataGenerator.street(),
      city: RandomDataGenerator.city(),
      state: RandomDataGenerator.state(),
      zipCode: RandomDataGenerator.zipCode(),
      phoneNumber: RandomDataGenerator.phoneNumber(),
      ssn: RandomDataGenerator.ssn(),
      username: RandomDataGenerator.username(),
      password: 'secret123',
    };
  }

  withFirstName(value: string): CustomerBuilder {
    this.registration.firstName = value;
    return this;
  }

  withLastName(value: string): CustomerBuilder {
    this.registration.lastName = value;
    return this;
  }

  withUsername(value: string): CustomerBuilder {
    this.registration.username = value;
    return this;
  }

  withPassword(value: string): CustomerBuilder {
    this.registration.password = value;
    return this;
  }

  build(): CustomerRegistrationDto {
    return { ...this.registration };
  }
}
