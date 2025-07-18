// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';

import * as i18n from './i18n.js';

describeWithLocale('NumberFormatter', () => {
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

  const {defineFormatter} = i18n.NumberFormatter;

  it('ensures a space is present for locales that do not add one by default', () => {
    // German does not add a space between the number and the unit.
    i18n.DevToolsLocale.DevToolsLocale.instance({
      create: true,
      data: {
        navigatorLanguage: 'de',
        settingLanguage: 'de',
        lookupClosestDevToolsLocale: l => l,
      },
    });
    const formatter = defineFormatter({
      style: 'unit',
      unit: 'byte',
      unitDisplay: 'narrow',
    });
    assert.strictEqual(formatter.format(50), '50\xA0B');
  });

  it('replaces an existing space with a non-breaking space', () => {
    // English adds a space.
    i18n.DevToolsLocale.DevToolsLocale.instance({
      create: true,
      data: {
        navigatorLanguage: 'en-US',
        settingLanguage: 'en-US',
        lookupClosestDevToolsLocale: l => l,
      },
    });
    const formatter = defineFormatter({
      style: 'unit',
      unit: 'byte',
      unitDisplay: 'narrow',
    });
    assert.strictEqual(formatter.format(50), '50\xA0B');
  });

  it('ensures a space is present for milliseconds', () => {
    const formatter = defineFormatter({
      style: 'unit',
      unit: 'millisecond',
      unitDisplay: 'narrow',
    });
    assert.strictEqual(formatter.format(50), '50\xA0ms');
  });

  it('uses a custom separator if provided', () => {
    let formatter = defineFormatter({style: 'unit', unit: 'byte', unitDisplay: 'narrow'});
    assert.strictEqual(formatter.format(50, ' '), '50 B');

    formatter = defineFormatter({
      style: 'unit',
      unit: 'millisecond',
      unitDisplay: 'narrow',
    });

    assert.strictEqual(formatter.format(500, ' '), '500 ms');
    assert.strictEqual(formatter.format(500, '    '), '500    ms');
  });

  it('does nothing when there is no unit', () => {
    i18n.DevToolsLocale.DevToolsLocale.instance({
      create: true,
      data: {navigatorLanguage: 'en-US', settingLanguage: 'en-US', lookupClosestDevToolsLocale: l => l}
    });
    const formatter = defineFormatter({
      style: 'decimal',
    });
    assert.strictEqual(formatter.format(5000), '5,000');
  });
});
