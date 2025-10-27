"use strict";
let devToolsLocaleInstance = null;
export class DevToolsLocale {
  locale;
  lookupClosestDevToolsLocale;
  constructor(data) {
    this.lookupClosestDevToolsLocale = data.lookupClosestDevToolsLocale;
    if (data.settingLanguage === "browserLanguage") {
      this.locale = data.navigatorLanguage || "en-US";
    } else {
      this.locale = data.settingLanguage;
    }
    this.locale = this.lookupClosestDevToolsLocale(this.locale);
  }
  static instance(opts = { create: false }) {
    if (!devToolsLocaleInstance && !opts.create) {
      throw new Error("No LanguageSelector instance exists yet.");
    }
    if (opts.create) {
      devToolsLocaleInstance = new DevToolsLocale(opts.data);
    }
    return devToolsLocaleInstance;
  }
  static removeInstance() {
    devToolsLocaleInstance = null;
  }
  forceFallbackLocale() {
    this.locale = "en-US";
  }
  /**
   * Returns true iff DevTools supports the language of the passed locale.
   * Note that it doesn't have to be a one-to-one match, e.g. if DevTools supports
   * 'de', then passing 'de-AT' will return true.
   */
  languageIsSupportedByDevTools(localeString) {
    return localeLanguagesMatch(localeString, this.lookupClosestDevToolsLocale(localeString));
  }
}
export function localeLanguagesMatch(localeString1, localeString2) {
  const locale1 = new Intl.Locale(localeString1);
  const locale2 = new Intl.Locale(localeString2);
  return locale1.language === locale2.language;
}
//# sourceMappingURL=DevToolsLocale.js.map
