export type TransactionType = 'Credit' | 'Debit';

/**
 * Transaction as returned by `GET /accounts/{id}/transactions`.
 *
 * NOTE: `date` is epoch milliseconds (a number) in the real response, whereas
 * the published OpenAPI schema declares `string (date-time)`. This drift is
 * documented in `docs/parabank/bugs.md` and asserted by a `@known-defect` test.
 */
export interface TransactionDto {
  id: number;
  accountId: number;
  type: TransactionType;
  date: number;
  amount: number;
  description: string;
}
