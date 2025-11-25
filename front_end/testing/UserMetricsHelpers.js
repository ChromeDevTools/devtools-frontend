// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../core/host/host.js';
/**
 * @returns True, iff a metric event with the provided name and code was recorded. False otherwise.
 */
export function recordedMetricsContain(actionName, actionCode) {
    const instance = Host.InspectorFrontendHost.InspectorFrontendHostInstance;
    if (instance instanceof Host.InspectorFrontendHost.InspectorFrontendHostStub) {
        return instance.recordedEnumeratedHistograms.some(event => event.actionName === actionName && event.actionCode === actionCode);
    }
    return false;
}
export function resetRecordedMetrics() {
    const instance = Host.InspectorFrontendHost.InspectorFrontendHostInstance;
    if (instance instanceof Host.InspectorFrontendHost.InspectorFrontendHostStub) {
        instance.recordedEnumeratedHistograms = [];
    }
}
//# sourceMappingURL=UserMetricsHelpers.js.map