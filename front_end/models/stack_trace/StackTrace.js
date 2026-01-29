// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * A small wrapper around a DebuggableFrame usable as a UI.Context flavor.
 * This is necessary as Frame and DebuggableFrame are updated in place, but
 * for UI.Context we need a new instance.
 */
export class DebuggableFrameFlavor {
    static #last;
    url;
    uiSourceCode;
    name;
    line;
    column;
    missingDebugInfo;
    sdkFrame;
    /** Use the static {@link for}. Only public to satisfy the `setFlavor` Ctor type  */
    constructor(frame) {
        this.url = frame.url;
        this.uiSourceCode = frame.uiSourceCode;
        this.name = frame.name;
        this.line = frame.line;
        this.column = frame.column;
        this.missingDebugInfo = frame.missingDebugInfo;
        this.sdkFrame = frame.sdkFrame;
    }
    /** @returns the same instance of DebuggableFrameFlavor for repeated calls with the same (i.e. deep equal) DebuggableFrame */
    static for(frame) {
        function equals(a, b) {
            return a.url === b.url && a.uiSourceCode === b.uiSourceCode && a.name === b.name && a.line === b.line &&
                a.column === b.column && a.sdkFrame === b.sdkFrame;
        }
        if (!DebuggableFrameFlavor.#last || !equals(DebuggableFrameFlavor.#last, frame)) {
            DebuggableFrameFlavor.#last = new DebuggableFrameFlavor(frame);
        }
        return DebuggableFrameFlavor.#last;
    }
}
//# sourceMappingURL=StackTrace.js.map