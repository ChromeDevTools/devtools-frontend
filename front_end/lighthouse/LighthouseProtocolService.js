// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as Services from '../services/services.js';  // eslint-disable-line no-unused-vars

import * as ReportRenderer from './LighthouseReporterTypes.js';  // eslint-disable-line no-unused-vars

export class ProtocolService extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    /** @type {?ProtocolClient.InspectorBackend.Connection} */
    this._rawConnection = null;
    /** @type {?Services.ServiceManager.Service} */
    this._backend = null;
    /** @type {?Promise<void>} */
    this._backendPromise = null;
    /** @type {?function(string):void} */
    this._status = null;
  }

  /**
   * @return {!Promise<void>}
   */
  async attach() {
    await SDK.SDKModel.TargetManager.instance().suspendAllTargets();
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (!mainTarget) {
      throw new Error('Unable to find main target required for LightHouse');
    }
    const childTargetManager = mainTarget.model(SDK.ChildTargetManager.ChildTargetManager);
    if (!childTargetManager) {
      throw new Error('Unable to find child target manager required for LightHouse');
    }
    this._rawConnection = await childTargetManager.createParallelConnection(this._dispatchProtocolMessage.bind(this));
  }

  getLocales() {
    return navigator.languages;
  }

  /**
   * @param {string} auditURL
   * @param {!Array<string>} categoryIDs
   * @param {!Object} flags
   * @return {!Promise<!ReportRenderer.RunnerResult>}
   */
  startLighthouse(auditURL, categoryIDs, flags) {
    const locales = this.getLocales();
    return this._send('start', {url: auditURL, categoryIDs, flags, locales});
  }

  /**
   * @return {!Promise<void>}
   */
  async detach() {
    await this._send('stop');
    if (this._backend) {
      await this._backend.dispose();
      this._backend = null;
    }
    this._backendPromise = null;
    if (this._rawConnection) {
      await this._rawConnection.disconnect();
    }
    await SDK.SDKModel.TargetManager.instance().resumeAllTargets();
  }

  /**
   *  @param {function (string): void} callback
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
    const backendPromise =
        Services.serviceManager.createAppService('lighthouse_worker', 'LighthouseService').then(backend => {
          if (this._backend) {
            return;
          }
          this._backend = backend;
          if (backend) {
            backend.on(
                'statusUpdate',
                /**
                 * @param {?=} result
                 */
                result => {
                  if (this._status && result && 'message' in result) {
                    this._status(result.message);
                  }
                });
            backend.on(
                'sendProtocolMessage',
                /**
                 * @param {?=} result
                 */
                result => {
                  if (result && 'message' in result) {
                    this._sendProtocolMessage(result.message);
                  }
                });
          }
        });
    this._backendPromise = backendPromise;
    return backendPromise;
  }

  /**
   * @param {string} message
   */
  _sendProtocolMessage(message) {
    if (this._rawConnection) {
      this._rawConnection.sendRawMessage(message);
    }
  }

  /**
   * @param {string} method
   * @param {!Object<string,*>=} params
   * @return {!Promise<!ReportRenderer.RunnerResult>}
   */
  async _send(method, params) {
    let backendPromise = this._backendPromise;
    if (!backendPromise) {
      backendPromise = this._initWorker();
    }

    await backendPromise;
    if (!this._backend) {
      throw new Error('Backend is missing to send LightHouse message to');
    }
    return /** @type {!Promise<!ReportRenderer.RunnerResult>} */ (this._backend.send(method, params));
  }
}
