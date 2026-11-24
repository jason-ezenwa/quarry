import { ValidateBy, type ValidationOptions } from 'class-validator';
import { HTTP_PROTOCOLS } from './common.constants';

// The same rule as the contract's zod `httpUrl`, so a link the parser stored
// is never refused when the user saves it unchanged.
export function isHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !URL.canParse(value)) return false;

  return HTTP_PROTOCOLS.has(new URL(value).protocol);
}

export function IsHttpUrl(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isHttpUrl',
      validator: {
        validate: isHttpUrl,
        defaultMessage: () => '$property must be an http(s) URL',
      },
    },
    options,
  );
}
