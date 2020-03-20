// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.LogModel.LogModel>}
 */
export class LogManager {
  constructor() {
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.LogModel.LogModel, this);
  }

  /**
   * @override
   * @param {!SDK.LogModel.LogModel} logModel
   */
  modelAdded(logModel) {
    const eventListeners = [];
    eventListeners.push(logModel.addEventListener(SDK.LogModel.Events.EntryAdded, this._logEntryAdded, this));
    logModel[_eventSymbol] = eventListeners;
  }

  /**
   * @override
   * @param {!SDK.LogModel.LogModel} logModel
   */
  modelRemoved(logModel) {
    Common.EventTarget.EventTarget.removeEventListeners(logModel[_eventSymbol]);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _logEntryAdded(event) {
    const data = /** @type {{logModel: !SDK.LogModel.LogModel, entry: !Protocol.Log.LogEntry}} */ (event.data);
    const target = data.logModel.target();

    const consoleMessage = new SDK.ConsoleModel.ConsoleMessage(
        target.model(SDK.RuntimeModel.RuntimeModel), data.entry.source, data.entry.level, data.entry.text, undefined,
        data.entry.url, data.entry.lineNumber, undefined, [data.entry.text, ...(data.entry.args || [])],
        data.entry.stackTrace, data.entry.timestamp, undefined, undefined, data.entry.workerId);

    if (data.entry.networkRequestId) {
      self.SDK.networkLog.associateConsoleMessageWithRequest(consoleMessage, data.entry.networkRequestId);
    }

    if (consoleMessage.source === SDK.ConsoleModel.MessageSource.Worker) {
      const workerId = consoleMessage.workerId || '';
      // We have a copy of worker messages reported through the page, so that
      // user can see messages from the worker which has been already destroyed.
      // When opening DevTools, give us some time to connect to the worker and
      // not report the message twice if the worker is still alive.
      if (SDK.SDKModel.TargetManager.instance().targetById(workerId)) {
        return;
      }
      setTimeout(() => {
        if (!SDK.SDKModel.TargetManager.instance().targetById(workerId)) {
          SDK.ConsoleModel.ConsoleModel.instance().addMessage(consoleMessage);
        }
      }, 1000);
    } else {
      SDK.ConsoleModel.ConsoleModel.instance().addMessage(consoleMessage);
    }
  }
}

const _eventSymbol = Symbol('_events');
