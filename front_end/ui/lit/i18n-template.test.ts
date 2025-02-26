// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as i18nRaw from '../../third_party/i18n/i18n.js';

import {html, i18nTemplate, render} from './lit.js';

describe('i18nTemplate', () => {
  const uiStrings = {placeholder: 'a message with a {string} and {template} placeholder'};
  let i18nInstance: i18nRaw.I18n.I18n;

  beforeEach(() => {
    i18nInstance = new i18nRaw.I18n.I18n(['en-US'], 'en-US');
    i18nInstance.registerLocaleData('en-US', {});
  });

  function setLocale(locale: string) {
    i18n.DevToolsLocale.DevToolsLocale.instance({
      create: true,
      data: {
        settingLanguage: locale,
        navigatorLanguage: locale,
        lookupClosestDevToolsLocale: l => l,
      },
    });
  }

  it('localizes lit templates', () => {
    const strings = i18nInstance.registerFileStrings('test.ts', uiStrings);
    setLocale('en-US');

    const result = i18nTemplate(strings, uiStrings.placeholder, {string: 'STRING', template: html`TEMPLATE`});
    const element = render(result, document.createElement('div'), {host: this});
    assert.deepEqual(
        (element.parentNode as HTMLDivElement).innerText, 'a message with a STRING and TEMPLATE placeholder');
  });

  it('localizes lit templates with translations', () => {
    i18nInstance.registerLocaleData(
        'de', {'test.ts | placeholder': {message: 'a message with a {template} and {string} placeholder'}});
    const strings = i18nInstance.registerFileStrings('test.ts', uiStrings);
    setLocale('de');

    const result = i18nTemplate(strings, uiStrings.placeholder, {string: 'STRING', template: html`TEMPLATE`});
    const element = render(result, document.createElement('div'), {host: this});
    assert.deepEqual(
        (element.parentNode as HTMLDivElement).innerText, 'a message with a TEMPLATE and STRING placeholder');
  });
});
