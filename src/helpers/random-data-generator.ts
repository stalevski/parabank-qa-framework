/**
 * Small, deterministic-in-shape random data generator for ParaBank test data.
 *
 * Kept lean on purpose: only what the registration form and fund-movement
 * tests need. Nothing here should ever depend on a specific seeded state.
 */
export class RandomDataGenerator {
  private static readonly firstNames = ['Alex', 'Mia', 'Daniel', 'Sofia', 'Liam', 'Emma', 'Noah', 'Olivia'];
  private static readonly lastNames = ['Parker', 'Stone', 'Carter', 'Bennett', 'Hayes', 'Coleman', 'Reed', 'Brooks'];
  private static readonly streetNames = ['Oak Street', 'Maple Avenue', 'River Road', 'Sunset Lane', 'Hillcrest Drive'];
  private static readonly cities = ['Skopje', 'Belgrade', 'Vienna', 'Prague', 'Berlin', 'Amsterdam'];
  private static readonly states = ['CA', 'NY', 'TX', 'FL', 'WA', 'IL'];
  private static readonly digits = '0123456789';

  static randomNumber(min = 0, max = 9999): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static pickOne<T>(values: readonly T[]): T {
    return values[Math.floor(Math.random() * values.length)];
  }

  static firstName(): string {
    return this.pickOne(this.firstNames);
  }

  static lastName(): string {
    return this.pickOne(this.lastNames);
  }

  static street(): string {
    return `${this.randomNumber(1, 999)} ${this.pickOne(this.streetNames)}`;
  }

  static city(): string {
    return this.pickOne(this.cities);
  }

  static state(): string {
    return this.pickOne(this.states);
  }

  static zipCode(): string {
    return String(this.randomNumber(10000, 99999));
  }

  /** Formats a US-style SSN (###-##-####). */
  static ssn(): string {
    return `${this.randomNumber(100, 999)}-${this.randomNumber(10, 99)}-${this.randomNumber(1000, 9999)}`;
  }

  static phoneNumber(): string {
    return `+1${this.randomNumber(100000000, 999999999)}`;
  }

  /** A unique username, prefixed so test data is easy to attribute. */
  static username(prefix = 'qa'): string {
    return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
  }

  /** A small, realistic transfer amount unlikely to collide with other users. */
  static transferAmount(): number {
    return Number((Math.random() * 50 + 1).toFixed(2));
  }
}
