import type { Resume } from "./resume.js";

// How a resume reads, on screen and in its PDF and DOCX, so a download matches what the user saw.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

// Shown where a role has no end date.
export const CURRENT_ROLE_LABEL = "now";

export const RESUME_SEPARATOR = "  ·  ";

// "2024" stays "2024"; "2024-03" reads "Mar 2024".
export function formatPartialDate(date: string): string {
  const [year, month] = date.split("-");
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}

// "Mar 2021–now" for a current role; "" when there are no dates.
export function formatDateRange(start?: string, end?: string): string {
  const to = end ? formatPartialDate(end) : CURRENT_ROLE_LABEL;
  if (start) return `${formatPartialDate(start)}–${to}`;
  return end ? to : "";
}

// A link as it is printed: "https://github.com/ada" reads "github.com/ada".
export function linkText(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

// Location, email and phone, in that order, leaving out blanks. Links follow them.
export function contactDetails(contact: Resume["contact"]): string[] {
  return [contact.location, contact.email, contact.phone].filter(
    (detail): detail is string => Boolean(detail?.trim()),
  );
}
