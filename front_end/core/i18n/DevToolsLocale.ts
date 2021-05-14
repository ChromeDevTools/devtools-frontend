// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

let devToolsLocaleInstance: DevToolsLocale|null = null;

export interface DevToolsLocaleData {
  settingLanguage: string;
  navigatorLanguage: string;
  lookupClosestDevToolsLocale: (locale: string) => string;
}

export type DevToolsLocaleCreationOptions = {
  create: true,
  data: DevToolsLocaleData,
}|{
  create: false,
};

/**
 * Simple class that determines the DevTools locale based on:
 *   1) navigator.language, which matches the Chrome UI
 *   2) the value of the "language" Setting the user choses
 *   3) available locales in DevTools.
 *
 * The DevTools locale is only determined once during startup and
 * guaranteed to never change. Use this class when using
 * `Intl` APIs.
 */
export class DevToolsLocale {
  readonly locale: string;

  private constructor(data: DevToolsLocaleData) {
    // TODO(crbug.com/1163928): Use constant once setting actually exists.
    if (data.settingLanguage === 'browserLanguage') {
      this.locale = data.navigatorLanguage || 'en-US';
    } else {
      this.locale = data.settingLanguage;
    }

    this.locale = data.lookupClosestDevToolsLocale(this.locale);
  }

  static instance(opts: DevToolsLocaleCreationOptions = {create: false}): DevToolsLocale {
    if (!devToolsLocaleInstance && !opts.create) {
      throw new Error('No LanguageSelector instance exists yet.');
    }

    if (opts.create) {
      devToolsLocaleInstance = new DevToolsLocale(opts.data);
    }
    return devToolsLocaleInstance as DevToolsLocale;
  }
}
