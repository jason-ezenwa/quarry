import { describe, expect, it } from "vitest";
import { firstNameOf, isPlainName, userNameSchema } from "./user-name.js";

describe("isPlainName", () => {
  it.each([
    ["a first name", "Ada"],
    ["a full name", "Ada Obi"],
    ["a hyphenated name", "Saint-Exupéry"],
    ["an apostrophe", "O'Brien"],
    ["a curly apostrophe", "O’Brien"],
    ["accented letters", "Chukwuémélie"],
    ["initials with spaces", "J. R. R. Tolkien"],
    ["a trailing full stop", "Martin Luther King Jr."],
    ["another script", "李小龍"],
    ["combining marks", "Nguyễn"],
    ["letters that spell a domain ending", "George Janet Newcomb"],
  ])("accepts %s", (_, name) => {
    expect(isPlainName(name)).toBe(true);
  });

  it.each([
    ["an http URL", "http://evil.test"],
    ["a URL inside text", "Get rich https://bit.ly/4q12"],
    ["a www prefix", "www.phish.example"],
    ["a bare domain", "visit evil.io now"],
    ["a country domain", "evil.co.uk"],
    ["a phone number", "Call 0800 123 456"],
    ["a script tag", '<script>alert("x")</script>'],
    ["an ampersand", "Ada & Co"],
    ["an email address", "ada@example"],
  ])("rejects %s", (_, name) => {
    expect(isPlainName(name)).toBe(false);
  });
});

describe("userNameSchema", () => {
  it("trims the name", () => {
    expect(userNameSchema.parse("  Ada Obi  ")).toBe("Ada Obi");
  });

  it.each([
    ["an empty name", "   ", "Enter your name"],
    ["a long name", "a".repeat(101), "Use 100 characters or fewer"],
    [
      "a web address",
      "igorbrooksmaildrop.cc",
      "Names can't include web addresses.",
    ],
    ["a link", "https://evil.test", "Names can't include web addresses."],
    [
      "digits",
      "Ada 2",
      "Use letters, spaces, hyphens, apostrophes and full stops only.",
    ],
  ])("refuses %s with one message", (_, name, message) => {
    const result = userNameSchema.safeParse(name);

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      message,
    ]);
  });
});

describe("firstNameOf", () => {
  it.each([
    ["Ada Obi", "Ada"],
    ["  Ada   Obi  ", "Ada"],
    ["Ada", "Ada"],
    ["", ""],
  ])("takes the first word of %j", (name, expected) => {
    expect(firstNameOf(name)).toBe(expected);
  });
});
