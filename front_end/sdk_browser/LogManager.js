// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.SDKModelObserver<!SDK.LogModel>}
 */
SDKBrowser.LogManager = class {
  constructor() {
    SDK.targetManager.observeModels(SDK.LogModel, this);
  }

  /**
   * @override
   * @param {!SDK.LogModel} logModel
   */
  modelAdded(logModel) {
    var eventListeners = [];
    eventListeners.push(logModel.addEventListener(SDK.LogModel.Events.EntryAdded, this._logEntryAdded, this));
    logModel[SDKBrowser.LogManager._events] = eventListeners;
  }

  /**
   * @override
   * @param {!SDK.LogModel} logModel
   */
  modelRemoved(logModel) {
    Common.EventTarget.removeEventListeners(logModel[SDKBrowser.LogManager._events]);
  }

  /**
   * @param {!Common.Event} event
   */
  _logEntryAdded(event) {
    var data = /** @type {{logModel: !SDK.LogModel, entry: !Protocol.Log.LogEntry}} */ (event.data);
    var target = data.logModel.target();

    var consoleMessage = new SDK.ConsoleMessage(
        target.model(SDK.RuntimeModel), data.entry.source, data.entry.level, data.entry.text, undefined, data.entry.url,
        data.entry.lineNumber, undefined, [data.entry.text, ...(data.entry.args || [])], data.entry.stackTrace,
        data.entry.timestamp, undefined, undefined, data.entry.workerId);

    if (data.entry.networkRequestId)
      SDKBrowser.networkLog.associateConsoleMessageWithRequest(consoleMessage, data.entry.networkRequestId);
    SDK.consoleModel.addMessage(consoleMessage);
  }
};

SDKBrowser.LogManager._events = Symbol('_events');

new SDKBrowser.LogManager();
