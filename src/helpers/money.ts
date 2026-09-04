/**
 * Serialises an amount as a fixed two-decimal string ("12.00").
 *
 * ParaBank echoes the decimal scale it receives: send "0" and a confirmation
 * says "$0"; send "0.00" and it says "$0.00". Centralising the formatting here
 * keeps that rule in one place for the API client, page objects and the
 * confirmation-sentence helper.
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}
