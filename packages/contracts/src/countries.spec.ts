import { describe, expect, it } from "vitest";
import { COUNTRIES, COUNTRY_CODES, CURRENCIES } from "./countries.js";

describe("COUNTRIES", () => {
  const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  const isoCurrencies = new Set(Intl.supportedValuesOf("currency"));

  it("is keyed by ISO 3166-1 alpha-2 codes", () => {
    for (const code of COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
      expect(regionNames.of(code)).not.toBe(code);
    }
  });

  it("gives every country a unique name", () => {
    const names = Object.values(COUNTRIES).map((country) => country.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every country an ISO 4217 currency", () => {
    for (const { currency } of Object.values(COUNTRIES)) {
      expect(isoCurrencies.has(currency)).toBe(true);
    }
  });
});

describe("CURRENCIES", () => {
  it("lists each currency the countries use once", () => {
    const used = new Set(Object.values(COUNTRIES).map((c) => c.currency));

    expect(CURRENCIES).toHaveLength(used.size);
    expect(new Set(CURRENCIES)).toEqual(used);
  });
});
