// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../root/root.js';

/**
 * @interface
 */
class LighthousePort {  // eslint-disable-line
  /**
   * @param {!string} eventName, 'message', 'close'
   * @param {function(string|undefined):void} cb
   */
  on(eventName, cb) {
  }

  /**
   * @param {string} message
   */
  send(message) {
  }

  close() {
  }
}

/**
 * @implements {LighthousePort}
 * @unrestricted
 */
class LighthouseService {  // eslint-disable-line
  /**
   * @override
   * @param {function(string,!Object=):void} notify
   */
  setNotify(notify) {
    this._notify = notify;
  }

  /**
   * @param {*} params
   * @return {!Promise<*>}
   */
  start(params) {
    if (Root.Runtime.Runtime.queryParam('isUnderTest')) {
      this._disableLoggingForTest();
      params.flags.maxWaitForLoad = 2 * 1000;
    }

    // @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
    self.listenForStatus(message => {
      this.statusUpdate(message[1]);
    });

    return this.fetchLocaleData(params.locales)
        .then(locale => {
          const flags = params.flags;
          flags.logLevel = flags.logLevel || 'info';
          flags.channel = 'devtools';
          flags.locale = locale;

          // @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
          const connection = self.setUpWorkerConnection(this);
          // @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
          const config = self.createConfig(params.categoryIDs, flags.emulatedFormFactor);
          const url = params.url;

          // @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
          return self.runLighthouse(url, flags, config, connection);
        })
        .then(result => {
          // Keep all artifacts on the result, no trimming
          return result;
        })
        .catch(err => ({
                 fatal: true,
                 message: err.message,
                 stack: err.stack,
               }));
  }

  /**
   * @param {string[]} locales
   * @return {!Promise<(string|undefined)>}
   */
  async fetchLocaleData(locales) {
    // @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
    const locale = self.lookupLocale(locales);

    // If the locale is en-US, no need to fetch locale data.
    if (locale === 'en-US' || locale === 'en') {
      return undefined;
    }

    // Try to load the locale data.
    const localeResource = `../third_party/lighthouse/locales/${locale}.json`;
    try {
      const module = Root.Runtime.Runtime.instance().module('lighthouse_worker');
      const localeDataText = await module.fetchResource(localeResource);
      const localeData = JSON.parse(localeDataText);
      // @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
      self.registerLocaleData(locale, localeData);
      return locale;
    } catch (_) {
    }

    // If no locale was found, or fetching locale data fails, Lighthouse will use `en-US` by default.
    return undefined;
  }

  async stop() {
    this.close();
  }

  /**
   * @param {*} params
   */
  async dispatchProtocolMessage(params) {
    if (this._onMessage) {
      this._onMessage(params['message']);
    }
  }

  /**
   * @override
   */
  async dispose() {
  }

  /**
   * @param {string} message
   */
  statusUpdate(message) {
    if (this._notify) {
      this._notify('statusUpdate', {message});
    }
  }

  /**
   * @param {string} message
   */
  send(message) {
    if (this._notify) {
      this._notify('sendProtocolMessage', {message});
    }
  }

  close() {
  }

  /**
   * @param {string} eventName
   * @param {function(string|undefined):void} cb
   */
  on(eventName, cb) {
    if (eventName === 'message') {
      this._onMessage = cb;
    }
    if (eventName === 'close') {
      this._onClose = cb;
    }
  }

  _disableLoggingForTest() {
    console.log = () => undefined;  // eslint-disable-line no-console
  }
}

// Make lighthouse and traceviewer happy.
globalThis.global = self;
// @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
globalThis.global.isVinn = true;
// @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
globalThis.global.document = {};
// @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
globalThis.global.document.documentElement = {};
// @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
globalThis.global.document.documentElement.style = {
  WebkitAppearance: 'WebkitAppearance'
};
// @ts-ignore https://github.com/GoogleChrome/lighthouse/issues/11628
globalThis.global.LighthouseService = LighthouseService;
