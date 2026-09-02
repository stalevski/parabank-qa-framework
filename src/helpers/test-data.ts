import { CustomerBuilder } from '@builders/objects/customer.builder';
import type { CustomerRegistrationDto } from '@models/api/parabank/customer.dto';

/** Creates a fresh, unique web-registration payload. */
export const createCustomerRegistration = (): CustomerRegistrationDto => new CustomerBuilder().build();
