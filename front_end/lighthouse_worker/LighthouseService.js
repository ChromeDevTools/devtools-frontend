// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Root from '../root/root.js';

/**
 * @interface
 */
// eslint-disable-next-line
const LighthousePort = class {
  /**
   * @param {!string} eventName, 'message', 'close'
   * @param {function(string|undefined)} cb
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
};

/**
 * @implements {LighthousePort}
 * @implements {Service}
 * @unrestricted
 */
class LighthouseService {  // eslint-disable-line
  /**
   * @override
   * @param {function(string)}
   */
  setNotify(notify) {
    this._notify = notify;
  }

  /**
   * @return {!Promise<!ReportRenderer.RunnerResult>}
   */
  start(params) {
    if (Root.Runtime.Runtime.queryParam('isUnderTest')) {
      this._disableLoggingForTest();
      params.flags.maxWaitForLoad = 2 * 1000;
    }

    self.listenForStatus(message => {
      this.statusUpdate(message[1]);
    });

    return this.fetchLocaleData(params.locales)
        .then(locale => {
          const flags = params.flags;
          flags.logLevel = flags.logLevel || 'info';
          flags.channel = 'devtools';
          flags.locale = locale;

          const connection = self.setUpWorkerConnection(this);
          const config = self.createConfig(params.categoryIDs, flags.emulatedFormFactor);
          const url = params.url;

          return self.runLighthouse(url, flags, config, connection);
        })
        .then(/** @type {!ReportRenderer.RunnerResult} */ result => {
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
   * @return {string|undefined}
   */
  async fetchLocaleData(locales) {
    const locale = self.lookupLocale(locales);

    // If the locale is en-US, no need to fetch locale data.
    if (locale === 'en-US' || locale === 'en') {
      return;
    }

    // Try to load the locale data.
    const localeResource = `../third_party/lighthouse/locales/${locale}.json`;
    try {
      const module = Root.Runtime.Runtime.instance().module('lighthouse_worker');
      const localeDataText = await module.fetchResource(localeResource);
      const localeData = JSON.parse(localeDataText);
      self.registerLocaleData(locale, localeData);
      return locale;
    } catch (_) {
    }

    // If no locale was found, or fetching locale data fails, Lighthouse will use `en-US` by default.
  }

  /**
   * @return {!Promise}
   */
  stop() {
    this.close();
    return Promise.resolve();
  }

  /**
   * @param {!Object=} params
   * @return {!Promise}
   */
  dispatchProtocolMessage(params) {
    this._onMessage(params['message']);
    return Promise.resolve();
  }

  /**
   * @override
   * @return {!Promise}
   */
  dispose() {
    return Promise.resolve();
  }

  /**
   * @param {string} message
   */
  statusUpdate(message) {
    this._notify('statusUpdate', {message: message});
  }

  /**
   * @param {string} message
   */
  send(message) {
    this._notify('sendProtocolMessage', {message: message});
  }

  close() {
  }

  /**
   * @param {string} eventName
   * @param {function(string|undefined)} cb
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
globalThis.global.isVinn = true;
globalThis.global.document = {};
globalThis.global.document.documentElement = {};
globalThis.global.document.documentElement.style = {
  WebkitAppearance: 'WebkitAppearance'
};
globalThis.global.LighthouseService = LighthouseService;
