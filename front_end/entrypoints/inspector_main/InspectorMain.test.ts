// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as InspectorMain from './inspector_main.js';

describeWithEnvironment('FocusDebuggeeActionDelegate', () => {
  afterEach(() => {
    SDK.TargetManager.TargetManager.removeInstance();
  });

  it('uses main frame', async () => {
    const connection = new MockCDPConnection();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB, connection});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const frameTarget = createTarget({parentTarget: tabTarget});
    const delegate = new InspectorMain.InspectorMain.FocusDebuggeeActionDelegate();
    const bringToFront = sinon.spy(frameTarget.pageAgent(), 'invoke_bringToFront');
    delegate.handleAction({} as UI.Context.Context, 'foo');
    sinon.assert.calledOnce(bringToFront);
  });
});

describeWithEnvironment('InspectorMainImpl', () => {
  const DEBUGGER_ID = 'debuggerId' as Protocol.Runtime.UniqueDebuggerId;
  let connection: MockCDPConnection;

  const runForTabTarget = async () => {
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    const runPromise = inspectorMain.run();
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    SDK.TargetManager.TargetManager.instance().createTarget('someTargetID' as Protocol.Target.TargetID, 'someName',
                                                            SDK.Target.Type.FRAME, rootTarget, 'session ID',
                                                            /* waitForDebuggerInPage= */ undefined, connection);
    await runPromise;
  };

  beforeEach(() => {
    connection = new MockCDPConnection();
    sinon.stub(ProtocolClient.ConnectionTransport.ConnectionTransport, 'setFactory');
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const originalCreateTarget = targetManager.createTarget;
    sinon.stub(targetManager, 'createTarget')
        .callsFake((id, name, type, parentTarget, sessionId, waitForDebuggerInPage, conn, targetInfo) => {
          return originalCreateTarget.call(targetManager, id, name, type, parentTarget, sessionId,
                                           waitForDebuggerInPage, conn || connection, targetInfo);
        });
  });

  afterEach(() => {
    SDK.TargetManager.TargetManager.removeInstance();
  });

  it('continues only after primary page target is available', async () => {
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    let finished = false;
    inspectorMain.run()
        .then(() => {
          finished = true;
        })
        .catch(e => {
          throw e;
        });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(finished);
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    SDK.TargetManager.TargetManager.instance().createTarget('someTargetID' as Protocol.Target.TargetID, 'someName',
                                                            SDK.Target.Type.FRAME, rootTarget, 'session ID');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(finished);
  });

  it('sets main target type to Node if v8only query param present', async () => {
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    Root.Runtime.Runtime.setQueryParamForTesting('v8only', 'true');
    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());
    await inspectorMain.run();

    assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.type(), SDK.Target.Type.NODE);
    Root.Runtime.Runtime.setQueryParamForTesting('v8only', '');
  });

  it('sets main target type to Tab if targetType=tab query param present', async () => {
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());
    await runForTabTarget();

    assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.type(), SDK.Target.Type.TAB);
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', '');
  });

  it('sets main target type to Frame by default', async () => {
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());
    await inspectorMain.run();

    assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.type(), SDK.Target.Type.FRAME);
  });

  it('creates main target waiting for debugger if the main target is frame and panel is sources', async () => {
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    Root.Runtime.Runtime.setQueryParamForTesting('panel', 'sources');
    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());

    const waitForDebugger = sinon.spy();
    const debuggerPause = sinon.spy();
    connection.setSuccessHandler('Page.waitForDebugger', waitForDebugger);
    connection.setSuccessHandler('Debugger.enable', () => ({debuggerId: DEBUGGER_ID}));
    connection.setSuccessHandler('Debugger.pause', debuggerPause);
    await inspectorMain.run();
    sinon.assert.calledOnce(waitForDebugger);
    sinon.assert.calledOnce(debuggerPause);

    Root.Runtime.Runtime.setQueryParamForTesting('panel', '');
  });

  it('wait for Debugger.enable before calling Debugger.pause', async () => {
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    Root.Runtime.Runtime.setQueryParamForTesting('panel', 'sources');
    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());

    const debuggerPause = sinon.stub();
    connection.setSuccessHandler('Debugger.pause', debuggerPause);
    const debuggerPauseCalled = expectCall(debuggerPause);

    let debuggerEnable = (_: {result: Protocol.Debugger.EnableResponse}): void => {};
    connection.setHandler('Debugger.enable', () => new Promise<{result: Protocol.Debugger.EnableResponse}>(resolve => {
                                               debuggerEnable = resolve;
                                             }));

    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());
    const result = inspectorMain.run();
    sinon.assert.notCalled(debuggerPause);
    debuggerEnable({result: {debuggerId: DEBUGGER_ID, getError: () => undefined}});
    await Promise.all([debuggerPauseCalled, result]);
    sinon.assert.calledOnce(debuggerPause);
    Root.Runtime.Runtime.setQueryParamForTesting('panel', '');
  });

  it('frontend correctly registers if Debugger.enable fails', async () => {
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());

    connection.setFailureHandler('Debugger.enable',
                                 () => ({
                                   message: 'Debugger.enable failed',
                                   code: ProtocolClient.CDPConnection.CDPErrorStatus.DEVTOOLS_STUB_ERROR,
                                 }));
    await inspectorMain.run();

    const target = SDK.TargetManager.TargetManager.instance().rootTarget();
    assert.isNotNull(target);
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
    assert.isFalse(debuggerModel.debuggerEnabled());
  });

  it('calls Runtime.runIfWaitingForDebugger for Node target', async () => {
    Root.Runtime.Runtime.setQueryParamForTesting('v8only', 'true');
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    const runIfWaitingForDebugger = sinon.spy();
    connection.setSuccessHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    await inspectorMain.run();
    sinon.assert.calledOnce(runIfWaitingForDebugger);
    Root.Runtime.Runtime.setQueryParamForTesting('v8only', '');
  });

  it('calls Runtime.runIfWaitingForDebugger for frame target', async () => {
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    const runIfWaitingForDebugger = sinon.spy();
    connection.setSuccessHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    await inspectorMain.run();
    sinon.assert.calledOnce(runIfWaitingForDebugger);
  });

  it('does not call Runtime.runIfWaitingForDebugger for Tab target', async () => {
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
    const runIfWaitingForDebugger = sinon.spy();
    connection.setSuccessHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    await runForTabTarget();
    sinon.assert.notCalled(runIfWaitingForDebugger);
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', '');
  });

  it('sets frame target to "main"', async () => {
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    const runIfWaitingForDebugger = sinon.spy();
    connection.setSuccessHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    await inspectorMain.run();
    assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.name(), 'Main');
  });

  it('sets tab target to "tab"', async () => {
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
    const runIfWaitingForDebugger = sinon.spy();
    connection.setSuccessHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    await runForTabTarget();
    assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.name(), 'Tab');
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', '');
  });

  it('sets main frame target to "main"', async () => {
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    const runIfWaitingForDebugger = sinon.spy();
    connection.setSuccessHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    const runPromise = inspectorMain.run();
    const prerenderTarget = createTarget({
      parentTarget: SDK.TargetManager.TargetManager.instance().rootTarget() || undefined,
      subtype: 'prerender',
    });
    const mainFrameTarget = createTarget({
      parentTarget: SDK.TargetManager.TargetManager.instance().rootTarget() || undefined,
    });
    await runPromise;
    assert.notStrictEqual(prerenderTarget.name(), 'Main');
    assert.strictEqual(mainFrameTarget.name(), 'Main');
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', '');
  });

  it('checks for a form repost if the host requests a reload of the inspected page', async () => {
    const reloadAllPages = sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'reloadAllPages');
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    await inspectorMain.run();

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.ReloadInspectedPage, true);

    sinon.assert.called(reloadAllPages);
    sinon.assert.alwaysCalledWithExactly(reloadAllPages, SDK.TargetManager.TargetManager.instance(), true, undefined,
                                         true);
  });
});

