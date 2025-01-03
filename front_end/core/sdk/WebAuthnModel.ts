// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

export const enum Events {
  CREDENTIAL_ADDED = 'CredentialAdded',
  CREDENTIAL_ASSERTED = 'CredentialAsserted',
  CREDENTIAL_DELETED = 'CredentialDeleted',
  CREDENTIAL_UPDATED = 'CredentialUpdated',
}

export type EventTypes = {
  [Events.CREDENTIAL_ADDED]: Protocol.WebAuthn.CredentialAddedEvent,
  [Events.CREDENTIAL_ASSERTED]: Protocol.WebAuthn.CredentialAssertedEvent,
  [Events.CREDENTIAL_DELETED]: Protocol.WebAuthn.CredentialDeletedEvent,
  [Events.CREDENTIAL_UPDATED]: Protocol.WebAuthn.CredentialUpdatedEvent,
};

export class WebAuthnModel extends SDKModel<EventTypes> {
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
    this.dispatchEventToListeners(Events.CREDENTIAL_ADDED, params);
  }

  credentialAsserted(params: Protocol.WebAuthn.CredentialAssertedEvent): void {
    this.dispatchEventToListeners(Events.CREDENTIAL_ASSERTED, params);
  }

  credentialDeleted(params: Protocol.WebAuthn.CredentialDeletedEvent): void {
    this.dispatchEventToListeners(Events.CREDENTIAL_DELETED, params);
  }

  credentialUpdated(params: Protocol.WebAuthn.CredentialUpdatedEvent): void {
    this.dispatchEventToListeners(Events.CREDENTIAL_UPDATED, params);
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

  credentialDeleted(params: Protocol.WebAuthn.CredentialDeletedEvent): void {
    this.#model.credentialDeleted(params);
  }

  credentialUpdated(params: Protocol.WebAuthn.CredentialUpdatedEvent): void {
    this.#model.credentialUpdated(params);
  }
}

SDKModel.register(WebAuthnModel, {capabilities: Capability.WEB_AUTHN, autostart: false});
