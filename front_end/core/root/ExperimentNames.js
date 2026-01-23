// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export var ExperimentName;
(function (ExperimentName) {
    ExperimentName["ALL"] = "*";
    ExperimentName["CAPTURE_NODE_CREATION_STACKS"] = "capture-node-creation-stacks";
    ExperimentName["LIVE_HEAP_PROFILE"] = "live-heap-profile";
    ExperimentName["PROTOCOL_MONITOR"] = "protocol-monitor";
    ExperimentName["SAMPLING_HEAP_PROFILER_TIMELINE"] = "sampling-heap-profiler-timeline";
    ExperimentName["SHOW_OPTION_TO_EXPOSE_INTERNALS_IN_HEAP_SNAPSHOT"] = "show-option-to-expose-internals-in-heap-snapshot";
    ExperimentName["TIMELINE_INVALIDATION_TRACKING"] = "timeline-invalidation-tracking";
    ExperimentName["TIMELINE_SHOW_ALL_EVENTS"] = "timeline-show-all-events";
    ExperimentName["TIMELINE_V8_RUNTIME_CALL_STATS"] = "timeline-v8-runtime-call-stats";
    ExperimentName["APCA"] = "apca";
    ExperimentName["FONT_EDITOR"] = "font-editor";
    ExperimentName["FULL_ACCESSIBILITY_TREE"] = "full-accessibility-tree";
    ExperimentName["CONTRAST_ISSUES"] = "contrast-issues";
    ExperimentName["EXPERIMENTAL_COOKIE_FEATURES"] = "experimental-cookie-features";
    ExperimentName["INSTRUMENTATION_BREAKPOINTS"] = "instrumentation-breakpoints";
    ExperimentName["AUTHORED_DEPLOYED_GROUPING"] = "authored-deployed-grouping";
    ExperimentName["JUST_MY_CODE"] = "just-my-code";
    ExperimentName["USE_SOURCE_MAP_SCOPES"] = "use-source-map-scopes";
    ExperimentName["TIMELINE_SHOW_POST_MESSAGE_EVENTS"] = "timeline-show-postmessage-events";
    ExperimentName["TIMELINE_DEBUG_MODE"] = "timeline-debug-mode";
    // Adding or removing an entry from this enum?
    // You will need to update:
    // 1. DevToolsExperiments enum in host/UserMetrics.ts
    // 2. Maybe REGISTERED_EXPERIMENTS in EnvironmentHelpers.ts (to create this experiment in the test env)
})(ExperimentName || (ExperimentName = {}));
//# sourceMappingURL=ExperimentNames.js.map