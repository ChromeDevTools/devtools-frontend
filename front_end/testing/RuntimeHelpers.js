// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Root from '../core/root/root.js';
/**
 * @deprecated we prefer using HostConfig to control DevTools features.
 */
const REGISTERED_EXPERIMENTS = [
    Root.ExperimentNames.ExperimentName.PROTOCOL_MONITOR,
    Root.ExperimentNames.ExperimentName.INSTRUMENTATION_BREAKPOINTS,
    Root.ExperimentNames.ExperimentName.USE_SOURCE_MAP_SCOPES,
];
export function setupRuntime() {
    Root.Runtime.experiments.clearForTest();
    for (const experimentName of REGISTERED_EXPERIMENTS) {
        Root.Runtime.experiments.register(experimentName, '');
    }
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