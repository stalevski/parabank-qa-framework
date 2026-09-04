import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from '@core/api/base-api.client';
import { formatAmount } from '@helpers/money';
import type { AccountDto } from '@models/api/parabank/account.dto';
import type { CustomerDto } from '@models/api/parabank/customer.dto';
import type { TransactionDto } from '@models/api/parabank/transaction.dto';

/**
 * Typed client for ParaBank's REST API (`/services/bank`).
 *
 * Methods ending in `Raw` return the raw `APIResponse` (no auto-throw) so
 * error-state tests can assert on status codes. The happy-path methods throw
 * on non-2xx via the shared `BaseApiClient`.
 */
export class ParabankApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  // ---- Customers ------------------------------------------------------

  async login(username: string, password: string): Promise<CustomerDto> {
    return this.getJson<CustomerDto>(`login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`);
  }

  async loginRaw(username: string, password: string): Promise<APIResponse> {
    return this.getRaw(`login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`);
  }

  async getCustomer(customerId: number): Promise<CustomerDto> {
    return this.getJson<CustomerDto>(`customers/${customerId}`);
  }

  async getCustomerRaw(customerId: number): Promise<APIResponse> {
    return this.getRaw(`customers/${customerId}`);
  }

  async getAccounts(customerId: number): Promise<AccountDto[]> {
    return this.getJson<AccountDto[]>(`customers/${customerId}/accounts`);
  }

  // ---- Accounts -------------------------------------------------------

  async getAccount(accountId: number): Promise<AccountDto> {
    return this.getJson<AccountDto>(`accounts/${accountId}`);
  }

  async getAccountRaw(accountId: number): Promise<APIResponse> {
    return this.getRaw(`accounts/${accountId}`);
  }

  async getTransactions(accountId: number): Promise<TransactionDto[]> {
    return this.getJson<TransactionDto[]>(`accounts/${accountId}/transactions`);
  }

  async getTransaction(transactionId: number): Promise<TransactionDto> {
    return this.getJson<TransactionDto>(`transactions/${transactionId}`);
  }

  // `newAccountType` is the integer ordinal from the OpenAPI schema
  // (0 = CHECKING, 1 = SAVINGS, 2 = LOAN).
  async createAccount(customerId: number, newAccountType: number, fromAccountId: number): Promise<AccountDto> {
    return this.postJson<AccountDto>('createAccount', { params: { customerId, newAccountType, fromAccountId } });
  }

  // ---- Fund movement (returns plain-text confirmation) ----------------
  //
  // ParaBank echoes the amount's decimal scale back in the confirmation, so
  // amounts are always sent with two decimals via `formatAmount` to make the
  // echoed sentence deterministic for tests.

  async transfer(fromAccountId: number, toAccountId: number, amount: number): Promise<string> {
    return this.postText('transfer', { params: { fromAccountId, toAccountId, amount: formatAmount(amount) } });
  }

  async deposit(accountId: number, amount: number): Promise<string> {
    return this.postText('deposit', { params: { accountId, amount: formatAmount(amount) } });
  }

  async withdrawRaw(accountId: number, amount: number): Promise<APIResponse> {
    return this.postRaw('withdraw', { params: { accountId, amount: formatAmount(amount) } });
  }
}
