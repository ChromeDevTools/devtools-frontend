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
   * @return {!Promise<!ReportRenderer.ReportJSON>}
   */
  start(params) {
    if (Runtime.queryParam('isUnderTest'))
      this._disableLoggingForTest();

    self.listenForStatus(message => {
      this.statusUpdate(message[1]);
    });

    return Promise.resolve()
        .then(_ => self.runLighthouseInWorker(this, params.url, {}, params.categoryIDs))
        .then(/** @type {!ReportRenderer.ReportJSON} */ result => {
          // Filter out artifacts except for screenshots in traces to minimize report size.
          var traces = result.artifacts.traces;
          for (var pass in traces) {
            traces[pass]['traceEvents'] =
                traces[pass]['traceEvents'].filter(e => e['cat'] === 'disabled-by-default-devtools.screenshot');
          }
          result.artifacts = {traces: traces};
          return result;
        })
        .catch(err => ({
                 fatal: true,
                 message: err.message,
                 stack: err.stack,
               }));
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

  _disableLoggingForTest() {
    console.log = () => undefined;  // eslint-disable-line no-console
  }
};

// Make lighthouse and traceviewer happy.
global = self;
global.isVinn = true;
global.document = {};
global.document.documentElement = {};
global.document.documentElement.style = {
  WebkitAppearance: 'WebkitAppearance'
};
