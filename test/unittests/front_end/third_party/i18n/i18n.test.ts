// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as i18n from '../../../../../front_end/third_party/i18n/i18n.js';

describe('i18n', () => {
  let i18nInstance: i18n.I18n.I18n;
  beforeEach(() => {
    i18nInstance = new i18n.I18n.I18n(['en-US', 'de-DE'], 'en-US');  // A fresh instance for each test.
  });

  function stringSetWith(
      file: string, uiStrings: i18n.I18n.UIStrings, locale: string): i18n.LocalizedStringSet.LocalizedStringSet {
    const registeredStrings = i18nInstance.registerFileStrings(file, uiStrings);
    return registeredStrings.getLocalizedStringSetFor(locale);
  }

  it('should throw an error when no locale data is registered for the requested locale', () => {
    const uiStrings = {key: 'string to translate'};
    const registeredStrings = i18nInstance.registerFileStrings('test.ts', uiStrings);

    assert.throws(() => registeredStrings.getLocalizedStringSetFor('en-US'), /en-US/);
  });

  it('should throw an error when a requested message is not part of the UIStrings string structure', () => {
    i18nInstance.registerLocaleData('en-US', {'test.ts | foo': {message: 'string to translate'}});
    const uiStrings = {};
    const stringSet = stringSetWith('test.ts', uiStrings, 'en-US');

    assert.throws(() => stringSet.getLocalizedString('string to translate'));
  });

  it('should provide the correct translation if its available', () => {
    i18nInstance.registerLocaleData('de-DE', {'test.ts | foo': {message: 'a german foo'}});
    const uiStrings = {foo: 'an english foo'};
    const stringSet = stringSetWith('test.ts', uiStrings, 'de-DE');

    const translatedString = stringSet.getLocalizedString(uiStrings.foo);

    assert.strictEqual(translatedString, 'a german foo');
  });

  it('should provide the correct translation with placeholders', () => {
    i18nInstance.registerLocaleData('de-DE', {'test.ts | foo': {message: 'a {PH1} german message'}});
    const uiStrings = {foo: 'a {PH1} english message'};
    const stringSet = stringSetWith('test.ts', uiStrings, 'de-DE');

    const translatedString = stringSet.getLocalizedString(uiStrings.foo, {PH1: 'nice'});

    assert.strictEqual(translatedString, 'a nice german message');
  });

  it('should fall back to the UIStrings message when no translation is available', () => {
    i18nInstance.registerLocaleData('de-DE', {});  // Simulate string not yet translated to German.
    const uiStrings = {foo: 'an english foo'};
    const stringSet = stringSetWith('test.ts', uiStrings, 'de-DE');

    const translatedString = stringSet.getLocalizedString(uiStrings.foo);

    assert.strictEqual(translatedString, uiStrings.foo);
  });

  it('should fall back to the UIStrings message when the placeholder of a translation doesn\'t match the UIStrings placeholder',
     () => {
       i18nInstance.registerLocaleData(
           'de-DE', {'test.ts | foo': {message: 'German message with old placeholder {PH_OLD}'}});
       const uiStrings = {foo: 'Message with a new placeholder {PH_NEW}'};
       const stringSet = stringSetWith('test.ts', uiStrings, 'de-DE');

       const translatedString = stringSet.getLocalizedString(uiStrings.foo, {PH_NEW: 'PH_NEW'});

       assert.strictEqual(translatedString, 'Message with a new placeholder PH_NEW');
     });

  it('should provide the same translation for repeated calls, but substitute placeholders correctly', () => {
    i18nInstance.registerLocaleData('de-DE', {
      'test.ts | foo': {message: 'a german message'},
      'test.ts | bar': {message: 'a german placeholder: {PH1}'},
    });
    const uiStrings = {
      foo: 'a english message',
      bar: 'a english placeholder: {PH1}',
    };
    const stringSet = stringSetWith('test.ts', uiStrings, 'de-DE');

    const foo1 = stringSet.getLocalizedString(uiStrings.foo);
    const foo2 = stringSet.getLocalizedString(uiStrings.foo);
    const bar1 = stringSet.getLocalizedString(uiStrings.bar, {PH1: 'ok'});
    const bar2 = stringSet.getLocalizedString(uiStrings.bar, {PH1: 'nice'});

    assert.strictEqual(foo1, 'a german message');
    assert.strictEqual(foo2, 'a german message');
    assert.strictEqual(bar1, 'a german placeholder: ok');
    assert.strictEqual(bar2, 'a german placeholder: nice');
  });

  describe('placeholder formatting', () => {
    beforeEach(() => {
      i18nInstance.registerLocaleData('en-US', {});  // Always fall-through to UIStrings.
    });

    it('should throw an error when values are needed but not provided', () => {
      const uiStrings = {foo: 'message with {PH1}'};
      const stringSet = stringSetWith('test.ts', uiStrings, 'en-US');

      assert.throws(() => stringSet.getLocalizedString(uiStrings.foo), /message with \{PH1\}/);
    });

    it('should throw an error when a value is missing', () => {
      const uiStrings = {foo: 'message {PH1} with {PH2}'};
      const stringSet = stringSetWith('test.ts', uiStrings, 'en-US');

      assert.throws(() => stringSet.getLocalizedString(uiStrings.foo, {PH1: 'bar'}), /message \{PH1\} with \{PH2\}/);
    });

    it('should format a message with plurals', () => {
      const uiStrings = {plural: '{count, plural, =1 {1 row} other {# rows}}'};
      const stringSet = stringSetWith('test.ts', uiStrings, 'en-US');

      const pluralString1 = stringSet.getLocalizedString(uiStrings.plural, {count: 1});
      const pluralString3 = stringSet.getLocalizedString(uiStrings.plural, {count: 3});

      assert.strictEqual(pluralString1, '1 row');
      assert.strictEqual(pluralString3, '3 rows');
    });

    it('should throw an error when a plural control value is missing', () => {
      const uiStrings = {plural: '{count, plural, =1 {1 row} other {# rows}}'};
      const stringSet = stringSetWith('test.ts', uiStrings, 'en-US');

      assert.throws(() => stringSet.getLocalizedString(uiStrings.plural));
    });

    it('should allow nested placeholders in message with plurals', () => {
      const uiStrings = {plural: '{count, plural, =1 {1 row in {item}} other {# rows in {item}}}'};
      const stringSet = stringSetWith('test.ts', uiStrings, 'en-US');

      const pluralString1 = stringSet.getLocalizedString(uiStrings.plural, {count: 1, item: 'table'});
      const pluralString3 = stringSet.getLocalizedString(uiStrings.plural, {count: 3, item: 'page'});

      assert.strictEqual(pluralString1, '1 row in table');
      assert.strictEqual(pluralString3, '3 rows in page');
    });
  });

  describe('locales', () => {
    it('should provide the exact locale if it is supported', () => {
      const instance = new i18n.I18n.I18n(['en-US', 'de-DE'], 'en-US');

      assert.strictEqual(instance.lookupClosestSupportedLocale('de-DE'), 'de-DE');
    });

    it('should provide the closest related locale if its not supported', () => {
      const instance = new i18n.I18n.I18n(['en-US', 'de'], 'en-US');

      assert.strictEqual(instance.lookupClosestSupportedLocale('de-AT'), 'de');
    });

    it('should provide the default locale if no closely related locale was found', () => {
      const instance = new i18n.I18n.I18n(['en-US'], 'en-US');

      assert.strictEqual(instance.lookupClosestSupportedLocale('de-AT'), 'en-US');
    });
  });
});
