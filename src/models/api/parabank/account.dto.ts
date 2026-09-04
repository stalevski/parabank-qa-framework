export type AccountType = 'CHECKING' | 'SAVINGS' | 'LOAN';

// `balance` can go negative - fund movement doesn't enforce a minimum.
export interface AccountDto {
  id: number;
  customerId: number;
  type: AccountType;
  balance: number;
}
