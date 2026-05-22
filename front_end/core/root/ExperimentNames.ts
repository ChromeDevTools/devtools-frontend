// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export enum ExperimentName {
  ALL = '*',
  PROTOCOL_MONITOR = 'protocol-monitor',
  INSTRUMENTATION_BREAKPOINTS = 'instrumentation-breakpoints',
  USE_SOURCE_MAP_SCOPES = 'use-source-map-scopes',
  DURABLE_MESSAGES = 'durable-messages',
  JPEG_XL = 'jpeg-xl',
  PLUS_BUTTON = 'plus-button',
  // Adding or removing an entry from this enum?
  // You will need to update:
  // 1. DevToolsExperiments enum in host/UserMetrics.ts
  // 2. Maybe REGISTERED_EXPERIMENTS in EnvironmentHelpers.ts (to create this experiment in the test env)
}
