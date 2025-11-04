// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import { NetworkLog } from './NetworkLog.js';
const modelToEventListeners = new WeakMap();
let instance = null;
export class LogManager {
    constructor() {
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.LogModel.LogModel, this);
    }
    static instance({ forceNew } = { forceNew: false }) {
        if (!instance || forceNew) {
            instance = new LogManager();
        }
        return instance;
    }
    modelAdded(logModel) {
        const eventListeners = [];
        eventListeners.push(logModel.addEventListener("EntryAdded" /* SDK.LogModel.Events.ENTRY_ADDED */, this.logEntryAdded, this));
        modelToEventListeners.set(logModel, eventListeners);
    }
    modelRemoved(logModel) {
        const eventListeners = modelToEventListeners.get(logModel);
        if (eventListeners) {
            Common.EventTarget.removeEventListeners(eventListeners);
        }
    }
    logEntryAdded(event) {
        const { logModel, entry } = event.data;
        const target = logModel.target();
        const details = {
            url: entry.url,
            line: entry.lineNumber,
            parameters: [entry.text, ...(entry.args ?? [])],
            stackTrace: entry.stackTrace,
            timestamp: entry.timestamp,
            workerId: entry.workerId,
            category: entry.category,
            affectedResources: entry.networkRequestId ? { requestId: entry.networkRequestId } : undefined,
        };
        const consoleMessage = new SDK.ConsoleModel.ConsoleMessage(target.model(SDK.RuntimeModel.RuntimeModel), entry.source, entry.level, entry.text, details);
        if (entry.networkRequestId) {
            NetworkLog.instance().associateConsoleMessageWithRequest(consoleMessage, entry.networkRequestId);
        }
        const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
        if (consoleMessage.source === "worker" /* Protocol.Log.LogEntrySource.Worker */) {
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
        }
        else {
            consoleModel?.addMessage(consoleMessage);
        }
    }
}
//# sourceMappingURL=LogManager.js.map