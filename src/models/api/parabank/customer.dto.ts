import type { AddressDto } from './common.dto';

/** Customer as returned by `GET /customers/{id}` and `GET /login/{u}/{p}`. */
export interface CustomerDto {
  id: number;
  firstName: string;
  lastName: string;
  address: AddressDto;
  phoneNumber: string;
  ssn: string;
}

// Web registration form payload - no REST /register exists (404).
export interface CustomerRegistrationDto {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
}
