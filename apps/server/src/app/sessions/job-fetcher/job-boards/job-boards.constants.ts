// Decoded path segments copied into an API address must not change its path.
export const SAFE_SEGMENT = /^[\w .-]+$/;
export const NUMERIC_ID = /^\d+$/;
export const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export const WORKDAY_LOCALE = /^[a-z]{2}(?:-[A-Z]{2})?$/;

// LinkedIn's link shortener.
export const LINKEDIN_SHORT_HOST = 'lnkd.in';
