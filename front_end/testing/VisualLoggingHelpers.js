// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as VisualLogging from '../ui/visual_logging/visual_logging-testing.js';
export function getVeId(loggable) {
    if (typeof loggable === 'string') {
        loggable = document.querySelector(loggable);
    }
    return VisualLogging.LoggingState.getLoggingState(loggable).veid;
}
//# sourceMappingURL=VisualLoggingHelpers.js.map