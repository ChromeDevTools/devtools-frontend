// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import sinon from 'sinon';

import * as Platform from '../core/platform/platform.js';
import * as Root from '../core/root/root.js';

export function setupRuntime(): void {
  if (!Root.Runtime.getChromeVersion()) {
    sinon.stub(Platform.HostRuntime.HOST_RUNTIME, 'getUserAgent').returns('Chrome/unit_test');
  }
  for (const key of Object.keys(Root.Runtime.hostConfig)) {
    // @ts-expect-error TypeScript does not deduce the correct type
    delete Root.Runtime.hostConfig[key];
  }
  Root.Runtime.experiments.clearForTest();

  // The Instrumentation breakpoints experiment is used by the very universal BreakpointManager.
  Root.Runtime.experiments.register({
    name: Root.ExperimentNames.ExperimentName.INSTRUMENTATION_BREAKPOINTS,
    title: 'Instrumentation breakpoints',
    aboutFlag: 'devtools-instrumentation-breakpoints',
    isEnabled: false,
    requiresChromeRestart: false,
  });
}

export function cleanupRuntime(): void {
  for (const key of Object.keys(Root.Runtime.hostConfig)) {
    // @ts-expect-error TypeScript does not deduce the correct type
    delete Root.Runtime.hostConfig[key];
  }
  Root.Runtime.experiments.clearForTest();
  Root.Runtime.Runtime.removeInstance();
}

export function setupRuntimeHooks(): void {
  beforeEach(setupRuntime);
  afterEach(cleanupRuntime);
}
