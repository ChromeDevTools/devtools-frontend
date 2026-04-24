// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
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
        this.cause?.dispose();
    }
    #fireUpdated() {
        this.dispatchEventToListeners("UPDATED" /* Events.UPDATED */);
    }
}
//# sourceMappingURL=SymbolizedError.js.map