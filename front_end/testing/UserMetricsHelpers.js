// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../core/host/host.js';
/**
 * @returns True, iff a metric event with the provided name and code was recorded. False otherwise.
 */
export function recordedMetricsContain(actionName, actionCode) {
    return Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordedEnumeratedHistograms.some(event => event.actionName === actionName && event.actionCode === actionCode);
}
export function resetRecordedMetrics() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordedEnumeratedHistograms = [];
}
//# sourceMappingURL=UserMetricsHelpers.js.map