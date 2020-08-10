// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class WebAuthnModel extends SDKModel {
  /**
  * @param {!Target} target
  */
  constructor(target) {
    super(target);
    this._agent = target.webAuthnAgent();
  }

  /**
   * @param {boolean} enable
   * @return {!Promise<!Object>}
   */
  setVirtualAuthEnvEnabled(enable) {
    if (enable) {
      return this._agent.invoke_enable();
    }
    return this._agent.invoke_disable();
  }

  /**
   * @param {!Protocol.WebAuthn.VirtualAuthenticatorOptions} options
   * @return {!Promise<!Protocol.WebAuthn.AuthenticatorId>}
   */
  async addAuthenticator(options) {
    const response = await this._agent.invoke_addVirtualAuthenticator({options});
    return response.authenticatorId;
  }

  /**
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   */
  async removeAuthenticator(authenticatorId) {
    await this._agent.invoke_removeVirtualAuthenticator({authenticatorId});
  }

  /**
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   * @param {boolean} enabled
   */
  async setAutomaticPresenceSimulation(authenticatorId, enabled) {
    await this._agent.invoke_setAutomaticPresenceSimulation({authenticatorId, enabled});
  }

  /**
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   * @return {!Promise<!Array<!Protocol.WebAuthn.Credential>>}
   */
  async getCredentials(authenticatorId) {
    const response = await this._agent.invoke_getCredentials({authenticatorId});
    return response.credentials;
  }

  /**
   * @param {!Protocol.WebAuthn.AuthenticatorId} authenticatorId
   * @param {string} credentialId
   */
  async removeCredential(authenticatorId, credentialId) {
    await this._agent.invoke_removeCredential({authenticatorId, credentialId});
  }
}

SDKModel.register(WebAuthnModel, Capability.WebAuthn, false);
