// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

// eslint-disable-next-line @devtools/es-modules-import
import * as SDK from './sdk.js';

describe('TargetManager API Test', () => {
  it('suspends and resumes all targets and their agents', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget, 'Primary page target should exist');

    await inspectedPage.goToHtml('<h1>TargetManager Suspend Test</h1>');

    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel, 'DOMModel should exist');
    await domModel.requestDocument();
    assert.isNotNull(domModel.existingDocument(), 'DOM document should be loaded');

    const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel, 'DebuggerModel should exist');
    assert.isTrue(debuggerModel.debuggerEnabled(), 'Debugger should be enabled initially');

    const cssModel = primaryTarget.model(SDK.CSSModel.CSSModel);
    assert.isNotNull(cssModel, 'CSSModel should exist');
    assert.isTrue(cssModel.isEnabled(), 'CSSModel should be enabled initially');

    assert.isFalse(universe.targetManager.allTargetsSuspended());
    assert.isFalse(primaryTarget.suspended());

    let suspendStateChangedEventsCount = 0;
    const listener = (): void => {
      suspendStateChangedEventsCount++;
    };
    universe.targetManager.addEventListener(SDK.TargetManager.Events.SUSPEND_STATE_CHANGED, listener);

    await universe.targetManager.suspendAllTargets();

    assert.isTrue(universe.targetManager.allTargetsSuspended(), 'All targets should be suspended');
    assert.isTrue(primaryTarget.suspended(), 'Primary target should be suspended');
    assert.isNull(domModel.existingDocument(), 'DOM document should be cleared on suspend');
    assert.isFalse(debuggerModel.debuggerEnabled(), 'Debugger should be disabled after suspend');
    assert.isFalse(cssModel.isEnabled(), 'CSSModel should be disabled after suspend');
    assert.strictEqual(suspendStateChangedEventsCount, 1, 'Suspend state changed event should have fired once');

    await universe.targetManager.resumeAllTargets();

    assert.isFalse(universe.targetManager.allTargetsSuspended(), 'Targets should not be suspended after resume');
    assert.isFalse(primaryTarget.suspended(), 'Primary target should not be suspended after resume');
    assert.isTrue(debuggerModel.debuggerEnabled(), 'Debugger should be re-enabled after resume');
    assert.isTrue(cssModel.isEnabled(), 'CSSModel should be re-enabled after resume');
    assert.strictEqual(suspendStateChangedEventsCount, 2, 'Suspend state changed event should have fired twice');

    universe.targetManager.removeEventListener(SDK.TargetManager.Events.SUSPEND_STATE_CHANGED, listener);
  });
});
