// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
export const BACKEND_LINKING_PLACEHOLDERS = [
    '${devtoolsDebugId}',
    '${requestId}',
    '${correlationId}',
    '${traceId}',
    '${spanId}',
];
export const backendLinkingRulesSettingDescriptor = {
    name: 'network.backend-linking-rules',
    type: "array" /* Common.Settings.SettingType.ARRAY */,
    defaultValue: [],
    isAvailable: config => config.devToolsNetworkBackendLinking?.enabled ?
        { status: 1 /* Common.Settings.SettingAvailability.AVAILABLE */ } :
        { status: 2 /* Common.Settings.SettingAvailability.UNAVAILABLE */, reason: undefined },
};
//# sourceMappingURL=BackendLinking.js.map