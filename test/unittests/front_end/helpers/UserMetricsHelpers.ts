// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../front_end/core/host/host.js';

/**
 * @returns True, iff a metric event with the provided name and code was recorded. False otherwise.
 */
export function recordedMetricsContain(actionName: string, actionCode: number): boolean {
  return Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordedEnumeratedHistograms.some(
      event => event.actionName === actionName && event.actionCode === actionCode);
}

export function resetRecordedMetrics(): void {
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordedEnumeratedHistograms = [];
}
