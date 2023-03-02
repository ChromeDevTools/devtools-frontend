// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {NetworkLog} from './NetworkLog.js';

const modelToEventListeners = new WeakMap<SDK.LogModel.LogModel, Common.EventTarget.EventDescriptor[]>();

let instance: LogManager|null = null;

export class LogManager implements SDK.TargetManager.SDKModelObserver<SDK.LogModel.LogModel> {
  private constructor() {
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.LogModel.LogModel, this);
  }

  static instance({forceNew}: {forceNew: boolean} = {forceNew: false}): LogManager {
    if (!instance || forceNew) {
      instance = new LogManager();
    }

    return instance;
  }

  modelAdded(logModel: SDK.LogModel.LogModel): void {
    const eventListeners = [];
    eventListeners.push(logModel.addEventListener(SDK.LogModel.Events.EntryAdded, this.logEntryAdded, this));
    modelToEventListeners.set(logModel, eventListeners);
  }

  modelRemoved(logModel: SDK.LogModel.LogModel): void {
    const eventListeners = modelToEventListeners.get(logModel);
    if (eventListeners) {
      Common.EventTarget.removeEventListeners(eventListeners);
    }
  }

  private logEntryAdded(event: Common.EventTarget.EventTargetEvent<SDK.LogModel.EntryAddedEvent>): void {
    const {logModel, entry} = event.data;
    const target = logModel.target();
    const details = {
      url: entry.url as Platform.DevToolsPath.UrlString,
      line: entry.lineNumber,
      parameters: [entry.text, ...(entry.args ?? [])],
      stackTrace: entry.stackTrace,
      timestamp: entry.timestamp,
      workerId: entry.workerId,
      category: entry.category,
      affectedResources: entry.networkRequestId ? {requestId: entry.networkRequestId} : undefined,
    };
    const consoleMessage = new SDK.ConsoleModel.ConsoleMessage(
        target.model(SDK.RuntimeModel.RuntimeModel), entry.source, entry.level, entry.text, details);

    if (entry.networkRequestId) {
      NetworkLog.instance().associateConsoleMessageWithRequest(consoleMessage, entry.networkRequestId);
    }

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    if (consoleMessage.source === Protocol.Log.LogEntrySource.Worker) {
      const workerId = consoleMessage.workerId || '';
      // We have a copy of worker messages reported through the page, so that
      // user can see messages from the worker which has been already destroyed.
      // When opening DevTools, give us some time to connect to the worker and
      // not report the message twice if the worker is still alive.
      if (SDK.TargetManager.TargetManager.instance().targetById(workerId)) {
        return;
      }
      window.setTimeout(() => {
        if (!SDK.TargetManager.TargetManager.instance().targetById(workerId)) {
          consoleModel?.addMessage(consoleMessage);
        }
      }, 1000);
    } else {
      consoleModel?.addMessage(consoleMessage);
    }
  }
}
