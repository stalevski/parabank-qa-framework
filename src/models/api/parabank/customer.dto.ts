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

/**
 * Flat payload matching the web registration form.
 *
 * ParaBank exposes no REST `/register` endpoint (verified: HTTP 404), so new
 * customers are created through the web UI and this DTO models that form.
 */
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
