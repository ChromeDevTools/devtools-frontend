// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as ProtocolClient from '../../../../../front_end/core/protocol_client/protocol_client.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import type * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import * as InspectorMain from '../../../../../front_end/entrypoints/inspector_main/inspector_main.js';
import {
  createTarget,
  stubNoopSettings,
} from '../../helpers/EnvironmentHelpers.js';

import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';

describeWithMockConnection('FocusDebuggeeActionDelegate', () => {
  it('uses main frame without tab tatget', async () => {
    const target = createTarget();
    const delegate = InspectorMain.InspectorMain.FocusDebuggeeActionDelegate.instance({forceNew: true});
    const bringToFront = sinon.spy(target.pageAgent(), 'invoke_bringToFront');
    delegate.handleAction({} as UI.Context.Context, 'foo');
    assert.isTrue(bringToFront.calledOnce);
  });

  it('uses main frame with tab tatget', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const frameTarget = createTarget({parentTarget: tabTarget});
    const delegate = InspectorMain.InspectorMain.FocusDebuggeeActionDelegate.instance({forceNew: true});
    const bringToFront = sinon.spy(frameTarget.pageAgent(), 'invoke_bringToFront');
    delegate.handleAction({} as UI.Context.Context, 'foo');
    assert.isTrue(bringToFront.calledOnce);
  });
});

describeWithMockConnection('InspectorMainImpl', () => {
  const DEBUGGER_ID = 'debuggerId' as Protocol.Runtime.UniqueDebuggerId;

  beforeEach(() => {
    stubNoopSettings();
    sinon.stub(ProtocolClient.InspectorBackend.Connection, 'setFactory');
  });

  it('sets main target type to Node if v8only query param present', async () => {
    const inspectorMain = InspectorMain.InspectorMain.InspectorMainImpl.instance({forceNew: true});
    Root.Runtime.Runtime.setQueryParamForTesting('v8only', 'true');
    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());
    await inspectorMain.run();

    assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.type(), SDK.Target.Type.Node);
    Root.Runtime.Runtime.setQueryParamForTesting('v8only', '');
  });

  it('sets main target type to Tab if targetType=tab query param present', async () => {
    const inspectorMain = InspectorMain.InspectorMain.InspectorMainImpl.instance({forceNew: true});
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());
    await inspectorMain.run();

    assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.type(), SDK.Target.Type.Tab);
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', '');
  });

  it('sets main target type to Frame by default', async () => {
    const inspectorMain = InspectorMain.InspectorMain.InspectorMainImpl.instance({forceNew: true});
    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());
    await inspectorMain.run();

    assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.type(), SDK.Target.Type.Frame);
  });

  it('creates main target waiting for debugger if the main target is frame and panel is sources', async () => {
    const inspectorMain = InspectorMain.InspectorMain.InspectorMainImpl.instance({forceNew: true});
    Root.Runtime.Runtime.setQueryParamForTesting('panel', 'sources');
    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());

    const waitForDebugger = sinon.spy();
    const debuggerPause = sinon.spy();
    setMockConnectionResponseHandler('Page.waitForDebugger', waitForDebugger);
    setMockConnectionResponseHandler('Debugger.enable', () => ({debuggerId: DEBUGGER_ID}));
    setMockConnectionResponseHandler('Debugger.pause', debuggerPause);
    await inspectorMain.run();
    assert.isTrue(waitForDebugger.calledOnce);
    assert.isTrue(debuggerPause.calledOnce);

    Root.Runtime.Runtime.setQueryParamForTesting('panel', '');
  });

  it('wait for Debugger.enable before calling Debugger.pause', async () => {
    const inspectorMain = InspectorMain.InspectorMain.InspectorMainImpl.instance({forceNew: true});
    Root.Runtime.Runtime.setQueryParamForTesting('panel', 'sources');
    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());

    const debuggerPause = sinon.stub();
    setMockConnectionResponseHandler('Debugger.pause', debuggerPause);
    const debuggerPauseCalled = new Promise<void>(resolve => debuggerPause.callsFake(resolve));

    let debuggerEnable = (_: Protocol.Debugger.EnableResponse) => {};
    setMockConnectionResponseHandler('Debugger.enable', () => new Promise<Protocol.Debugger.EnableResponse>(resolve => {
                                                          debuggerEnable = resolve;
                                                        }));

    assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());
    const result = inspectorMain.run();
    assert.isFalse(debuggerPause.called);
    debuggerEnable({debuggerId: DEBUGGER_ID, getError: () => undefined});
    await Promise.all([debuggerPauseCalled, result]);
    assert.isTrue(debuggerPause.calledOnce);
    Root.Runtime.Runtime.setQueryParamForTesting('panel', '');
  });

  it('calls Runtime.runIfWaitingForDebugger for Node target', async () => {
    Root.Runtime.Runtime.setQueryParamForTesting('v8only', 'true');
    const inspectorMain = InspectorMain.InspectorMain.InspectorMainImpl.instance({forceNew: true});
    const runIfWaitingForDebugger = sinon.spy();
    setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    await inspectorMain.run();
    assert.isTrue(runIfWaitingForDebugger.calledOnce);
    Root.Runtime.Runtime.setQueryParamForTesting('v8only', '');
  });

  it('calls Runtime.runIfWaitingForDebugger for frame target', async () => {
    const inspectorMain = InspectorMain.InspectorMain.InspectorMainImpl.instance({forceNew: true});
    const runIfWaitingForDebugger = sinon.spy();
    setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    await inspectorMain.run();
    assert.isTrue(runIfWaitingForDebugger.calledOnce);
  });

  it('does not call Runtime.runIfWaitingForDebugger for Tab target', async () => {
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
    const inspectorMain = InspectorMain.InspectorMain.InspectorMainImpl.instance({forceNew: true});
    const runIfWaitingForDebugger = sinon.spy();
    setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    await inspectorMain.run();
    assert.isFalse(runIfWaitingForDebugger.called);
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', '');
  });

  it('sets frame target to "main"', async () => {
    const inspectorMain = InspectorMain.InspectorMain.InspectorMainImpl.instance({forceNew: true});
    const runIfWaitingForDebugger = sinon.spy();
    setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    await inspectorMain.run();
    assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.name(), 'Main');
  });

  it('sets tab target to "tab"', async () => {
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
    const inspectorMain = InspectorMain.InspectorMain.InspectorMainImpl.instance({forceNew: true});
    const runIfWaitingForDebugger = sinon.spy();
    setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    await inspectorMain.run();
    assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.name(), 'Tab');
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', '');
  });

  it('sets main frame target to "main"', async () => {
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
    const inspectorMain = InspectorMain.InspectorMain.InspectorMainImpl.instance({forceNew: true});
    const runIfWaitingForDebugger = sinon.spy();
    setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
    await inspectorMain.run();
    const prerenderTarget = createTarget(
        {parentTarget: SDK.TargetManager.TargetManager.instance().rootTarget() || undefined, subtype: 'prerender'});
    const mainFrameTarget =
        createTarget({parentTarget: SDK.TargetManager.TargetManager.instance().rootTarget() || undefined});
    assert.notStrictEqual(prerenderTarget.name(), 'Main');
    assert.strictEqual(mainFrameTarget.name(), 'Main');
    Root.Runtime.Runtime.setQueryParamForTesting('targetType', '');
  });
});
