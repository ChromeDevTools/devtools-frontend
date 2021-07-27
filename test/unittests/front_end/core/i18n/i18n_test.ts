// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as i18n from '../../../../../front_end/core/i18n/i18n.js';
import * as i18nRaw from '../../../../../front_end/third_party/i18n/i18n.js';

import {assertElement} from '../../helpers/DOMHelpers.js';

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

describe('getFormatLocalizedString', () => {
  let i18nInstance: i18nRaw.I18n.I18n;
  beforeEach(() => {
    i18nInstance = new i18nRaw.I18n.I18n();
    i18nInstance.registerLocaleData('en-US', {});  // Always fall back to UIStrings.
  });

  it('returns an HTML element', () => {
    const uiStrings = {simple: 'a simple message'};
    const registeredStrings = i18nInstance.registerFileStrings('test.ts', uiStrings);

    const messageElement = i18n.i18n.getFormatLocalizedString(registeredStrings, uiStrings.simple, {});

    assertElement(messageElement, HTMLElement);
    assert.strictEqual(messageElement.innerText, 'a simple message');
  });

  it('nests HTML placeholders in the message element', () => {
    const uiStrings = {placeholder: 'a message with a {PH1} placeholder'};
    const registeredStrings = i18nInstance.registerFileStrings('test.ts', uiStrings);
    const placeholder = document.createElement('span');
    placeholder.innerText = 'very pretty';

    const messageElement =
        i18n.i18n.getFormatLocalizedString(registeredStrings, uiStrings.placeholder, {PH1: placeholder});

    assertElement(messageElement, HTMLElement);
    assert.strictEqual(messageElement.innerHTML, 'a message with a <span>very pretty</span> placeholder');
  });

  it('nests string placeholders in the message element', () => {
    const uiStrings = {placeholder: 'a message with a {PH1} placeholder'};
    const registeredStrings = i18nInstance.registerFileStrings('test.ts', uiStrings);

    const messageElement =
        i18n.i18n.getFormatLocalizedString(registeredStrings, uiStrings.placeholder, {PH1: 'somewhat nice'});

    assertElement(messageElement, HTMLElement);
    assert.strictEqual(messageElement.innerHTML, 'a message with a somewhat nice placeholder');
  });
});
