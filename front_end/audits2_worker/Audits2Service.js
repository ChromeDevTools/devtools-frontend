// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @interface
 */
class LighthousePort {
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
}

/**
 * @implements {LighthousePort}
 * @implements {Service}
 * @unrestricted
 */
var Audits2Service = class {
  /**
   * @override
   * @param {function(string)}
   */
  setNotify(notify) {
    this._notify = notify;
  }

  /**
   * @return {!Promise}
   */
  start() {
    return window.runLighthouseInWorker(this, 'https://www.webkit.org', {flags: {mobile: true}}, [
      'is-on-https',
      'redirects-http',
      'service-worker',
      'works-offline',
      'viewport',
      'manifest-display',
      'without-javascript',
      'first-meaningful-paint',
      'speed-index-metric',
      'estimated-input-latency',
      'time-to-interactive',
      'user-timings',
      'screenshots',
      'critical-request-chains',
      'manifest-exists',
      'manifest-background-color',
      'manifest-theme-color',
      'manifest-icons-min-192',
      'manifest-icons-min-144',
      'manifest-name',
      'manifest-short-name',
      'manifest-short-name-length',
      'manifest-start-url',
      'meta-theme-color',
      'aria-valid-attr',
      'aria-allowed-attr',
      'color-contrast',
      'image-alt',
      'label',
      'tabindex',
      'content-width',
      'geolocation-on-start'
    ]);
  }

  /**
   * @return {!Promise}
   */
  stop() {
    this._onClose();
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
    if (eventName === 'message')
      this._onMessage = cb;
    if (eventName === 'close')
      this._onClose = cb;
  }
};

// Make lighthouse happy.
global = self;
global.isVinn = true;
global.document = {};
global.document.documentElement = {};
global.document.documentElement.style = {
  WebkitAppearance: 'WebkitAppearance'
};
