export type TransactionType = 'Credit' | 'Debit';

// `date` is epoch milliseconds - the OpenAPI spec says `string (date-time)` (drift).
export interface TransactionDto {
  id: number;
  accountId: number;
  type: TransactionType;
  date: number;
  amount: number;
  description: string;
}
