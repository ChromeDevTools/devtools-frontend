// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
  stubNoopSettings,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import type * as UI from '../../ui/legacy/legacy.js';

import * as InspectorMain from './inspector_main.js';

describeWithMockConnection('FocusDebuggeeActionDelegate', () => {
  it('uses main frame', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const frameTarget = createTarget({parentTarget: tabTarget});
    const delegate = new InspectorMain.InspectorMain.FocusDebuggeeActionDelegate();
    const bringToFront = sinon.spy(frameTarget.pageAgent(), 'invoke_bringToFront');
    delegate.handleAction({} as UI.Context.Context, 'foo');
    sinon.assert.calledOnce(bringToFront);
  });
});

describeWithMockConnection('InspectorMainImpl', () => {
  const DEBUGGER_ID = 'debuggerId' as Protocol.Runtime.UniqueDebuggerId;

  const runForTabTarget = async () => {
    const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
    const runPromise = inspectorMain.run();
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    SDK.TargetManager.TargetManager.instance().createTarget(
        'someTargetID' as Protocol.Target.TargetID, 'someName', SDK.Target.Type.FRAME, rootTarget, 'session ID');
    await runPromise;
  };

  beforeEach(() => {
    sinon.stub(ProtocolClient.ConnectionTransport.ConnectionTransport, 'setFactory');
  });

  describe('withNoopSettings', () => {
    beforeEach(() => {
      stubNoopSettings();
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
      SDK.TargetManager.TargetManager.instance().createTarget(
          'someTargetID' as Protocol.Target.TargetID, 'someName', SDK.Target.Type.FRAME, rootTarget, 'session ID');
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
      setMockConnectionResponseHandler('Page.waitForDebugger', waitForDebugger);
      setMockConnectionResponseHandler('Debugger.enable', () => ({debuggerId: DEBUGGER_ID}));
      setMockConnectionResponseHandler('Debugger.pause', debuggerPause);
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
      setMockConnectionResponseHandler('Debugger.pause', debuggerPause);
      const debuggerPauseCalled = expectCall(debuggerPause);

      let debuggerEnable = (_: Protocol.Debugger.EnableResponse): void => {};
      setMockConnectionResponseHandler(
          'Debugger.enable', () => new Promise<Omit<Protocol.Debugger.EnableResponse, 'getError'>>(resolve => {
                               debuggerEnable = resolve;
                             }));

      assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());
      const result = inspectorMain.run();
      sinon.assert.notCalled(debuggerPause);
      debuggerEnable({debuggerId: DEBUGGER_ID, getError: () => undefined});
      await Promise.all([debuggerPauseCalled, result]);
      sinon.assert.calledOnce(debuggerPause);
      Root.Runtime.Runtime.setQueryParamForTesting('panel', '');
    });

    it('frontend correctly registers if Debugger.enable fails', async () => {
      const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
      assert.notExists(SDK.TargetManager.TargetManager.instance().rootTarget());

      setMockConnectionResponseHandler('Debugger.enable', () => ({getError: () => 'Debugger.enable failed'}));
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
      setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
      await inspectorMain.run();
      sinon.assert.calledOnce(runIfWaitingForDebugger);
      Root.Runtime.Runtime.setQueryParamForTesting('v8only', '');
    });

    it('calls Runtime.runIfWaitingForDebugger for frame target', async () => {
      const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
      const runIfWaitingForDebugger = sinon.spy();
      setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
      await inspectorMain.run();
      sinon.assert.calledOnce(runIfWaitingForDebugger);
    });

    it('does not call Runtime.runIfWaitingForDebugger for Tab target', async () => {
      Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
      const runIfWaitingForDebugger = sinon.spy();
      setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
      await runForTabTarget();
      sinon.assert.notCalled(runIfWaitingForDebugger);
      Root.Runtime.Runtime.setQueryParamForTesting('targetType', '');
    });

    it('sets frame target to "main"', async () => {
      const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
      const runIfWaitingForDebugger = sinon.spy();
      setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
      await inspectorMain.run();
      assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.name(), 'Main');
    });

    it('sets tab target to "tab"', async () => {
      Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
      const runIfWaitingForDebugger = sinon.spy();
      setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
      await runForTabTarget();
      assert.strictEqual(SDK.TargetManager.TargetManager.instance().rootTarget()?.name(), 'Tab');
      Root.Runtime.Runtime.setQueryParamForTesting('targetType', '');
    });

    it('sets main frame target to "main"', async () => {
      Root.Runtime.Runtime.setQueryParamForTesting('targetType', 'tab');
      const inspectorMain = new InspectorMain.InspectorMain.InspectorMainImpl();
      const runIfWaitingForDebugger = sinon.spy();
      setMockConnectionResponseHandler('Runtime.runIfWaitingForDebugger', runIfWaitingForDebugger);
      const runPromise = inspectorMain.run();
      const prerenderTarget = createTarget(
          {parentTarget: SDK.TargetManager.TargetManager.instance().rootTarget() || undefined, subtype: 'prerender'});
      const mainFrameTarget =
          createTarget({parentTarget: SDK.TargetManager.TargetManager.instance().rootTarget() || undefined});
      await runPromise;
      assert.notStrictEqual(prerenderTarget.name(), 'Main');
      assert.strictEqual(mainFrameTarget.name(), 'Main');
      Root.Runtime.Runtime.setQueryParamForTesting('targetType', '');
    });
  });
});
