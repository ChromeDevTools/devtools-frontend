// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../host/host.js';

import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {ProtocolProxyApi.LogDispatcher}
 */
export class LogModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    target.registerLogDispatcher(this);
    this._logAgent = target.logAgent();
    this._logAgent.invoke_enable();
    if (!Host.InspectorFrontendHost.isUnderTest()) {
      this._logAgent.invoke_startViolationsReport({
        config: [
          {name: Protocol.Log.ViolationSettingName.LongTask, threshold: 200},
          {name: Protocol.Log.ViolationSettingName.LongLayout, threshold: 30},
          {name: Protocol.Log.ViolationSettingName.BlockedEvent, threshold: 100},
          {name: Protocol.Log.ViolationSettingName.BlockedParser, threshold: -1},
          {name: Protocol.Log.ViolationSettingName.Handler, threshold: 150},
          {name: Protocol.Log.ViolationSettingName.RecurringHandler, threshold: 50},
          {name: Protocol.Log.ViolationSettingName.DiscouragedAPIUse, threshold: -1}
        ]
      });
    }
  }

  /**
   * @override
   * @param {!Protocol.Log.EntryAddedEvent} event
   */
  entryAdded({entry}) {
    this.dispatchEventToListeners(Events.EntryAdded, {logModel: this, entry});
  }

  requestClear() {
    this._logAgent.invoke_clear();
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
  }
}

/** @enum {symbol} */
export const Events = {
  EntryAdded: Symbol('EntryAdded')
};

SDKModel.register(LogModel, Capability.Log, true);
