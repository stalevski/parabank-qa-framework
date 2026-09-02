import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

/**
 * Compiles a JSON Schema and validates `data` against it.
 *
 * Returns an array of human-readable errors; an empty array means the payload
 * satisfies the contract. Tests assert `errors` is empty to prove schema
 * conformance, so a response-shape regression fails loudly with the exact
 * instance path that broke.
 */
export function validateAgainstSchema(schema: object, data: unknown): string[] {
  const validate = ajv.compile(schema);
  validate(data);
  return (validate.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? 'invalid'}`);
}
