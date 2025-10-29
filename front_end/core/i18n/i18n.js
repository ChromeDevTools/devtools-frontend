var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/core/i18n/ByteUtilities.js
var ByteUtilities_exports = {};
__export(ByteUtilities_exports, {
  bytesToString: () => bytesToString,
  formatBytesToKb: () => formatBytesToKb
});

// gen/front_end/core/i18n/NumberFormatter.js
var NumberFormatter_exports = {};
__export(NumberFormatter_exports, {
  defineFormatter: () => defineFormatter
});

// gen/front_end/core/i18n/DevToolsLocale.js
var DevToolsLocale_exports = {};
__export(DevToolsLocale_exports, {
  DevToolsLocale: () => DevToolsLocale,
  localeLanguagesMatch: () => localeLanguagesMatch
});
var devToolsLocaleInstance = null;
var DevToolsLocale = class _DevToolsLocale {
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
      devToolsLocaleInstance = new _DevToolsLocale(opts.data);
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
};
function localeLanguagesMatch(localeString1, localeString2) {
  const locale1 = new Intl.Locale(localeString1);
  const locale2 = new Intl.Locale(localeString2);
  return locale1.language === locale2.language;
}

// gen/front_end/core/i18n/NumberFormatter.js
function defineFormatter(options) {
  let intlNumberFormat;
  return {
    format(value, separator) {
      if (!intlNumberFormat) {
        intlNumberFormat = new Intl.NumberFormat(DevToolsLocale.instance().locale, options);
      }
      return formatAndEnsureSpace(intlNumberFormat, value, separator);
    },
    formatToParts(value) {
      if (!intlNumberFormat) {
        intlNumberFormat = new Intl.NumberFormat(DevToolsLocale.instance().locale, options);
      }
      return intlNumberFormat.formatToParts(value);
    }
  };
}
function formatAndEnsureSpace(formatter, value, separator = "\xA0") {
  const parts = formatter.formatToParts(value);
  let hasSpace = false;
  for (const part of parts) {
    if (part.type === "literal") {
      if (part.value === " ") {
        hasSpace = true;
        part.value = separator;
      } else if (part.value === separator) {
        hasSpace = true;
      }
    }
  }
  if (hasSpace) {
    return parts.map((part) => part.value).join("");
  }
  const unitIndex = parts.findIndex((part) => part.type === "unit");
  if (unitIndex === -1) {
    return parts.map((part) => part.value).join("");
  }
  if (unitIndex === 0) {
    return parts[0].value + separator + parts.slice(1).map((part) => part.value).join("");
  }
  return parts.slice(0, unitIndex).map((part) => part.value).join("") + separator + parts.slice(unitIndex).map((part) => part.value).join("");
}

