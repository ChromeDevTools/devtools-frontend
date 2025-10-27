"use strict";
import * as IntlMessageFormat from "../intl-messageformat/intl-messageformat.js";
const EMPTY_VALUES_OBJECT = {};
export class RegisteredFileStrings {
  constructor(filename, stringStructure, localizedMessages) {
    this.filename = filename;
    this.stringStructure = stringStructure;
    this.localizedMessages = localizedMessages;
  }
  localizedStringSet;
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
}
export class LocalizedStringSet {
  constructor(filename, stringStructure, locale, localizedMessages) {
    this.filename = filename;
    this.stringStructure = stringStructure;
    this.localizedMessages = localizedMessages;
    this.localeForFormatter = locale === "en-XA" || locale === "en-XL" ? "de-DE" : locale;
  }
  cachedSimpleStrings = /* @__PURE__ */ new Map();
  cachedMessageFormatters = /* @__PURE__ */ new Map();
  /** For pseudo locales, use 'de-DE' for number formatting */
  localeForFormatter;
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
}
//# sourceMappingURL=localized-string-set.js.map
