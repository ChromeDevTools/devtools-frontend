// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../host/host.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';

export class LogModel extends SDKModel<EventTypes> implements ProtocolProxyApi.LogDispatcher {
  readonly #logAgent: ProtocolProxyApi.LogApi;
  constructor(target: Target) {
    super(target);
    target.registerLogDispatcher(this);
    this.#logAgent = target.logAgent();
    void this.#logAgent.invoke_enable();
    if (!Host.InspectorFrontendHost.isUnderTest()) {
      void this.#logAgent.invoke_startViolationsReport({
        config: [
          {name: Protocol.Log.ViolationSettingName.LongTask, threshold: 200},
          {name: Protocol.Log.ViolationSettingName.LongLayout, threshold: 30},
          {name: Protocol.Log.ViolationSettingName.BlockedEvent, threshold: 100},
          {name: Protocol.Log.ViolationSettingName.BlockedParser, threshold: -1},
          {name: Protocol.Log.ViolationSettingName.Handler, threshold: 150},
          {name: Protocol.Log.ViolationSettingName.RecurringHandler, threshold: 50},
          {name: Protocol.Log.ViolationSettingName.DiscouragedAPIUse, threshold: -1},
        ],
      });
    }
  }

  entryAdded({entry}: Protocol.Log.EntryAddedEvent): void {
    this.dispatchEventToListeners(Events.ENTRY_ADDED, {logModel: this, entry});
  }

  requestClear(): void {
    void this.#logAgent.invoke_clear();
  }
}

export const enum Events {
  ENTRY_ADDED = 'EntryAdded',
}

export interface EntryAddedEvent {
  logModel: LogModel;
  entry: Protocol.Log.LogEntry;
}

export type EventTypes = {
  [Events.ENTRY_ADDED]: EntryAddedEvent,
};

SDKModel.register(LogModel, {capabilities: Capability.LOG, autostart: true});