describe('ReloadActionDelegate', () => {
  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
  });

  afterEach(() => {
    universe.dispose();
  });

  for (const {actionId, bypassCache} of [{actionId: 'inspector-main.reload', bypassCache: false},
                                         {actionId: 'inspector-main.hard-reload', bypassCache: true},
  ]) {
    it(`checks for a form repost for ${actionId}`, () => {
      const reloadAllPages = sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'reloadAllPages');
      const delegate = new InspectorMain.InspectorMain.ReloadActionDelegate();

      assert.isTrue(delegate.handleAction(UI.Context.Context.instance({forceNew: true}), actionId));

      sinon.assert.calledOnceWithExactly(reloadAllPages, universe.targetManager, bypassCache, undefined, true);
    });
  }
});

describe('BackendSettingsSync', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(Common.Settings.Settings, 'instance').returns(universe.settings);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
  });

  afterEach(() => {
    universe.dispose();
  });

  function setupSyncWithTargets() {
    const connection = new MockCDPConnection();
    const setFocusEmulationEnabled = sinon.spy();
    const setAdBlockingEnabled = sinon.spy();
    connection.setSuccessHandler('Emulation.setFocusEmulationEnabled', setFocusEmulationEnabled);
    connection.setSuccessHandler('Page.setAdBlockingEnabled', setAdBlockingEnabled);

    const tabTarget =
        universe.createTarget({id: 'tab' as Protocol.Target.TargetID, type: SDK.Target.Type.TAB, connection});
    const primaryTarget = universe.createTarget({id: 'primary' as Protocol.Target.TargetID, parentTarget: tabTarget});
    universe.createTarget({id: 'iframe' as Protocol.Target.TargetID, parentTarget: primaryTarget});
    universe.createTarget({
      id: 'worker' as Protocol.Target.TargetID,
      type: SDK.Target.Type.Worker,
      parentTarget: primaryTarget,
    });
    universe.createTarget({
      id: 'service-worker' as Protocol.Target.TargetID,
      type: SDK.Target.Type.ServiceWorker,
      parentTarget: tabTarget,
    });

    new InspectorMain.InspectorMain.BackendSettingsSync();
    return {
      setFocusEmulationEnabled,
      setAdBlockingEnabled,
      tabTarget,
      primaryTarget,
    };
  }

  it('syncs emulate-page-focus setting changes only to the outermost frame target', () => {
    const {setFocusEmulationEnabled, setAdBlockingEnabled} = setupSyncWithTargets();
    const emulatePageFocusSetting = universe.settings.resolve(SDK.SDKSettings.emulatePageFocusSettingDescriptor);

    assert.isFalse(emulatePageFocusSetting.get());
    assert.deepEqual(setFocusEmulationEnabled.args, [[{enabled: false}, 'primary']]);
    assert.deepEqual(setAdBlockingEnabled.args, [[{enabled: false}, 'primary']]);

    emulatePageFocusSetting.set(true);
    assert.deepEqual(setFocusEmulationEnabled.args, [
      [{enabled: false}, 'primary'],
      [{enabled: true}, 'primary'],
    ]);
    assert.deepEqual(setAdBlockingEnabled.args, [
      [{enabled: false}, 'primary'],
      [{enabled: false}, 'primary'],
    ]);

    emulatePageFocusSetting.set(false);
    assert.deepEqual(setFocusEmulationEnabled.args, [
      [{enabled: false}, 'primary'],
      [{enabled: true}, 'primary'],
      [{enabled: false}, 'primary'],
    ]);
  });

  it('applies current focus emulation setting only to newly added outermost frame targets', () => {
    const {tabTarget, primaryTarget, setFocusEmulationEnabled, setAdBlockingEnabled} = setupSyncWithTargets();
    const emulatePageFocusSetting = universe.settings.resolve(SDK.SDKSettings.emulatePageFocusSettingDescriptor);

    emulatePageFocusSetting.set(true);
    setFocusEmulationEnabled.resetHistory();
    setAdBlockingEnabled.resetHistory();

    universe.createTarget({id: 'new-iframe' as Protocol.Target.TargetID, parentTarget: primaryTarget});
    universe.createTarget({
      id: 'new-worker' as Protocol.Target.TargetID,
      type: SDK.Target.Type.Worker,
      parentTarget: primaryTarget,
    });
    sinon.assert.notCalled(setFocusEmulationEnabled);
    sinon.assert.notCalled(setAdBlockingEnabled);

    universe.createTarget({id: 'prerender' as Protocol.Target.TargetID, parentTarget: tabTarget, subtype: 'prerender'});
    assert.deepEqual(setFocusEmulationEnabled.args, [[{enabled: true}, 'prerender']]);
    assert.deepEqual(setAdBlockingEnabled.args, [[{enabled: false}, 'prerender']]);
  });
});
