// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createContentProviderUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as Workspace from '../workspace/workspace.js';

import * as Breakpoints from './breakpoints.js';

const {urlString} = Platform.DevToolsPath;

describe('RecurringPauseDetector', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;
  let debuggerModel: sinon.SinonStubbedInstance<SDK.DebuggerModel.DebuggerModel>;
  let uiSourceCode: Workspace.UISourceCode.UISourceCode;
  let detector: Breakpoints.RecurringPauseDetector.RecurringPauseDetector;

  beforeEach(() => {
    universe = new TestUniverse();
    const target = sinon.createStubInstance(SDK.Target.Target);
    target.id.returns('main' as Protocol.Target.TargetID);
    debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
    debuggerModel.target.returns(target);
    debuggerModel.runtimeModel.returns(sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel));
    debuggerModel.scriptForId.returns(sinon.createStubInstance(SDK.Script.Script));
    debuggerModel.isPaused.returns(true);

    ({uiSourceCode} = createContentProviderUISourceCode({
       url: urlString`https://example.com/app.js`,
       mimeType: 'text/javascript',
       projectType: Workspace.Workspace.projectTypes.Network,
       universe,
     }));
    sinon.stub(universe.debuggerWorkspaceBinding, 'rawLocationToUILocation')
        .callsFake(async loc => uiSourceCode.uiLocation(loc.lineNumber, loc.columnNumber));
    detector = new Breakpoints.RecurringPauseDetector.RecurringPauseDetector(
        universe.debuggerWorkspaceBinding, universe.breakpointManager, universe.settings);
  });

  afterEach(() => {
    universe.dispose();
  });

  function createPausedDetails(options: {
    lineNumber?: number,
    reason?: Protocol.Debugger.PausedEventReason,
    auxData?: Record<string, unknown>,
    hasCallFrames?: boolean,
  } = {}): SDK.DebuggerModel.DebuggerPausedDetails {
    const callFrames: Protocol.Debugger.CallFrame[] = options.hasCallFrames === false ? [] : [{
      callFrameId: 'frame-1' as Protocol.Debugger.CallFrameId,
      functionName: 'tick',
      location: {scriptId: '1' as Protocol.Runtime.ScriptId, lineNumber: options.lineNumber ?? 4, columnNumber: 2},
      url: 'https://example.com/app.js',
      scopeChain: [],
      this: {type: Protocol.Runtime.RemoteObjectType.Object},
    }];
    return new SDK.DebuggerModel.DebuggerPausedDetails(
        debuggerModel, callFrames, options.reason ?? Protocol.Debugger.PausedEventReason.Other, options.auxData, []);
  }

  it('returns no actions on the first pause or when re-evaluating the same pause details', async () => {
    const firstPause = createPausedDetails();
    assert.deepEqual(await detector.onPaused(firstPause), {});
    assert.deepEqual(await detector.onPaused(firstPause), {});
  });

  it('disables the active breakpoint while keeping its condition on a recurring hit', async () => {
    const condition = 'i > 0' as Breakpoints.BreakpointManager.UserCondition;
    const existing = await universe.breakpointManager.setBreakpoint(
        uiSourceCode, 4, 2, condition, /* enabled */ true, /* isLogpoint */ false,
        Breakpoints.BreakpointManager.BreakpointOrigin.USER_ACTION);
    assert.exists(existing);

    await detector.onPaused(createPausedDetails());
    await detector.onPaused(null);
    const actions = await detector.onPaused(createPausedDetails());

    assert.exists(actions.disableBreakpoint);
    assert.isUndefined(actions.neverPauseHere);
    assert.isFunction(actions.deactivateBreakpointsAndResume);
    await actions.disableBreakpoint();
    assert.isFalse(existing.enabled());
    assert.strictEqual(existing.condition(), condition);
    sinon.assert.calledOnce(debuggerModel.resume);
  });

  it('creates a never-pause-here breakpoint when no breakpoint exists at the location', async () => {
    const breakpointsActive = universe.settings.resolve(SDK.SDKSettings.breakpointsActiveSettingDescriptor);
    breakpointsActive.set(false);

    await detector.onPaused(createPausedDetails());
    await detector.onPaused(null);
    const actions = await detector.onPaused(createPausedDetails());

    assert.isUndefined(actions.disableBreakpoint);
    assert.exists(actions.neverPauseHere);
    assert.isUndefined(actions.deactivateBreakpointsAndResume);
    await actions.neverPauseHere();
    assert.isTrue(breakpointsActive.get());
    const locations = universe.breakpointManager.breakpointLocationsForUISourceCode(uiSourceCode);
    assert.lengthOf(locations, 1);
    assert.strictEqual(locations[0].breakpoint.condition(), Breakpoints.BreakpointManager.NEVER_PAUSE_HERE_CONDITION);
    assert.isTrue(locations[0].breakpoint.enabled());
    sinon.assert.calledOnce(debuggerModel.resume);
  });

  it('deactivates breakpoints globally when deactivateBreakpointsAndResume runs', async () => {
    const breakpointsActive = universe.settings.resolve(SDK.SDKSettings.breakpointsActiveSettingDescriptor);
    await detector.onPaused(createPausedDetails());
    await detector.onPaused(null);
    const secondPause = createPausedDetails();
    const actions = await detector.onPaused(secondPause);

    assert.exists(actions.deactivateBreakpointsAndResume);
    actions.deactivateBreakpointsAndResume();
    assert.isFalse(breakpointsActive.get());
    sinon.assert.calledOnce(debuggerModel.resume);
    assert.isUndefined((await detector.onPaused(secondPause)).deactivateBreakpointsAndResume);
  });

  it('resets the recurring pause count when pausing elsewhere or after the time window expires', async () => {
    const clock = sinon.useFakeTimers({now: 1_000, toFake: ['Date']});
    try {
      await detector.onPaused(createPausedDetails({lineNumber: 4}));
      clock.tick(100);
      assert.deepEqual(await detector.onPaused(createPausedDetails({lineNumber: 5})), {});
      clock.tick(Breakpoints.RecurringPauseDetector.RECURRING_PAUSE_WINDOW_MS + 1);
      assert.deepEqual(await detector.onPaused(createPausedDetails({lineNumber: 5})), {});
      clock.tick(Breakpoints.RecurringPauseDetector.RECURRING_PAUSE_WINDOW_MS);
      const actions = await detector.onPaused(createPausedDetails({lineNumber: 5}));
      assert.isFunction(actions.neverPauseHere);
      assert.isFunction(actions.deactivateBreakpointsAndResume);
    } finally {
      clock.restore();
    }
  });

  it('ignores stepping and out-of-memory pauses', async () => {
    for (const reason of [Protocol.Debugger.PausedEventReason.Step, Protocol.Debugger.PausedEventReason.OOM]) {
      await detector.onPaused(createPausedDetails({reason}));
      assert.deepEqual(await detector.onPaused(createPausedDetails({reason})), {});
    }
  });

  it('omits neverPauseHere for pauses without a code location', async () => {
    const xhrPause = {
      reason: Protocol.Debugger.PausedEventReason.XHR,
      auxData: {url: urlString`https://example.com/api`},
      hasCallFrames: false,
    };
    await detector.onPaused(createPausedDetails(xhrPause));
    const actions = await detector.onPaused(createPausedDetails(xhrPause));
    assert.isFunction(actions.deactivateBreakpointsAndResume);
    assert.isUndefined(actions.neverPauseHere);
  });

  it('omits neverPauseHere when conditional breakpoints are unsupported', async () => {
    sinon.stub(universe.breakpointManager, 'supportsConditionalBreakpoints').returns(false);
    await detector.onPaused(createPausedDetails({reason: Protocol.Debugger.PausedEventReason.DebugCommand}));
    const actions =
        await detector.onPaused(createPausedDetails({reason: Protocol.Debugger.PausedEventReason.DebugCommand}));
    assert.isFunction(actions.deactivateBreakpointsAndResume);
    assert.isUndefined(actions.neverPauseHere);
  });
});
