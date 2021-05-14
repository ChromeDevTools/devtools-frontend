// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import type {Target} from './SDKModel.js';
import {Capability, SDKModel} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class WebAuthnModel extends SDKModel {
  _agent: ProtocolProxyApi.WebAuthnApi;
  constructor(target: Target) {
    super(target);
    this._agent = target.webAuthnAgent();
  }

  setVirtualAuthEnvEnabled(enable: boolean): Promise<Object> {
    if (enable) {
      return this._agent.invoke_enable();
    }
    return this._agent.invoke_disable();
  }

  async addAuthenticator(options: Protocol.WebAuthn.VirtualAuthenticatorOptions): Promise<string> {
    const response = await this._agent.invoke_addVirtualAuthenticator({options});
    return response.authenticatorId;
  }

  async removeAuthenticator(authenticatorId: string): Promise<void> {
    await this._agent.invoke_removeVirtualAuthenticator({authenticatorId});
  }

  async setAutomaticPresenceSimulation(authenticatorId: string, enabled: boolean): Promise<void> {
    await this._agent.invoke_setAutomaticPresenceSimulation({authenticatorId, enabled});
  }

  async getCredentials(authenticatorId: string): Promise<Protocol.WebAuthn.Credential[]> {
    const response = await this._agent.invoke_getCredentials({authenticatorId});
    return response.credentials;
  }

  async removeCredential(authenticatorId: string, credentialId: string): Promise<void> {
    await this._agent.invoke_removeCredential({authenticatorId, credentialId});
  }
}

SDKModel.register(WebAuthnModel, {capabilities: Capability.WebAuthn, autostart: false});
