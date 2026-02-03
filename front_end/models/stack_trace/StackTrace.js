// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * A small wrapper around a DebuggableFrame usable as a UI.Context flavor.
 * This is necessary as DebuggableFrame are just interfaces and the impl classes are hidden.
 *
 * Moreover, re-translation creates a new DebuggableFrame instance even though the
 * translation result stays the same, in which case we don't need a new instance for the flavor.
 */
export class DebuggableFrameFlavor {
    static #last;
    frame;
    /** Use the static {@link for}. Only public to satisfy the `setFlavor` Ctor type  */
    constructor(frame) {
        this.frame = frame;
    }
    get sdkFrame() {
        return this.frame.sdkFrame;
    }
    /** @returns the same instance of DebuggableFrameFlavor for repeated calls with the same (i.e. deep equal) DebuggableFrame */
    static for(frame) {
        function equals(a, b) {
            return a.url === b.url && a.uiSourceCode === b.uiSourceCode && a.name === b.name && a.line === b.line &&
                a.column === b.column && a.sdkFrame === b.sdkFrame &&
                JSON.stringify(a.missingDebugInfo) === JSON.stringify(b.missingDebugInfo);
        }
        if (!DebuggableFrameFlavor.#last || !equals(DebuggableFrameFlavor.#last.frame, frame)) {
            DebuggableFrameFlavor.#last = new DebuggableFrameFlavor(frame);
        }
        return DebuggableFrameFlavor.#last;
    }
}
//# sourceMappingURL=StackTrace.js.map