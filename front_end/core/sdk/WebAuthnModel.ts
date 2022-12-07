// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';

export const enum Events {
  CredentialAdded = 'CredentialAdded',
  CredentialAsserted = 'CredentialAsserted',
}

export class WebAuthnModel extends SDKModel {
  readonly #agent: ProtocolProxyApi.WebAuthnApi;
  constructor(target: Target) {
    super(target);
    this.#agent = target.webAuthnAgent();
    target.registerWebAuthnDispatcher(new WebAuthnDispatcher(this));
  }

  setVirtualAuthEnvEnabled(enable: boolean): Promise<Object> {
    if (enable) {
      return this.#agent.invoke_enable({enableUI: true});
    }
    return this.#agent.invoke_disable();
  }

  async addAuthenticator(options: Protocol.WebAuthn.VirtualAuthenticatorOptions):
      Promise<Protocol.WebAuthn.AuthenticatorId> {
    const response = await this.#agent.invoke_addVirtualAuthenticator({options});
    return response.authenticatorId;
  }

  async removeAuthenticator(authenticatorId: Protocol.WebAuthn.AuthenticatorId): Promise<void> {
    await this.#agent.invoke_removeVirtualAuthenticator({authenticatorId});
  }

  async setAutomaticPresenceSimulation(authenticatorId: Protocol.WebAuthn.AuthenticatorId, enabled: boolean):
      Promise<void> {
    await this.#agent.invoke_setAutomaticPresenceSimulation({authenticatorId, enabled});
  }

  async getCredentials(authenticatorId: Protocol.WebAuthn.AuthenticatorId): Promise<Protocol.WebAuthn.Credential[]> {
    const response = await this.#agent.invoke_getCredentials({authenticatorId});
    return response.credentials;
  }

  async removeCredential(authenticatorId: Protocol.WebAuthn.AuthenticatorId, credentialId: string): Promise<void> {
    await this.#agent.invoke_removeCredential({authenticatorId, credentialId});
  }

  credentialAdded(params: Protocol.WebAuthn.CredentialAddedEvent): void {
    this.dispatchEventToListeners(Events.CredentialAdded, params);
  }

  credentialAsserted(params: Protocol.WebAuthn.CredentialAssertedEvent): void {
    this.dispatchEventToListeners(Events.CredentialAsserted, params);
  }
}

class WebAuthnDispatcher implements ProtocolProxyApi.WebAuthnDispatcher {
  readonly #model: WebAuthnModel;
  constructor(model: WebAuthnModel) {
    this.#model = model;
  }

  credentialAdded(params: Protocol.WebAuthn.CredentialAddedEvent): void {
    this.#model.credentialAdded(params);
  }

  credentialAsserted(params: Protocol.WebAuthn.CredentialAssertedEvent): void {
    this.#model.credentialAsserted(params);
  }
}

SDKModel.register(WebAuthnModel, {capabilities: Capability.WebAuthn, autostart: false});
