// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';

let devToolsLocaleInstance: DevToolsLocale|null = null;

type DevToolsLocaleCreationOptions = {
  create: true,
  languageSetting: Common.Settings.Setting<string>,
  navigatorLanguage: string,
}|{
  create: false,
};

/**
 * Simple class that determines the DevTools locale based on:
 *   1) navigator.language, which matches the Chrome UI
 *   2) and the value of the "language" Setting the user chose
 *
 * The DevTools locale is only determined once during startup and
 * guaranteed to never change. Use this class when using
 * `Intl` APIs.
 */
export class DevToolsLocale {
  readonly locale: string;

  private constructor(languageSetting: Common.Settings.Setting<string>, navigatorLanguage: string) {
    const userSelectedLanguage = languageSetting.get();
    // TODO(crbug.com/1163928): Use constant once setting actually exists.
    if (userSelectedLanguage === 'browserLanguage') {
      this.locale = navigatorLanguage || 'en-US';
    } else {
      this.locale = userSelectedLanguage;
    }
  }

  static instance(opts: DevToolsLocaleCreationOptions = {create: false}): DevToolsLocale {
    if (!devToolsLocaleInstance && !opts.create) {
      throw new Error('No LanguageSelector instance exists yet.');
    }

    if (opts.create) {
      devToolsLocaleInstance = new DevToolsLocale(opts.languageSetting, opts.navigatorLanguage);
    }
    return devToolsLocaleInstance as DevToolsLocale;
  }
}
