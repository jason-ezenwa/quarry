import type { TransformFnParams } from 'class-transformer';

// Trims strings and leaves anything else for the validators to refuse.
export const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;
