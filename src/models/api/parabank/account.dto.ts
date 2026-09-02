export type AccountType = 'CHECKING' | 'SAVINGS' | 'LOAN';

/**
 * Account as returned by `GET /accounts/{id}` and
 * `GET /customers/{id}/accounts`. `balance` may be negative — the demo's fund
 * movement endpoints do not enforce a minimum balance.
 */
export interface AccountDto {
  id: number;
  customerId: number;
  type: AccountType;
  balance: number;
}
