// What logs may say about a caught error: its class name, never its message.
export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}
