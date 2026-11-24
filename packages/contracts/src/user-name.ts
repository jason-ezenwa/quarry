import { z } from "zod";

export const USER_NAME_MAX_LENGTH = 100;

export const INVALID_NAME_CODE = "INVALID_NAME";

export const USER_NAME_INVALID_MESSAGE =
  "Use letters, spaces, hyphens, apostrophes and full stops only.";

export const USER_NAME_WEB_ADDRESS_MESSAGE =
  "Names can't include web addresses.";

// Letters in any script with their marks, spaces, hyphens, apostrophes and full stops.
const NAME_CHARACTERS_PATTERN = /^[\p{L}\p{M}\s'’.-]+$/u;

// A full stop straight before letters, as in a domain such as "evil.io".
const DOMAIN_LIKE_PATTERN = /\.\p{L}/u;

function looksLikeWebAddress(name: string): boolean {
  return DOMAIN_LIKE_PATTERN.test(name);
}

// Names go into emails, so no links, phone numbers or markup.
export function isPlainName(name: string): boolean {
  return NAME_CHARACTERS_PATTERN.test(name) && !looksLikeWebAddress(name);
}

// The rules for an account name, shared by the sign-up form and the server.
export const userNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Enter your name", abort: true })
  .max(USER_NAME_MAX_LENGTH, `Use ${USER_NAME_MAX_LENGTH} characters or fewer`)
  .refine((name) => !looksLikeWebAddress(name), {
    message: USER_NAME_WEB_ADDRESS_MESSAGE,
    abort: true,
  })
  .refine(
    (name) => NAME_CHARACTERS_PATTERN.test(name),
    USER_NAME_INVALID_MESSAGE,
  );

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
