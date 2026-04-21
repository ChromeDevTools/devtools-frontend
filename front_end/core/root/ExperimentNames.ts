// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export enum ExperimentName {
  ALL = '*',
  CAPTURE_NODE_CREATION_STACKS = 'capture-node-creation-stacks',
  LIVE_HEAP_PROFILE = 'live-heap-profile',
  PROTOCOL_MONITOR = 'protocol-monitor',
  TIMELINE_INVALIDATION_TRACKING = 'timeline-invalidation-tracking',
  FONT_EDITOR = 'font-editor',
  INSTRUMENTATION_BREAKPOINTS = 'instrumentation-breakpoints',
  USE_SOURCE_MAP_SCOPES = 'use-source-map-scopes',
  TIMELINE_DEBUG_MODE = 'timeline-debug-mode',
  DURABLE_MESSAGES = 'durable-messages',
  JPEG_XL = 'jpeg-xl',
  // Adding or removing an entry from this enum?
  // You will need to update:
  // 1. DevToolsExperiments enum in host/UserMetrics.ts
  // 2. Maybe REGISTERED_EXPERIMENTS in EnvironmentHelpers.ts (to create this experiment in the test env)
}
