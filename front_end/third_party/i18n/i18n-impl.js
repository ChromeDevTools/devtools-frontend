"use strict";
import { RegisteredFileStrings } from "./localized-string-set.js";
export class I18n {
  supportedLocales;
  localeData = /* @__PURE__ */ new Map();
  defaultLocale;
  constructor(supportedLocales, defaultLocale) {
    this.defaultLocale = defaultLocale;
    this.supportedLocales = new Set(supportedLocales);
  }
  registerLocaleData(locale, messages) {
    this.localeData.set(locale, messages);
  }
  hasLocaleDataForTest(locale) {
    return this.localeData.has(locale);
  }
  resetLocaleDataForTest() {
    this.localeData.clear();
  }
  registerFileStrings(filename, stringStructure) {
    return new RegisteredFileStrings(filename, stringStructure, this.localeData);
  }
  /**
   * Look up the best available locale for the requested language through these fall backs:
   * - exact match
   * - progressively shorter prefixes (`de-CH-1996` -> `de-CH` -> `de`)
   * - the default locale if no match is found
   */
  lookupClosestSupportedLocale(locale) {
    const canonicalLocale = Intl.getCanonicalLocales(locale)[0];
    const localeParts = canonicalLocale.split("-");
    while (localeParts.length) {
      const candidate = localeParts.join("-");
      if (this.supportedLocales.has(candidate)) {
        return candidate;
      }
      localeParts.pop();
    }
    return this.defaultLocale;
  }
}
//# sourceMappingURL=i18n-impl.js.map
