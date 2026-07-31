// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Root from '../core/root/root.js';
export function setupRuntime() {
    Root.Runtime.experiments.clearForTest();
    // The Instrumentation breakpoints experiment is used by the very universal BreakpointManager.
    Root.Runtime.experiments.register({
        name: Root.ExperimentNames.ExperimentName.INSTRUMENTATION_BREAKPOINTS,
        title: 'Instrumentation breakpoints',
        aboutFlag: 'devtools-instrumentation-breakpoints',
        isEnabled: false,
        requiresChromeRestart: false,
    });
}
export function cleanupRuntime() {
    Root.Runtime.experiments.clearForTest();
    Root.Runtime.Runtime.removeInstance();
}
export function setupRuntimeHooks() {
    beforeEach(setupRuntime);
    afterEach(cleanupRuntime);
}
//# sourceMappingURL=RuntimeHelpers.js.map