import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { validateAgainstSchema } from '@helpers/schema-validator';

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
//
// The JSON methods also take the schema for the DTO they return and validate the
// payload before the test sees it: a missing or renamed field fails here, with
// the instance path, instead of surfacing later as `undefined` inside an
// assertion. That turns every DTO-returning call into a contract check.
export abstract class BaseApiClient {
  protected constructor(protected readonly request: APIRequestContext) {}

  protected async getJson<T>(path: string, schema: object, options: ApiCallOptions = {}): Promise<T> {
    const response = await this.request.get(path, { params: options.params, headers: jsonHeaders });
    return this.readJson<T>(response, path, schema);
  }

  protected async postJson<T>(path: string, schema: object, options: ApiCallOptions = {}): Promise<T> {
    const response = await this.request.post(path, {
      params: options.params,
      data: options.data,
      form: options.form,
      headers: jsonHeaders,
    });
    return this.readJson<T>(response, path, schema);
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

  private async readJson<T>(response: APIResponse, path: string, schema: object): Promise<T> {
    await this.expectOk(response);
    const body = (await response.json()) as T;
    const errors = validateAgainstSchema(schema, body);
    if (errors.length > 0) {
      throw new Error(`${path} does not satisfy its JSON Schema: ${errors.join('; ')}`);
    }
    return body;
  }

  protected async expectOk(response: APIResponse): Promise<void> {
    if (!response.ok()) {
      // The body is the only place ParaBank explains a failure, so surface its
      // first line instead of forcing a re-run just to read the response.
      const body = (await response.text().catch(() => '')).trim().slice(0, 200);
      throw new Error(
        `Request failed with status ${response.status()} for ${response.url()}${body ? `: ${body}` : ''}`,
      );
    }
  }
}
