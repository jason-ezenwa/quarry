// Staging and production; anything else is a developer's machine or a test.
// NODE_ENV counts too, in case a deployed host is missing APP_ENV.
export function isDeployedEnv(): boolean {
  return (
    ['production', 'staging'].includes(process.env.APP_ENV ?? '') ||
    process.env.NODE_ENV === 'production'
  );
}
