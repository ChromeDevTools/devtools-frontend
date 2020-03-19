// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';

export class ProtocolService extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    /** @type {?ProtocolClient.InspectorBackend.Connection} */
    this._rawConnection = null;
    /** @type {?Services.ServiceManager.Service} */
    this._backend = null;
    /** @type {?Promise} */
    this._backendPromise = null;
    /** @type {?function(string)} */
    this._status = null;
  }

  /**
   * @return {!Promise<undefined>}
   */
  async attach() {
    await SDK.SDKModel.TargetManager.instance().suspendAllTargets();
    const childTargetManager =
        SDK.SDKModel.TargetManager.instance().mainTarget().model(SDK.ChildTargetManager.ChildTargetManager);
    this._rawConnection = await childTargetManager.createParallelConnection(this._dispatchProtocolMessage.bind(this));
  }

  /**
   * @param {string} auditURL
   * @param {!Array<string>} categoryIDs
   * @param {!Object} flags
   * @return {!Promise<!ReportRenderer.RunnerResult>}
   */
  startLighthouse(auditURL, categoryIDs, flags) {
    return this._send('start', {url: auditURL, categoryIDs, flags});
  }

  /**
   * @return {!Promise<undefined>}
   */
  async detach() {
    await this._send('stop');
    await this._backend.dispose();
    delete this._backend;
    delete this._backendPromise;
    await this._rawConnection.disconnect();
    await SDK.SDKModel.TargetManager.instance().resumeAllTargets();
  }

  /**
   *  @param {function (string): undefined} callback
   */
  registerStatusCallback(callback) {
    this._status = callback;
  }

  /**
   * @param {(!Object|string)} message
   */
  _dispatchProtocolMessage(message) {
    this._send('dispatchProtocolMessage', {message: JSON.stringify(message)});
  }

  _initWorker() {
    this._backendPromise =
        Services.serviceManager.createAppService('lighthouse_worker', 'LighthouseService').then(backend => {
          if (this._backend) {
            return;
          }
          this._backend = backend;
          this._backend.on('statusUpdate', result => this._status(result.message));
          this._backend.on('sendProtocolMessage', result => this._sendProtocolMessage(result.message));
        });
  }

  /**
   * @param {string} message
   */
  _sendProtocolMessage(message) {
    this._rawConnection.sendRawMessage(message);
  }

  /**
   * @param {string} method
   * @param {!Object=} params
   * @return {!Promise<!ReportRenderer.RunnerResult>}
   */
  _send(method, params) {
    if (!this._backendPromise) {
      this._initWorker();
    }

    return this._backendPromise.then(_ => this._backend.send(method, params));
  }
}
