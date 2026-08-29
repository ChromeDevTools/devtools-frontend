// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// The maximum size (in bytes) of a function execution result.
// Approximately 16k tokens at ~4 characters per token, designed to limit
// result sizes to prevent overloading the LLM's context window.
export const MAX_FUNCTION_RESULT_BYTE_LENGTH = 16384 * 4;
export var ToolName;
(function (ToolName) {
    ToolName["EXECUTE_JAVASCRIPT"] = "executeJavaScript";
    ToolName["GET_STYLES"] = "getStyles";
    ToolName["LIST_NETWORK_REQUESTS"] = "listNetworkRequests";
    ToolName["GET_NETWORK_REQUEST_DETAILS"] = "getNetworkRequestDetails";
    ToolName["GET_LIGHTHOUSE_AUDITS"] = "getLighthouseAudits";
    ToolName["RESOLVE_DEVTOOLS_NODE_PATH"] = "resolveDevtoolsNodePath";
    ToolName["GET_ELEMENT_ACCESSIBILITY_DETAILS"] = "getElementAccessibilityDetails";
    ToolName["RECORD_PERFORMANCE_TRACE"] = "recordPerformanceTrace";
    ToolName["LIST_PAGE_ORIGINS"] = "listPageOrigins";
    ToolName["LIST_STORAGE_KEYS"] = "listStorageKeys";
    ToolName["GET_STORAGE_VALUES"] = "getStorageValues";
    ToolName["LIST_COOKIES"] = "listCookies";
    ToolName["GET_COOKIE_VALUES"] = "getCookieValues";
    ToolName["GET_TRACE_EVENT_BY_KEY"] = "getTraceEventByKey";
    ToolName["SELECT_TRACE_EVENT_BY_KEY"] = "selectTraceEventByKey";
    ToolName["LIST_SOURCES"] = "listSources";
    ToolName["GET_SOURCE_CONTENT"] = "getSourceContent";
    ToolName["GET_TRACE_MAIN_THREAD_SUMMARY"] = "getTraceMainThreadSummary";
    ToolName["GET_TRACE_NETWORK_SUMMARY"] = "getTraceNetworkSummary";
    ToolName["RUN_LIGHTHOUSE"] = "runLighthouse";
    ToolName["GET_DETAILED_CALL_TREE"] = "getDetailedCallTree";
    ToolName["GET_FUNCTION_CODE"] = "getFunctionCode";
    ToolName["GET_RESOURCE_CONTENT"] = "getResourceContent";
    ToolName["GET_INSIGHT_DETAILS"] = "getInsightDetails";
    ToolName["GET_STORAGE_BREAKDOWN"] = "getStorageBreakdown";
})(ToolName || (ToolName = {}));
export var ToolAnnotation;
(function (ToolAnnotation) {
    ToolAnnotation["REDACT_FROM_HISTORY"] = "redact-from-history";
})(ToolAnnotation || (ToolAnnotation = {}));
//# sourceMappingURL=Tool.js.map