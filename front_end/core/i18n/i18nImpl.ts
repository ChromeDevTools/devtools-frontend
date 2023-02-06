// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as I18n from '../../third_party/i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {DevToolsLocale} from './DevToolsLocale.js';
import {
  BUNDLED_LOCALES as BUNDLED_LOCALES_GENERATED,
  DEFAULT_LOCALE,
  LOCAL_FETCH_PATTERN,
  LOCALES,
  REMOTE_FETCH_PATTERN,
} from './locales.js';

import type * as i18nTypes from './i18nTypes.js';

const i18nInstance = new I18n.I18n.I18n(LOCALES, DEFAULT_LOCALE);

// All the locales that are part of the DevTools bundle and should not be fetched
// remotely.
const BUNDLED_LOCALES = new Set<string>([...BUNDLED_LOCALES_GENERATED]);

/**
 * Look up the best available locale for the requested language through these fall backs:
 * - exact match
 * - progressively shorter prefixes (`de-CH-1996` -> `de-CH` -> `de`)
 * - the default locale ('en-US') if no match is found
 *
 * If `locale` isn't provided, the default is used.
 */
export function lookupClosestSupportedDevToolsLocale(locale: string): string {
  return i18nInstance.lookupClosestSupportedLocale(locale);
}

/**
 * Returns a list of all supported DevTools locales, including pseudo locales.
 */
export function getAllSupportedDevToolsLocales(): string[] {
  return [...i18nInstance.supportedLocales];
}

/**
 * Returns the Url from which a locale can be fetched. This depends on the
 * specific locale, as some are bundled with DevTools while others
 * have to be fetched remotely.
 */
function getLocaleFetchUrl(locale: Intl.UnicodeBCP47LocaleIdentifier, location: string): string {
  const remoteBase = Root.Runtime.getRemoteBase(location);
  if (remoteBase && remoteBase.version && !BUNDLED_LOCALES.has(locale)) {
    return REMOTE_FETCH_PATTERN.replace('@HOST@', 'devtools://devtools')
        .replace('@VERSION@', remoteBase.version)
        .replace('@LOCALE@', locale);
  }
  const path = LOCAL_FETCH_PATTERN.replace('@LOCALE@', locale);
  return new URL(path, import.meta.url).toString();
}

/**
 * Fetches the locale data of the specified locale.
 * Callers have to ensure that `locale` is an officilly supported locale.
 * Depending whether a locale is present in `bundledLocales`, the data will be
 * fetched locally or remotely.
 */
export async function fetchAndRegisterLocaleData(
    locale: Intl.UnicodeBCP47LocaleIdentifier, location = self.location.toString()): Promise<void> {
  const localeDataTextPromise = fetch(getLocaleFetchUrl(locale, location)).then(result => result.json());
  const timeoutPromise =
      new Promise((resolve, reject) => window.setTimeout(() => reject(new Error('timed out fetching locale')), 5000));
  const localeData = await Promise.race([timeoutPromise, localeDataTextPromise]);
  i18nInstance.registerLocaleData(locale, localeData);
}

/**
 * Returns an anonymous function that wraps a call to retrieve a localized string.
 * This is introduced so that localized strings can be declared in environments where
 * the i18n system has not been configured and so, cannot be directly invoked. Instead,
 * strings are lazily localized when they are used. This is used for instance in the
 * meta files used to register module extensions.
 */
export function getLazilyComputedLocalizedString(
    registeredStrings: I18n.LocalizedStringSet.RegisteredFileStrings, id: string, values: i18nTypes.Values = {}): () =>
    Platform.UIString.LocalizedString {
  return (): Platform.UIString.LocalizedString => getLocalizedString(registeredStrings, id, values);
}

/**
 * Retrieve the localized string.
 */
export function getLocalizedString(
    registeredStrings: I18n.LocalizedStringSet.RegisteredFileStrings, id: string,
    values: i18nTypes.Values = {}): Platform.UIString.LocalizedString {
  return registeredStrings.getLocalizedStringSetFor(DevToolsLocale.instance().locale).getLocalizedString(id, values) as
      Platform.UIString.LocalizedString;
}

