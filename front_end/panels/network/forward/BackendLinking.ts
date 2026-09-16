// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';

/**
 * Configuration rule for backend network request debugging links.
 * Matches network requests against a URL pattern and constructs a destination URL
 * from `targetUrlTemplate` using extracted correlation IDs.
 *
 * Supported placeholders in `targetUrlTemplate`:
 * - `${devtoolsDebugId}`: Extracted from `Server-Timing: devtools-debug-id;desc="<id>"`
 * - `${requestId}`: Extracted from `X-Request-ID` response header
 * - `${correlationId}`: Extracted from `X-Correlation-ID` or `Correlation-ID` response header
 * - `${traceId}`: Extracted from `trace-id` response header or 16-byte hex trace ID in `Server-Timing: traceparent`
 * - `${spanId}`: Extracted from 8-byte hex parent span ID in `Server-Timing: traceparent`
 *
 * Example rule:
 * ```json
 * {
 *   "urlPattern": "https://example.com/api/*",
 *   "targetUrlTemplate": "https://apm.example.com/traces/${traceId}?span=${spanId}",
 *   "label": "Open in APM"
 * }
 * ```
 */
export interface BackendLinkingRule {
  urlPattern: string;
  targetUrlTemplate: string;
  label: string;
}

export const BACKEND_LINKING_PLACEHOLDERS = [
  '${devtoolsDebugId}',
  '${requestId}',
  '${correlationId}',
  '${traceId}',
  '${spanId}',
] as const;

export type BackendLinkingPlaceholder = typeof BACKEND_LINKING_PLACEHOLDERS[number];

export const backendLinkingRulesSettingDescriptor:
    Common.Settings.ConditionalSettingDescriptor<BackendLinkingRule[], void> = {
  name: 'network.backend-linking-rules',
  type: Common.Settings.SettingType.ARRAY,
  defaultValue: [],
  isAvailable: config => config.devToolsNetworkBackendLinking?.enabled ?
      {status: Common.Settings.SettingAvailability.AVAILABLE} :
      {status: Common.Settings.SettingAvailability.UNAVAILABLE, reason: undefined},
};
