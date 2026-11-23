const WHITESPACE = /\s+/

// Up to two letters: the first and second names, as the avatar shows them.
export function getInitials(name: string) {
  return name
    .trim()
    .split(WHITESPACE)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