/**
 * Register a file's UIStrings with i18n, return function to generate the string ids.
 */
export function registerUIStrings(
    path: string, stringStructure: {[key: string]: string}): I18n.LocalizedStringSet.RegisteredFileStrings {
  return i18nInstance.registerFileStrings(path, stringStructure);
}

/**
 * Returns a span element that may contains other DOM element as placeholders
 */
export function getFormatLocalizedString(
    registeredStrings: I18n.LocalizedStringSet.RegisteredFileStrings, stringId: string,
    placeholders: Record<string, Object>): Element {
  const formatter =
      registeredStrings.getLocalizedStringSetFor(DevToolsLocale.instance().locale).getMessageFormatterFor(stringId);

  const element = document.createElement('span');
  for (const icuElement of formatter.getAst()) {
    if (icuElement.type === /* argumentElement */ 1) {
      const placeholderValue = placeholders[icuElement.value];
      if (placeholderValue) {
        element.append(placeholderValue as Node | string);
      }
    } else if ('value' in icuElement) {
      element.append(String(icuElement.value));
    }
  }
  return element;
}

export function serializeUIString(string: string, values: Record<string, Object> = {}): string {
  const serializedMessage = {string, values};
  return JSON.stringify(serializedMessage);
}

export function deserializeUIString(serializedMessage: string): i18nTypes.SerializedMessage {
  if (!serializedMessage) {
    return {string: '', values: {}} as i18nTypes.SerializedMessage;
  }

  return JSON.parse(serializedMessage) as i18nTypes.SerializedMessage;
}

/**
 * Use this function in places where a `LocalizedString` is expected but the
 * term/phrase you want to use does not require translation.
 */
export function lockedString(str: string): Platform.UIString.LocalizedString {
  return str as Platform.UIString.LocalizedString;
}

/**
 * Same as `lockedString` but for places where `i18nLazyString` would be used otherwise.
 */
export function lockedLazyString(str: string): () => Platform.UIString.LocalizedString {
  return (): Platform.UIString.LocalizedString => str as Platform.UIString.LocalizedString;
}

/**
 * Returns a string of the form:
 *   "German (Austria) - Deutsch (Österreich)"
 * where the former locale representation is written in the currently enabled DevTools
 * locale and the latter locale representation is written in the locale of `localeString`.
 *
 * Should the two locales match (i.e. have the same language) then the latter locale
 * representation is written in English.
 */
export function getLocalizedLanguageRegion(
    localeString: Intl.UnicodeBCP47LocaleIdentifier,
    devtoolsLocale: DevToolsLocale): Platform.UIString.LocalizedString {
  const locale = new Intl.Locale(localeString);
  Platform.DCHECK(() => locale.language !== undefined);
  Platform.DCHECK(() => locale.baseName !== undefined);
  const localLanguage = locale.language || 'en';
  const localBaseName = locale.baseName || 'en-US';
  const devtoolsLoc = new Intl.Locale(devtoolsLocale.locale);
  const targetLanguage = localLanguage === devtoolsLoc.language ? 'en' : localBaseName;
  const languageInCurrentLocale = new Intl.DisplayNames([devtoolsLocale.locale], {type: 'language'}).of(localLanguage);
  const languageInTargetLocale = new Intl.DisplayNames([targetLanguage], {type: 'language'}).of(localLanguage);

  let wrappedRegionInCurrentLocale = '';
  let wrappedRegionInTargetLocale = '';

  if (locale.region) {
    const regionInCurrentLocale =
        new Intl.DisplayNames([devtoolsLocale.locale], {type: 'region', style: 'short'}).of(locale.region);
    const regionInTargetLocale =
        new Intl.DisplayNames([targetLanguage], {type: 'region', style: 'short'}).of(locale.region);
    wrappedRegionInCurrentLocale = ` (${regionInCurrentLocale})`;
    wrappedRegionInTargetLocale = ` (${regionInTargetLocale})`;
  }

  return `${languageInCurrentLocale}${wrappedRegionInCurrentLocale} - ${languageInTargetLocale}${
             wrappedRegionInTargetLocale}` as Platform.UIString.LocalizedString;
}
