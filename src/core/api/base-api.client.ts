import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

export interface ApiCallOptions {
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  form?: Record<string, string>;
}

/**
 * Appends the `_type=json` query parameter that asks ParaBank's CXF-backed REST
 * API to return JSON. Without it, the same endpoints return XML by default.
 */
const withJsonType = (path: string): string => {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}_type=json`;
};

/**
 * Shared foundation for typed API clients.
 *
 * Happy-path helpers throw on non-2xx statuses (via `expectOk`). The `*Raw`
 * variants return the raw `APIResponse` so error-state tests can assert on
 * status codes and bodies without throwing.
 */
export abstract class BaseApiClient {
  protected constructor(protected readonly request: APIRequestContext) {}

  protected async getJson<T>(path: string, options: ApiCallOptions = {}): Promise<T> {
    const response = await this.request.get(withJsonType(path), { params: options.params });
    await this.expectOk(response);
    return (await response.json()) as T;
  }

  protected async postJson<T>(path: string, options: ApiCallOptions = {}): Promise<T> {
    const response = await this.request.post(withJsonType(path), {
      params: options.params,
      data: options.data,
      form: options.form,
    });
    await this.expectOk(response);
    return (await response.json()) as T;
  }

  /** ParaBank returns plain-text confirmation strings for fund-movement calls. */
  protected async postText(path: string, options: ApiCallOptions = {}): Promise<string> {
    const response = await this.request.post(withJsonType(path), {
      params: options.params,
      data: options.data,
      form: options.form,
    });
    await this.expectOk(response);
    return (await response.text()).trim();
  }

  protected async getRaw(path: string, options: ApiCallOptions = {}): Promise<APIResponse> {
    return this.request.get(withJsonType(path), { params: options.params });
  }

  protected async postRaw(path: string, options: ApiCallOptions = {}): Promise<APIResponse> {
    return this.request.post(withJsonType(path), {
      params: options.params,
      data: options.data,
      form: options.form,
    });
  }

  protected async expectOk(response: APIResponse): Promise<void> {
    expect(response.ok(), `Request failed with status ${response.status()} for ${response.url()}`).toBeTruthy();
  }
}
