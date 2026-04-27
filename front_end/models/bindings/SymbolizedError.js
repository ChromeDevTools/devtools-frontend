// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
import { LiveLocationPool } from './LiveLocation.js';
export class SymbolizedErrorObject extends Common.ObjectWrapper.ObjectWrapper {
    message;
    stackTrace;
    cause;
    constructor(message, stackTrace, cause) {
        super();
        this.message = message;
        this.stackTrace = stackTrace;
        this.cause = cause;
        this.stackTrace.addEventListener("UPDATED" /* StackTrace.StackTrace.Events.UPDATED */, this.#fireUpdated, this);
        this.cause?.addEventListener("UPDATED" /* Events.UPDATED */, this.#fireUpdated, this);
    }
    dispose() {
        this.stackTrace.removeEventListener("UPDATED" /* StackTrace.StackTrace.Events.UPDATED */, this.#fireUpdated, this);
        this.cause?.removeEventListener("UPDATED" /* Events.UPDATED */, this.#fireUpdated, this);
        if (this.cause instanceof SymbolizedErrorObject) {
            this.cause.dispose();
        }
    }
    #fireUpdated() {
        this.dispatchEventToListeners("UPDATED" /* Events.UPDATED */);
    }
}
export class SymbolizedSyntaxError extends Common.ObjectWrapper.ObjectWrapper {
    message;
    #uiLocation = null;
    constructor(message) {
        super();
        this.message = message;
    }
    get uiLocation() {
        return this.#uiLocation;
    }
    static async fromExceptionDetails(target, debuggerWorkspaceBinding, exceptionDetails) {
        const { exception, scriptId, lineNumber, columnNumber } = exceptionDetails;
        if (!exception || exception.subtype !== 'error' || exception.className !== 'SyntaxError') {
            throw new Error('SymbolizedSyntaxError.fromExceptionDetails expects a SyntaxError');
        }
        if (!scriptId) {
            return null;
        }
        const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        if (!debuggerModel) {
            return null;
        }
        const rawLocation = debuggerModel.createRawLocationByScriptId(scriptId, lineNumber, columnNumber);
        const symbolizedSyntaxError = new SymbolizedSyntaxError(exception.description || '');
        // We don't implement dispose here. We won't create many of these so a couple
        // LiveLocationPools and SymbolizedSyntaxError instances leaking is fine.
        await debuggerWorkspaceBinding.createLiveLocation(rawLocation, symbolizedSyntaxError.#update.bind(symbolizedSyntaxError), new LiveLocationPool());
        return symbolizedSyntaxError;
    }
    async #update(liveLocation) {
        this.#uiLocation = await liveLocation.uiLocation();
        this.dispatchEventToListeners("UPDATED" /* Events.UPDATED */);
    }
}
//# sourceMappingURL=SymbolizedError.js.map