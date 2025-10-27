"use strict";
import * as I18n from "../../third_party/i18n/i18n.js";
import * as Root from "../root/root.js";
import { DevToolsLocale } from "./DevToolsLocale.js";
import {
  BUNDLED_LOCALES as BUNDLED_LOCALES_GENERATED,
  DEFAULT_LOCALE,
  LOCAL_FETCH_PATTERN,
  LOCALES,
  REMOTE_FETCH_PATTERN
} from "./locales.js";
const i18nInstance = new I18n.I18n.I18n(LOCALES, DEFAULT_LOCALE);
const BUNDLED_LOCALES = /* @__PURE__ */ new Set([...BUNDLED_LOCALES_GENERATED]);
export function lookupClosestSupportedDevToolsLocale(locale) {
  return i18nInstance.lookupClosestSupportedLocale(locale);
}
export function getAllSupportedDevToolsLocales() {
  return [...i18nInstance.supportedLocales];
}
function getLocaleFetchUrl(locale, location) {
  const remoteBase = Root.Runtime.getRemoteBase(location);
  if (remoteBase?.version && !BUNDLED_LOCALES.has(locale)) {
    return REMOTE_FETCH_PATTERN.replace("@HOST@", "devtools://devtools").replace("@VERSION@", remoteBase.version).replace("@LOCALE@", locale);
  }
  const path = LOCAL_FETCH_PATTERN.replace("@LOCALE@", locale);
  return new URL(path, import.meta.url).toString();
}
export async function fetchAndRegisterLocaleData(locale, location = self.location.toString()) {
  const localeDataTextPromise = fetch(getLocaleFetchUrl(locale, location)).then((result) => result.json());
  const timeoutPromise = new Promise((_, reject) => window.setTimeout(() => reject(new Error("timed out fetching locale")), 5e3));
  const localeData = await Promise.race([timeoutPromise, localeDataTextPromise]);
  i18nInstance.registerLocaleData(locale, localeData);
}
export function hasLocaleDataForTest(locale) {
  return i18nInstance.hasLocaleDataForTest(locale);
}
export function resetLocaleDataForTest() {
  i18nInstance.resetLocaleDataForTest();
}
export function registerLocaleDataForTest(locale, messages) {
  i18nInstance.registerLocaleData(locale, messages);
}
export function getLazilyComputedLocalizedString(registeredStrings, id, values = {}) {
  return () => getLocalizedString(registeredStrings, id, values);
}
export function getLocalizedString(registeredStrings, id, values = {}) {
  return registeredStrings.getLocalizedStringSetFor(DevToolsLocale.instance().locale).getLocalizedString(id, values);
}
export function registerUIStrings(path, stringStructure) {
  return i18nInstance.registerFileStrings(path, stringStructure);
}
export function getFormatLocalizedString(registeredStrings, stringId, placeholders) {
  const formatter = registeredStrings.getLocalizedStringSetFor(DevToolsLocale.instance().locale).getMessageFormatterFor(stringId);
  const element = document.createElement("span");
  for (const icuElement of formatter.getAst()) {
    if (icuElement.type === /* argumentElement */
    1) {
      const placeholderValue = placeholders[icuElement.value];
      if (placeholderValue) {
        element.append(placeholderValue);
      }
    } else if ("value" in icuElement) {
      element.append(String(icuElement.value));
    }
  }
  return element;
}
export function serializeUIString(string, values = {}) {
  const serializedMessage = { string, values };
  return JSON.stringify(serializedMessage);
}
export function deserializeUIString(serializedMessage) {
  if (!serializedMessage) {
    return { string: "", values: {} };
  }
  return JSON.parse(serializedMessage);
}
export function lockedString(str) {
  return str;
}
export function lockedLazyString(str) {
  return () => str;
}
export function getLocalizedLanguageRegion(localeString, devtoolsLocale) {
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
//# sourceMappingURL=i18nImpl.js.map
