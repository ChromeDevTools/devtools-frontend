// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as I18n from '../../core/i18n/i18n.js';
import * as i18nRaw from '../../third_party/i18n/i18n.js';

import * as uiI18n from './i18n.js';

describe('getFormatLocalizedString', () => {
  let i18nInstance: i18nRaw.I18n.I18n;
  beforeEach(() => {
    I18n.DevToolsLocale.DevToolsLocale.instance({
      create: true,
      data: {
        navigatorLanguage: 'en-US',
        settingLanguage: 'en-US',
        lookupClosestDevToolsLocale: () => 'en-US',
      },
    });
    i18nInstance = new i18nRaw.I18n.I18n(['en-US'], 'en-US');
    i18nInstance.registerLocaleData('en-US', {});  // Always fall back to UIStrings.
  });

  it('returns an HTML element', () => {
    const uiStrings = {simple: 'a simple message'};
    const registeredStrings = i18nInstance.registerFileStrings('test.ts', uiStrings);

    const messageElement = uiI18n.getFormatLocalizedString(registeredStrings, uiStrings.simple, {});

    // assert.instanceOf(messageElement, HTMLElement);
    assert.strictEqual(messageElement.innerText, 'a simple message');
  });

  it('nests HTML placeholders in the message element', () => {
    const uiStrings = {placeholder: 'a message with a {PH1} placeholder'};
    const registeredStrings = i18nInstance.registerFileStrings('test.ts', uiStrings);
    const placeholder = document.createElement('span');
    placeholder.innerText = 'very pretty';

    const messageElement =
        uiI18n.getFormatLocalizedString(registeredStrings, uiStrings.placeholder, {PH1: placeholder});

    // assert.instanceOf(messageElement, HTMLElement);
    assert.strictEqual(messageElement.innerHTML, 'a message with a <span>very pretty</span> placeholder');
  });

  it('nests string placeholders in the message element', () => {
    const uiStrings = {placeholder: 'a message with a {PH1} placeholder'};
    const registeredStrings = i18nInstance.registerFileStrings('test.ts', uiStrings);

    const messageElement =
        uiI18n.getFormatLocalizedString(registeredStrings, uiStrings.placeholder, {PH1: 'somewhat nice'});

    // assert.instanceOf(messageElement, HTMLElement);
    assert.strictEqual(messageElement.innerHTML, 'a message with a somewhat nice placeholder');
  });
});
