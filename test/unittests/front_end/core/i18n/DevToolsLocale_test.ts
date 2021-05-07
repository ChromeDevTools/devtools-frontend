// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as i18n from '../../../../../front_end/core/i18n/i18n.js';

describe('DevToolsLocale', () => {
  // For tests, we assume DevTools supports all locales we throw at it.
  // Finding the closes supported locale is implemented in the i18n lib and tested as part of that lib.
  const identity = (locale: string) => locale;

  it('chooses navigator.language if setting is "browserLanguage"', () => {
    const data: i18n.DevToolsLocale.DevToolsLocaleData = {
      settingLanguage: 'browserLanguage',
      navigatorLanguage: 'en-GB',
      lookupClosestDevToolsLocale: identity,
    };
    const devToolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance({create: true, data});

    assert.strictEqual(devToolsLocale.locale, 'en-GB');
  });

  it('chooses setting language if setting has any other value than "browserLanguage"', () => {
    const data: i18n.DevToolsLocale.DevToolsLocaleData = {
      settingLanguage: 'zh',
      navigatorLanguage: 'en-GB',
      lookupClosestDevToolsLocale: identity,
    };
    const devToolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance({create: true, data});

    assert.strictEqual(devToolsLocale.locale, 'zh');
  });

  it('falls back to en-US should navigator.language be empty', () => {
    const data: i18n.DevToolsLocale.DevToolsLocaleData = {
      settingLanguage: 'browserLanguage',
      navigatorLanguage: '',
      lookupClosestDevToolsLocale: identity,
    };
    const devToolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance({create: true, data});

    assert.strictEqual(devToolsLocale.locale, 'en-US');
  });
});
