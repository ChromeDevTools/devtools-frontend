// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as i18n from '../../../../../front_end/core/i18n/i18n.js';

describe('DevToolsLocale', () => {
  // For tests, we assume DevTools supports all locales we throw at it.
  // Finding the closes supported locale is implemented in the i18n lib and tested as part of that lib.
  const identity = (locale: string) => locale;

  after(() => {
    // Reset the singleton after the test suite for other tests.
    const data: i18n.DevToolsLocale.DevToolsLocaleData = {
      settingLanguage: 'en-US',
      navigatorLanguage: '',
      lookupClosestDevToolsLocale: identity,
    };
    i18n.DevToolsLocale.DevToolsLocale.instance({create: true, data});
  });

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

  it('chooses the closest supported language', () => {
    const data: i18n.DevToolsLocale.DevToolsLocaleData = {
      settingLanguage: 'zh-HK',
      navigatorLanguage: '',
      lookupClosestDevToolsLocale: () => 'zh',
    };
    const devToolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance({create: true, data});

    assert.strictEqual(devToolsLocale.locale, 'zh');
  });

  describe('forceFallbackLocale', () => {
    it('sets locale to English', () => {
      const data: i18n.DevToolsLocale.DevToolsLocaleData = {
        settingLanguage: 'browserLanguage',
        navigatorLanguage: 'en-GB',
        lookupClosestDevToolsLocale: identity,
      };
      const devToolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance({create: true, data});
      assert.strictEqual(devToolsLocale.locale, 'en-GB');

      devToolsLocale.forceFallbackLocale();
      assert.strictEqual(devToolsLocale.locale, 'en-US');
    });
  });

  describe('languageIsSupportedByDevTools', () => {
    it('returns true if the locale is supported, false otherwise', () => {
      const data: i18n.DevToolsLocale.DevToolsLocaleData = {
        settingLanguage: 'zh-HK',
        navigatorLanguage: '',
        lookupClosestDevToolsLocale: () => 'zh',
      };
      const devToolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance({create: true, data});

      assert.isTrue(devToolsLocale.languageIsSupportedByDevTools('zh-HK'));
      assert.isFalse(devToolsLocale.languageIsSupportedByDevTools('de-DE'));
    });
  });
});

describe('localeLanguagesMatch', () => {
  it('returns true if the language part of a locale matches, false otherwise', () => {
    assert.isTrue(i18n.DevToolsLocale.localeLanguagesMatch('de-DE', 'de-AT'));
    assert.isTrue(i18n.DevToolsLocale.localeLanguagesMatch('de-DE', 'de'));

    assert.isFalse(i18n.DevToolsLocale.localeLanguagesMatch('de', 'en'));
    assert.isFalse(i18n.DevToolsLocale.localeLanguagesMatch('de-AT', 'en-US'));
  });
});
