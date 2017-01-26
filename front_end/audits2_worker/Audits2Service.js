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
   * @return {!Promise<!Audits2.WorkerResult>}
   */
  start(params) {
    const connection = this;
    const options = undefined;

    self.listenForStatus(message => {
      this.statusUpdate(message[1]);
    });
    return self.runLighthouseInWorker(connection, params.url, options, params.aggregationTags)
        .then(
            /** @type {!Audits2.LighthouseResult} */ result =>
                ({blobUrl: /** @type {?string} */ self.createReportPageAsBlob(result, 'devtools'), result}))
        .catchException(null);
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
