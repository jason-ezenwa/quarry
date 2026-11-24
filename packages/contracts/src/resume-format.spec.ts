import { describe, expect, it } from "vitest";
import { contactDetails, formatDateRange, formatPartialDate, linkText } from "./resume-format.js";

describe("formatPartialDate", () => {
  it.each([
    ["2024", "2024"],
    ["2024-03", "Mar 2024"],
    ["2019-12", "Dec 2019"],
  ])("formats %s as %s", (date, expected) => {
    expect(formatPartialDate(date)).toBe(expected);
  });
});

describe("formatDateRange", () => {
  it.each([
    ["2022", "2024", "2022–2024"],
    ["2024-01", undefined, "Jan 2024–now"],
    [undefined, "2020", "2020"],
    [undefined, undefined, ""],
  ])("formats %s to %s as %s", (start, end, expected) => {
    expect(formatDateRange(start, end)).toBe(expected);
  });
});

describe("contactDetails", () => {
  it("puts location, email and phone in order and leaves out blanks", () => {
    expect(
      contactDetails({ email: "ada@example.com", location: "Lagos, Nigeria", phone: " ", links: [] }),
    ).toEqual(["Lagos, Nigeria", "ada@example.com"]);
  });
});

describe("linkText", () => {
  it("drops the scheme", () => {
    expect(linkText("https://github.com/ada")).toBe("github.com/ada");
  });
});
