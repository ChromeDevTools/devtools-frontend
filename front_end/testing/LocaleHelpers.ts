// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {afterEach, beforeEach} from 'mocha';

import * as i18n from '../core/i18n/i18n.js';

// The build generates en-US.json from all UIStrings. A non-literal import
// specifier keeps TypeScript from reading it, so a change to a UI string does
// not type-check this module again.
const EN_US_LOCALE_DATA_URL = '../core/i18n/locales/en-US.json';

export async function initializeGlobalLocaleVars(): Promise<void> {
  // Expose the locale.
  i18n.DevToolsLocale.DevToolsLocale.instance({
    create: true,
    data: {
      navigatorLanguage: 'en-US',
      settingLanguage: 'en-US',
      lookupClosestDevToolsLocale: () => 'en-US',
    },
  });

  if (i18n.i18n.hasLocaleDataForTest('en-US')) {
    return;
  }

  const {default: enUsLocaleData} = await import(EN_US_LOCALE_DATA_URL, {with: {type: 'json'}});
  i18n.i18n.registerLocaleDataForTest('en-US', enUsLocaleData);
}

export function deinitializeGlobalLocaleVars(): void {
  i18n.DevToolsLocale.DevToolsLocale.removeInstance();
}

export function setupLocaleHooks(): void {
  beforeEach(async () => await initializeGlobalLocaleVars());
  afterEach(deinitializeGlobalLocaleVars);
}
