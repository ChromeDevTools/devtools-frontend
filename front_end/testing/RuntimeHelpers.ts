// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../core/root/root.js';

/**
 * @deprecated we prefer using HostConfig to control DevTools features.
 */
const REGISTERED_EXPERIMENTS = [
  Root.Runtime.ExperimentName.CAPTURE_NODE_CREATION_STACKS,
  Root.Runtime.ExperimentName.PROTOCOL_MONITOR,
  'timeline-show-all-events',
  'timeline-v8-runtime-call-stats',
  'timeline-invalidation-tracking',
  Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS,
  Root.Runtime.ExperimentName.HEADER_OVERRIDES,
  Root.Runtime.ExperimentName.USE_SOURCE_MAP_SCOPES,
  'font-editor',
  Root.Runtime.ExperimentName.TIMELINE_DEBUG_MODE,
  Root.Runtime.ExperimentName.FULL_ACCESSIBILITY_TREE,
  Root.Runtime.ExperimentName.TIMELINE_SHOW_POST_MESSAGE_EVENTS,
];

export function setupRuntime() {
  Root.Runtime.experiments.clearForTest();
  for (const experimentName of REGISTERED_EXPERIMENTS) {
    Root.Runtime.experiments.register(experimentName, '');
  }
}

export function cleanupRuntime() {
  Root.Runtime.experiments.clearForTest();
  Root.Runtime.Runtime.removeInstance();
}

export function setupRuntimeHooks() {
  beforeEach(setupRuntime);
  afterEach(cleanupRuntime);
}
