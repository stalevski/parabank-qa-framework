/**
 * Builds the exact plain-text confirmation sentence ParaBank returns for a
 * fund-movement operation, so tests can assert full equality without
 * copy-pasting the sentence shape at every call site.
 *
 * ParaBank echoes the amount with two decimals (the client sends amounts via
 * `formatAmount`), e.g. `Successfully transferred $25.00 from account #13344 to
 * account #14343`.
 */
import { formatAmount } from './money';

export type FundMovementKind = 'transfer' | 'deposit' | 'withdraw';

export function confirmationMessage(
  kind: FundMovementKind,
  amount: number,
  accountId: number,
  toAccountId?: number,
): string {
  const money = `$${formatAmount(amount)}`;
  switch (kind) {
    case 'transfer':
      return `Successfully transferred ${money} from account #${accountId} to account #${toAccountId}`;
    case 'deposit':
      return `Successfully deposited ${money} to account #${accountId}`;
    case 'withdraw':
      return `Successfully withdrew ${money} from account #${accountId}`;
  }
}
