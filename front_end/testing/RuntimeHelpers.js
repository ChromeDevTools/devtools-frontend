// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Root from '../core/root/root.js';
/**
 * @deprecated we prefer using HostConfig to control DevTools features.
 */
const REGISTERED_EXPERIMENTS = [
    Root.ExperimentNames.ExperimentName.CAPTURE_NODE_CREATION_STACKS,
    Root.ExperimentNames.ExperimentName.PROTOCOL_MONITOR,
    Root.ExperimentNames.ExperimentName.TIMELINE_INVALIDATION_TRACKING,
    Root.ExperimentNames.ExperimentName.TIMELINE_SHOW_ALL_EVENTS,
    Root.ExperimentNames.ExperimentName.TIMELINE_V8_RUNTIME_CALL_STATS,
    Root.ExperimentNames.ExperimentName.FONT_EDITOR,
    Root.ExperimentNames.ExperimentName.FULL_ACCESSIBILITY_TREE,
    Root.ExperimentNames.ExperimentName.INSTRUMENTATION_BREAKPOINTS,
    Root.ExperimentNames.ExperimentName.USE_SOURCE_MAP_SCOPES,
    Root.ExperimentNames.ExperimentName.TIMELINE_SHOW_POST_MESSAGE_EVENTS,
    Root.ExperimentNames.ExperimentName.TIMELINE_DEBUG_MODE,
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