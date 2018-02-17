// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.SDKModelObserver<!SDK.LogModel>}
 */
BrowserSDK.LogManager = class {
  constructor() {
    SDK.targetManager.observeModels(SDK.LogModel, this);
  }

  /**
   * @override
   * @param {!SDK.LogModel} logModel
   */
  modelAdded(logModel) {
    const eventListeners = [];
    eventListeners.push(logModel.addEventListener(SDK.LogModel.Events.EntryAdded, this._logEntryAdded, this));
    logModel[BrowserSDK.LogManager._eventSymbol] = eventListeners;
  }

  /**
   * @override
   * @param {!SDK.LogModel} logModel
   */
  modelRemoved(logModel) {
    Common.EventTarget.removeEventListeners(logModel[BrowserSDK.LogManager._eventSymbol]);
  }

  /**
   * @param {!Common.Event} event
   */
  _logEntryAdded(event) {
    const data = /** @type {{logModel: !SDK.LogModel, entry: !Protocol.Log.LogEntry}} */ (event.data);
    const target = data.logModel.target();

    const consoleMessage = new SDK.ConsoleMessage(
        target.model(SDK.RuntimeModel), data.entry.source, data.entry.level, data.entry.text, undefined, data.entry.url,
        data.entry.lineNumber, undefined, [data.entry.text, ...(data.entry.args || [])], data.entry.stackTrace,
        data.entry.timestamp, undefined, undefined, data.entry.workerId);

    if (data.entry.networkRequestId)
      BrowserSDK.networkLog.associateConsoleMessageWithRequest(consoleMessage, data.entry.networkRequestId);
    SDK.consoleModel.addMessage(consoleMessage);
  }
};

BrowserSDK.LogManager._eventSymbol = Symbol('_events');

new BrowserSDK.LogManager();
