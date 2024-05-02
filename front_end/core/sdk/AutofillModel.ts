// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Host from '../host/host.js';

import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

export class AutofillModel extends SDKModel<EventTypes> implements ProtocolProxyApi.AutofillDispatcher {
  readonly agent: ProtocolProxyApi.AutofillApi;
  #enabled?: boolean;

  constructor(target: Target) {
    super(target);

    this.agent = target.autofillAgent();
    target.registerAutofillDispatcher(this);
    this.enable();
  }

  enable(): void {
    if (this.#enabled || Host.InspectorFrontendHost.isUnderTest()) {
      return;
    }
    void this.agent.invoke_enable();
    this.#enabled = true;
  }

  disable(): void {
    if (!this.#enabled || Host.InspectorFrontendHost.isUnderTest()) {
      return;
    }
    this.#enabled = false;
    void this.agent.invoke_disable();
  }

  addressFormFilled(addressFormFilledEvent: Protocol.Autofill.AddressFormFilledEvent): void {
    this.dispatchEventToListeners(Events.AddressFormFilled, {autofillModel: this, event: addressFormFilledEvent});
  }
}

SDKModel.register(AutofillModel, {capabilities: Capability.DOM, autostart: true});

export const enum Events {
  AddressFormFilled = 'AddressFormFilled',
}

export interface AddressFormFilledEvent {
  autofillModel: AutofillModel;
  event: Protocol.Autofill.AddressFormFilledEvent;
}

export type EventTypes = {
  [Events.AddressFormFilled]: AddressFormFilledEvent,
};
