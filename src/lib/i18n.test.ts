import { describe, expect, it } from "vitest";
import { localeFromHints } from "./i18n";

describe("localeFromHints", () => {
  it("picks Italian for devices in Italy, whatever the browser language", () => {
    expect(localeFromHints("Europe/Rome", ["en-US"])).toBe("it");
    expect(localeFromHints("Europe/San_Marino", [])).toBe("it");
  });

  it("picks Italian for Italian browsers outside Italy", () => {
    expect(localeFromHints("Europe/Zurich", ["it-CH", "de-CH"])).toBe("it");
    expect(localeFromHints("Europe/London", ["en-GB", "it"])).toBe("it");
  });

  it("falls back to English elsewhere", () => {
    expect(localeFromHints("America/New_York", ["en-US"])).toBe("en");
    expect(localeFromHints("Europe/Berlin", ["de-DE"])).toBe("en");
    expect(localeFromHints(undefined, [])).toBe("en");
  });
});
