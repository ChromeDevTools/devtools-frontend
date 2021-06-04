// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line
import i18nBundle from '../../third_party/i18n/i18n-bundle.js';
// eslint-disable-next-line
import type {IntlMessageFormat} from '../../third_party/intl-messageformat/package/lib/index.js';

import type * as Platform from '../platform/platform.js';
import {DevToolsLocale} from './DevToolsLocale.js';

const EMPTY_VALUES_OBJECT = {};

/**
 * `LocalizedStringSet` is a small wrapper class
 * around the Lighthouse i18n library. It caches translated strings and
 * string formatters, depending whether the string contains placeholders.
 *
 * This is possible in DevTools since the DevTools locale is choosen once
 * at startup and doesn't change over time.
 *
 * Please not that the lifetimes are not straight-forward. Callers of
 * `getLocalizedString` have to make sure themselves that `DevToolsLocale`
 * has been initialized and locale data for the choosen locale was loaded.
 */
export class LocalizedStringSet {
  private icuMessageFn?: (id: string, values: Object) => Platform.UIString.LocalizedString;

  private cachedSimpleStrings = new Map<string, Platform.UIString.LocalizedString>();
  private cachedMessageFormatters = new Map<string, IntlMessageFormat>();

  constructor(private path: string, private stringStructure: {[key: string]: string}) {
    // We are not creating `icuMessageFn` in the constructor, as the constructor is called by
    // `registerUIStrings` at module instantiation time. This triggers formatting of all en-US
    // strings to prepare fallbacks and we want to delay that work until the first time a
    // localized string of any given file is needed.
  }

  getIcuMessage(id: string, value: Object): Platform.UIString.LocalizedString {
    if (!this.icuMessageFn) {
      this.icuMessageFn = i18nBundle.createIcuMessageFn(this.path, this.stringStructure) as (
                              id: string, values: Object) => Platform.UIString.LocalizedString;
    }

    try {
      return this.icuMessageFn(id, value);
    } catch (e) {
      return id as Platform.UIString.LocalizedString;
    }
  }

  getLocalizedString(id: string, values: Object = EMPTY_VALUES_OBJECT): Platform.UIString.LocalizedString {
    if (values === EMPTY_VALUES_OBJECT || Object.keys(values).length === 0) {
      return this.getSimpleLocalizedString(id);
    }
    return this.getFormattedLocalizeString(id, values);
  }

  private getSimpleLocalizedString(id: string): Platform.UIString.LocalizedString {
    const cachedSimpleString = this.cachedSimpleStrings.get(id);
    if (cachedSimpleString) {
      return cachedSimpleString;
    }

    const icuMessage = this.getIcuMessage(id, EMPTY_VALUES_OBJECT);
    const translatedString =
        i18nBundle.getFormatted(icuMessage, DevToolsLocale.instance().locale) as Platform.UIString.LocalizedString;
    this.cachedSimpleStrings.set(id, translatedString);
    return translatedString;
  }

  private getFormattedLocalizeString(id: string, values: Object): Platform.UIString.LocalizedString {
    let formatter = this.cachedMessageFormatters.get(id);
    if (!formatter) {
      const icuMessage = this.getIcuMessage(id, values);
      formatter = i18nBundle.getFormatter(icuMessage, DevToolsLocale.instance().locale) as IntlMessageFormat;
      this.cachedMessageFormatters.set(id, formatter);
    }

    const preformattedValues = i18nBundle._preformatValues(id, formatter, values, '');
    return formatter.format(preformattedValues) as Platform.UIString.LocalizedString;
  }
}
