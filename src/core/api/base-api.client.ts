import { type APIRequestContext, type APIResponse } from '@playwright/test';

export interface ApiCallOptions {
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  form?: Record<string, string>;
}

// ParaBank returns XML by default, so every request asks for JSON via the
// standard `Accept` header. This keeps the client self-contained - it never
// depends on how the caller configured the request context.
const jsonHeaders = { Accept: 'application/json' };

// Happy-path methods throw on non-2xx; `*Raw` methods return the raw response
// so error-state tests can assert on status codes without throwing.
export abstract class BaseApiClient {
  protected constructor(protected readonly request: APIRequestContext) {}

  protected async getJson<T>(path: string, options: ApiCallOptions = {}): Promise<T> {
    const response = await this.request.get(path, { params: options.params, headers: jsonHeaders });
    await this.expectOk(response);
    return (await response.json()) as T;
  }

  protected async postJson<T>(path: string, options: ApiCallOptions = {}): Promise<T> {
    const response = await this.request.post(path, {
      params: options.params,
      data: options.data,
      form: options.form,
      headers: jsonHeaders,
    });
    await this.expectOk(response);
    return (await response.json()) as T;
  }

  // Fund-movement endpoints return plain-text confirmation strings, not JSON.
  protected async postText(path: string, options: ApiCallOptions = {}): Promise<string> {
    const response = await this.request.post(path, {
      params: options.params,
      data: options.data,
      form: options.form,
      headers: jsonHeaders,
    });
    await this.expectOk(response);
    return (await response.text()).trim();
  }

  protected async getRaw(path: string, options: ApiCallOptions = {}): Promise<APIResponse> {
    return this.request.get(path, { params: options.params, headers: jsonHeaders });
  }

  protected async postRaw(path: string, options: ApiCallOptions = {}): Promise<APIResponse> {
    return this.request.post(path, {
      params: options.params,
      data: options.data,
      form: options.form,
      headers: jsonHeaders,
    });
  }

  protected async expectOk(response: APIResponse): Promise<void> {
    if (!response.ok()) {
      throw new Error(`Request failed with status ${response.status()} for ${response.url()}`);
    }
  }
}
