// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18nRaw from '../../third_party/i18n/i18n.js';

import * as i18n from './i18n.js';

describe('serializeUIString', () => {
  it('serializes strings without placeholders', () => {
    const output = i18n.i18n.serializeUIString('foo');
    assert.deepEqual(output, JSON.stringify({
      string: 'foo',
      values: {},
    }));
  });

  it('serializes strings with placeholder values', () => {
    const output = i18n.i18n.serializeUIString('a string', {PH1: 'value1', PH2: 'value2'});
    assert.deepEqual(output, JSON.stringify({
      string: 'a string',
      values: {PH1: 'value1', PH2: 'value2'},
    }));
  });
});

describe('deserializeUIString', () => {
  it('returns an empty object for an empty string input', () => {
    const output = i18n.i18n.deserializeUIString('');
    assert.deepEqual(output, {string: '', values: {}});
  });

  it('deserializes correctly for a string with no placeholders', () => {
    const output = i18n.i18n.deserializeUIString('{"string":"foo", "values":{}}');
    assert.deepEqual(output, {string: 'foo', values: {}});
  });

  it('deserializes correctly for a string with placeholders', () => {
    const output = i18n.i18n.deserializeUIString('{"string":"foo", "values":{"PH1": "value1"}}');
    assert.deepEqual(output, {string: 'foo', values: {PH1: 'value1'}});
  });
});

describe('serialize/deserialize round-trip', () => {
  it('returns a matching input/output', () => {
    const inputString = 'a string';
    const serializedString = i18n.i18n.serializeUIString(inputString);
    const deserializedString = i18n.i18n.deserializeUIString(serializedString);
    assert.deepEqual(deserializedString, {
      string: inputString,
      values: {},
    });
  });
});

describe('getLocalizedLanguageRegion', () => {
  function createMockDevToolsLocale(locale: string): i18n.DevToolsLocale.DevToolsLocale {
    return {locale, forceFallbackLocale: () => {}} as i18n.DevToolsLocale.DevToolsLocale;
  }

  it('build the correct language/region string', () => {
    assert.strictEqual(
        i18n.i18n.getLocalizedLanguageRegion('de-AT', createMockDevToolsLocale('en-US')),
        'German (Austria) - Deutsch (Österreich)');
    assert.strictEqual(
        i18n.i18n.getLocalizedLanguageRegion('de', createMockDevToolsLocale('en-US')), 'German - Deutsch');
    assert.strictEqual(
        i18n.i18n.getLocalizedLanguageRegion('en-US', createMockDevToolsLocale('de')), 'Englisch (USA) - English (US)');
  });

  it('uses english for the target locale if the languages match', () => {
    assert.strictEqual(
        i18n.i18n.getLocalizedLanguageRegion('de-AT', createMockDevToolsLocale('de')),
        'Deutsch (Österreich) - German (Austria)');
    assert.strictEqual(i18n.i18n.getLocalizedLanguageRegion('de', createMockDevToolsLocale('de')), 'Deutsch - German');
  });
});

describe('falling back when a locale errors', () => {
  it('reverts to using the UIStrings directly', async () => {
    i18n.DevToolsLocale.DevToolsLocale.instance({
      create: true,
      data: {
        // Create the locale and set en-GB to default. This test is going to
        // assert that when there is an error with the en-GB string that we
        // fallback.
        navigatorLanguage: 'en-GB',
        settingLanguage: 'en-GB',
        lookupClosestDevToolsLocale: () => 'en-GB',
      },
    });
    const i18nInstance = new i18nRaw.I18n.I18n(['en-GB', 'en-US'], 'en-US');

    // Recreate the bug that can happen in Canary: the en-US translation is up
    // to date (no PH1 placeholder), but the en-GB translation is out of date.
    // We expect that in this instance we should fallback to en-US.
    i18nInstance.registerLocaleData('en-US', {
      'test.ts | placeholder': {message: 'US: hello world'},
    });
    // Register the (outdated) en-GB string.
    i18nInstance.registerLocaleData('en-GB', {
      'test.ts | placeholder': {message: 'GB: hello {PH1}'},
    });

    const uiStrings = {placeholder: 'US: hello world'};
    const registeredStrings = i18nInstance.registerFileStrings('test.ts', uiStrings);

    // We should see "hello world" because we don't pass the placeholder value,
    // and that means the en-GB translations are invalid, and we fallback to
    // the UIStrings.
    const output = i18n.i18n.getLocalizedString(registeredStrings, uiStrings.placeholder);
    assert.strictEqual(output, 'US: hello world');
  });
});
