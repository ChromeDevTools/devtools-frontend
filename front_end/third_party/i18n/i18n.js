var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/third_party/i18n/i18n-impl.js
var i18n_impl_exports = {};
__export(i18n_impl_exports, {
  I18n: () => I18n
});

// gen/front_end/third_party/i18n/localized-string-set.js
var localized_string_set_exports = {};
__export(localized_string_set_exports, {
  LocalizedStringSet: () => LocalizedStringSet,
  RegisteredFileStrings: () => RegisteredFileStrings
});
import * as IntlMessageFormat from "./../intl-messageformat/intl-messageformat.js";
var EMPTY_VALUES_OBJECT = {};
var RegisteredFileStrings = class {
  filename;
  stringStructure;
  localizedMessages;
  localizedStringSet;
  constructor(filename, stringStructure, localizedMessages) {
    this.filename = filename;
    this.stringStructure = stringStructure;
    this.localizedMessages = localizedMessages;
  }
  getLocalizedStringSetFor(locale) {
    if (this.localizedStringSet) {
      return this.localizedStringSet;
    }
    const localeData = this.localizedMessages.get(locale);
    if (!localeData) {
      throw new Error(`No locale data registered for '${locale}'`);
    }
    this.localizedStringSet = new LocalizedStringSet(this.filename, this.stringStructure, locale, localeData);
    return this.localizedStringSet;
  }
};
var LocalizedStringSet = class {
  filename;
  stringStructure;
  localizedMessages;
  cachedSimpleStrings = /* @__PURE__ */ new Map();
  cachedMessageFormatters = /* @__PURE__ */ new Map();
  /** For pseudo locales, use 'de-DE' for number formatting */
  localeForFormatter;
  constructor(filename, stringStructure, locale, localizedMessages) {
    this.filename = filename;
    this.stringStructure = stringStructure;
    this.localizedMessages = localizedMessages;
    this.localeForFormatter = locale === "en-XA" || locale === "en-XL" ? "de-DE" : locale;
  }
  getLocalizedString(message, values = EMPTY_VALUES_OBJECT) {
    if (values === EMPTY_VALUES_OBJECT || Object.keys(values).length === 0) {
      return this.getSimpleLocalizedString(message);
    }
    return this.getFormattedLocalizedString(message, values);
  }
  getMessageFormatterFor(message) {
    const keyname = Object.keys(this.stringStructure).find((key) => this.stringStructure[key] === message);
    if (!keyname) {
      throw new Error(`Unable to locate '${message}' in UIStrings object`);
    }
    const i18nId = `${this.filename} | ${keyname}`;
    const localeMessage = this.localizedMessages[i18nId];
    const messageToTranslate = localeMessage ? localeMessage.message : message;
    return new IntlMessageFormat.IntlMessageFormat(messageToTranslate, this.localeForFormatter, void 0, { ignoreTag: true });
  }
  getSimpleLocalizedString(message) {
    const cachedSimpleString = this.cachedSimpleStrings.get(message);
    if (cachedSimpleString) {
      return cachedSimpleString;
    }
    const formatter = this.getMessageFormatterFor(message);
    try {
      const translatedString = formatter.format();
      this.cachedSimpleStrings.set(message, translatedString);
      return translatedString;
    } catch {
      const formatter2 = new IntlMessageFormat.IntlMessageFormat(message, this.localeForFormatter, void 0, { ignoreTag: true });
      const translatedString = formatter2.format();
      this.cachedSimpleStrings.set(message, translatedString);
      return translatedString;
    }
  }
  getFormattedLocalizedString(message, values) {
    let formatter = this.cachedMessageFormatters.get(message);
    if (!formatter) {
      formatter = this.getMessageFormatterFor(message);
      this.cachedMessageFormatters.set(message, formatter);
    }
    try {
      return formatter.format(values);
    } catch {
      const formatter2 = new IntlMessageFormat.IntlMessageFormat(message, this.localeForFormatter, void 0, { ignoreTag: true });
      return formatter2.format(values);
    }
  }
};

// gen/front_end/third_party/i18n/i18n-impl.js
var I18n = class {
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
};
export {
  i18n_impl_exports as I18n,
  localized_string_set_exports as LocalizedStringSet
};
//# sourceMappingURL=i18n.js.map