// gen/front_end/core/i18n/ByteUtilities.js
var narrowBytes = defineFormatter({
  style: "unit",
  unit: "byte",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
var narrowKilobytesDecimal = defineFormatter({
  style: "unit",
  unit: "kilobyte",
  unitDisplay: "narrow",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
var narrowKilobytesInteger = defineFormatter({
  style: "unit",
  unit: "kilobyte",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
var narrowMegabytesDecimal = defineFormatter({
  style: "unit",
  unit: "megabyte",
  unitDisplay: "narrow",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
var narrowMegabytesInteger = defineFormatter({
  style: "unit",
  unit: "megabyte",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
var bytesToString = (bytes) => {
  if (bytes < 1e3) {
    return narrowBytes.format(bytes);
  }
  const kilobytes = bytes / 1e3;
  if (kilobytes < 100) {
    return narrowKilobytesDecimal.format(kilobytes);
  }
  if (kilobytes < 1e3) {
    return narrowKilobytesInteger.format(kilobytes);
  }
  const megabytes = kilobytes / 1e3;
  if (megabytes < 100) {
    return narrowMegabytesDecimal.format(megabytes);
  }
  return narrowMegabytesInteger.format(megabytes);
};
var formatBytesToKb = (bytes) => {
  const kilobytes = bytes / 1e3;
  if (kilobytes < 100) {
    return narrowKilobytesDecimal.format(kilobytes);
  }
  return narrowKilobytesInteger.format(kilobytes);
};

// gen/front_end/core/i18n/i18nImpl.js
var i18nImpl_exports = {};
__export(i18nImpl_exports, {
  deserializeUIString: () => deserializeUIString,
  fetchAndRegisterLocaleData: () => fetchAndRegisterLocaleData,
  getAllSupportedDevToolsLocales: () => getAllSupportedDevToolsLocales,
  getLazilyComputedLocalizedString: () => getLazilyComputedLocalizedString,
  getLocalizedLanguageRegion: () => getLocalizedLanguageRegion,
  getLocalizedString: () => getLocalizedString,
  hasLocaleDataForTest: () => hasLocaleDataForTest,
  lockedLazyString: () => lockedLazyString,
  lockedString: () => lockedString,
  lookupClosestSupportedDevToolsLocale: () => lookupClosestSupportedDevToolsLocale,
  registerLocaleDataForTest: () => registerLocaleDataForTest,
  registerUIStrings: () => registerUIStrings,
  resetLocaleDataForTest: () => resetLocaleDataForTest,
  serializeUIString: () => serializeUIString
});
import * as I18n from "./../../third_party/i18n/i18n.js";
import * as Root from "./../root/root.js";

// gen/front_end/core/i18n/locales.js
var LOCALES = [
  "af",
  "am",
  "ar",
  "as",
  "az",
  "be",
  "bg",
  "bn",
  "bs",
  "ca",
  "cs",
  "cy",
  "da",
  "de",
  "el",
  "en-GB",
  "es-419",
  "es",
  "et",
  "eu",
  "fa",
  "fi",
  "fil",
  "fr-CA",
  "fr",
  "gl",
  "gu",
  "he",
  "hi",
  "hr",
  "hu",
  "hy",
  "id",
  "is",
  "it",
  "ja",
  "ka",
  "kk",
  "km",
  "kn",
  "ko",
  "ky",
  "lo",
  "lt",
  "lv",
  "mk",
  "ml",
  "mn",
  "mr",
  "ms",
  "my",
  "ne",
  "nl",
  "no",
  "or",
  "pa",
  "pl",
  "pt-PT",
  "pt",
  "ro",
  "ru",
  "si",
  "sk",
  "sl",
  "sq",
  "sr-Latn",
  "sr",
  "sv",
  "sw",
  "ta",
  "te",
  "th",
  "tr",
  "uk",
  "ur",
  "uz",
  "vi",
  "zh-HK",
  "zh-TW",
  "zu",
  "en-US",
  "zh"
];
var BUNDLED_LOCALES = [
  "en-US",
  "zh"
];
var DEFAULT_LOCALE = "en-US";
var REMOTE_FETCH_PATTERN = "@HOST@/remote/serve_file/@VERSION@/core/i18n/locales/@LOCALE@.json";
var LOCAL_FETCH_PATTERN = "./locales/@LOCALE@.json";

// gen/front_end/core/i18n/i18nImpl.js
var i18nInstance = new I18n.I18n.I18n(LOCALES, DEFAULT_LOCALE);
var BUNDLED_LOCALES2 = /* @__PURE__ */ new Set([...BUNDLED_LOCALES]);
function lookupClosestSupportedDevToolsLocale(locale) {
  return i18nInstance.lookupClosestSupportedLocale(locale);
}
function getAllSupportedDevToolsLocales() {
  return [...i18nInstance.supportedLocales];
}
function getLocaleFetchUrl(locale, location) {
  const remoteBase = Root.Runtime.getRemoteBase(location);
  if (remoteBase?.version && !BUNDLED_LOCALES2.has(locale)) {
    return REMOTE_FETCH_PATTERN.replace("@HOST@", "devtools://devtools").replace("@VERSION@", remoteBase.version).replace("@LOCALE@", locale);
  }
  const path = LOCAL_FETCH_PATTERN.replace("@LOCALE@", locale);
  return new URL(path, import.meta.url).toString();
}
async function fetchAndRegisterLocaleData(locale, location = self.location.toString()) {
  const localeDataTextPromise = fetch(getLocaleFetchUrl(locale, location)).then((result) => result.json());
  const timeoutPromise = new Promise((_, reject) => window.setTimeout(() => reject(new Error("timed out fetching locale")), 5e3));
  const localeData = await Promise.race([timeoutPromise, localeDataTextPromise]);
  i18nInstance.registerLocaleData(locale, localeData);
}
function hasLocaleDataForTest(locale) {
  return i18nInstance.hasLocaleDataForTest(locale);
}
function resetLocaleDataForTest() {
  i18nInstance.resetLocaleDataForTest();
}
function registerLocaleDataForTest(locale, messages) {
  i18nInstance.registerLocaleData(locale, messages);
}
function getLazilyComputedLocalizedString(registeredStrings, id, values = {}) {
  return () => getLocalizedString(registeredStrings, id, values);
}
function getLocalizedString(registeredStrings, id, values = {}) {
  return registeredStrings.getLocalizedStringSetFor(DevToolsLocale.instance().locale).getLocalizedString(id, values);
}
function registerUIStrings(path, stringStructure) {
  return i18nInstance.registerFileStrings(path, stringStructure);
}
function serializeUIString(string, values = {}) {
  const serializedMessage = { string, values };
  return JSON.stringify(serializedMessage);
}
function deserializeUIString(serializedMessage) {
  if (!serializedMessage) {
    return { string: "", values: {} };
  }
  return JSON.parse(serializedMessage);
}
function lockedString(str) {
  return str;
}
function lockedLazyString(str) {
  return () => str;
}
function getLocalizedLanguageRegion(localeString, devtoolsLocale) {
  const locale = new Intl.Locale(localeString);
  const { language, baseName } = locale;
  const devtoolsLoc = new Intl.Locale(devtoolsLocale.locale);
  const targetLanguage = language === devtoolsLoc.language ? "en" : baseName;
  const languageInCurrentLocale = new Intl.DisplayNames([devtoolsLocale.locale], { type: "language" }).of(language);
  const languageInTargetLocale = new Intl.DisplayNames([targetLanguage], { type: "language" }).of(language);
  let wrappedRegionInCurrentLocale = "";
  let wrappedRegionInTargetLocale = "";
  if (locale.region) {
    const regionInCurrentLocale = new Intl.DisplayNames([devtoolsLocale.locale], { type: "region", style: "short" }).of(locale.region);
    const regionInTargetLocale = new Intl.DisplayNames([targetLanguage], { type: "region", style: "short" }).of(locale.region);
    wrappedRegionInCurrentLocale = ` (${regionInCurrentLocale})`;
    wrappedRegionInTargetLocale = ` (${regionInTargetLocale})`;
  }
  return `${languageInCurrentLocale}${wrappedRegionInCurrentLocale} - ${languageInTargetLocale}${wrappedRegionInTargetLocale}`;
}

// gen/front_end/core/i18n/time-utilities.js
var time_utilities_exports = {};
__export(time_utilities_exports, {
  formatMicroSecondsAsMillisFixed: () => formatMicroSecondsAsMillisFixed,
  formatMicroSecondsAsMillisFixedExpanded: () => formatMicroSecondsAsMillisFixedExpanded,
  formatMicroSecondsAsSeconds: () => formatMicroSecondsAsSeconds,
  formatMicroSecondsTime: () => formatMicroSecondsTime,
  millisToString: () => millisToString,
  preciseMillisToString: () => preciseMillisToString,
  preciseSecondsToString: () => preciseSecondsToString,
  secondsToString: () => secondsToString
});
import * as Platform from "./../platform/platform.js";
var narrowMillisecondsInteger = defineFormatter({
  style: "unit",
  unit: "millisecond",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
var longMilliseconds = defineFormatter({
  style: "unit",
  unit: "millisecond",
  unitDisplay: "long",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
var narrowMicrosecondsInteger = defineFormatter({
  style: "unit",
  unit: "microsecond",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
var narrowMillisecondsDecimal = defineFormatter({
  style: "unit",
  unit: "millisecond",
  unitDisplay: "narrow",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
var narrowSecondsDecimal = defineFormatter({
  style: "unit",
  unit: "second",
  unitDisplay: "narrow",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
var shortMinutesDecimal = defineFormatter({
  style: "unit",
  unit: "minute",
  unitDisplay: "short",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});
var shortHoursDecimal = defineFormatter({
  style: "unit",
  unit: "hour",
  unitDisplay: "short",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});
var longDaysDecimal = defineFormatter({
  style: "unit",
  unit: "day",
  unitDisplay: "long",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});
function formatMicroSecondsTime(time) {
  return millisToString(Platform.Timing.microSecondsToMilliSeconds(time), true);
}
function formatMicroSecondsAsSeconds(time) {
  const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
  const seconds = Platform.Timing.milliSecondsToSeconds(milliseconds);
  return narrowSecondsDecimal.format(seconds);
}
function formatMicroSecondsAsMillisFixed(time) {
  const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
  return narrowMillisecondsInteger.format(milliseconds);
}
function formatMicroSecondsAsMillisFixedExpanded(time) {
  const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
  return longMilliseconds.format(milliseconds);
}
function millisToString(ms, higherResolution) {
  if (!isFinite(ms)) {
    return "-";
  }
  if (higherResolution && ms < 0.1) {
    return narrowMicrosecondsInteger.format(ms * 1e3);
  }
  if (higherResolution && ms < 1e3) {
    return narrowMillisecondsDecimal.format(ms);
  }
  if (ms < 1e3) {
    return narrowMillisecondsInteger.format(ms);
  }
  const seconds = ms / 1e3;
  if (seconds < 60) {
    return narrowSecondsDecimal.format(seconds);
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return shortMinutesDecimal.format(minutes);
  }
  const hours = minutes / 60;
  if (hours < 24) {
    return shortHoursDecimal.format(hours);
  }
  const days = hours / 24;
  return longDaysDecimal.format(days);
}
var preciseMillisToStringFormattersCache = /* @__PURE__ */ new Map();
function preciseMillisToString(ms, precision = 0, separator) {
  let formatter = preciseMillisToStringFormattersCache.get(precision);
  if (!formatter) {
    formatter = defineFormatter({
      style: "unit",
      unit: "millisecond",
      unitDisplay: "narrow",
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
    preciseMillisToStringFormattersCache.set(precision, formatter);
  }
  return formatter.format(ms, separator);
}
var preciseSecondsToStringFormattersCache = /* @__PURE__ */ new Map();
function preciseSecondsToString(ms, precision = 0) {
  let formatter = preciseSecondsToStringFormattersCache.get(precision);
  if (!formatter) {
    formatter = defineFormatter({
      style: "unit",
      unit: "second",
      unitDisplay: "narrow",
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
    preciseSecondsToStringFormattersCache.set(precision, formatter);
  }
  return formatter.format(ms);
}
function secondsToString(seconds, higherResolution) {
  if (!isFinite(seconds)) {
    return "-";
  }
  return millisToString(seconds * 1e3, higherResolution);
}
export {
  ByteUtilities_exports as ByteUtilities,
  DevToolsLocale_exports as DevToolsLocale,
  NumberFormatter_exports as NumberFormatter,
  time_utilities_exports as TimeUtilities,
  i18nImpl_exports as i18n
};
//# sourceMappingURL=i18n.js.map
