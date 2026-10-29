// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {createTarget, describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';

import * as App from './app.js';

describeWithEnvironment('NodeChildTargetManager', () => {
  it('attaches Node.js targets without a parent target', () => {
    const browserTarget = createTarget({type: SDK.Target.Type.BROWSER});
    const childTargetManager = browserTarget.model(App.NodeMain.NodeChildTargetManager);
    assert.exists(childTargetManager);

    void childTargetManager.attachedToTarget({
      sessionId: 'session ID' as Protocol.Target.SessionID,
      targetInfo: {
        attached: true,
        targetId: 'node js target' as Protocol.Target.TargetID,
        type: 'other',
        title: 'my node target',
        url: 'file:///some/script.js',
        canAccessOpener: false,
      },
      waitingForDebugger: true,
    });

    const target = SDK.TargetManager.TargetManager.instance().targetById('node js target');
    assert.exists(target);
    assert.isNull(target.parentTarget());
    assert.strictEqual(target.sessionId, '');
  });

  it('sends CDP messages via "sendMessageToTarget"', () => {
    const browserTarget = createTarget({type: SDK.Target.Type.BROWSER});
    const sendStub = sinon.stub(browserTarget.targetAgent(), 'invoke_sendMessageToTarget');
    const childTargetManager = browserTarget.model(App.NodeMain.NodeChildTargetManager);
    assert.exists(childTargetManager);

    void childTargetManager.attachedToTarget({
      sessionId: 'session ID' as Protocol.Target.SessionID,
      targetInfo: {
        attached: true,
        targetId: 'node js target' as Protocol.Target.TargetID,
        type: 'other',
        title: 'my node target',
        url: 'file:///some/script.js',
        canAccessOpener: false,
      },
      waitingForDebugger: true,
    });

    const target = SDK.TargetManager.TargetManager.instance().targetById('node js target');
    assert.exists(target);

    // Creating the target should have already sent a bunch of messages, like Debugger.enable
    sinon.assert.calledWithMatch(sendStub, sinon.match((request: {message: string}) => {
      const {method} = JSON.parse(request.message);
      return method === 'Debugger.enable';
    }));
  });
});

describe('NodeConnectionsView', () => {
  it('passes initial discovery config to the view', async () => {
    const view = createViewFunctionStub(App.NodeConnectionsPanel.NodeConnectionsView);
    const widget = new App.NodeConnectionsPanel.NodeConnectionsView(undefined, view);

    const nextInputPromise = view.nextInput;
    widget.discoveryConfig = ['localhost:9229', '127.0.0.1:9230'];
    const input = await nextInputPromise;

    assert.deepEqual(input.connections, ['localhost:9229', '127.0.0.1:9230']);
    assert.isNull(input.editingIndex);
  });

  it('adds a new connection when committed', async () => {
    const callback = sinon.spy();
    const view = createViewFunctionStub(App.NodeConnectionsPanel.NodeConnectionsView);
    const widget = new App.NodeConnectionsPanel.NodeConnectionsView(undefined, view);
    widget.callback = callback;
    widget.discoveryConfig = ['localhost:9229', '127.0.0.1:9230'];
    await view.nextInput;

    const addInputPromise = view.nextInput;
    view.input.onAddClick();
    const addInput = await addInputPromise;
    assert.strictEqual(addInput.editingIndex, 2);

    const commitInputPromise = view.nextInput;
    view.input.onCommitEdit(2, 'localhost:9231');
    const commitInput = await commitInputPromise;
    assert.isNull(commitInput.editingIndex);
    assert.deepEqual(commitInput.connections, ['localhost:9229', '127.0.0.1:9230', 'localhost:9231']);
    sinon.assert.calledOnceWithExactly(callback, ['localhost:9229', '127.0.0.1:9230', 'localhost:9231']);
  });

  it('removes a connection when deleted', async () => {
    const callback = sinon.spy();
    const view = createViewFunctionStub(App.NodeConnectionsPanel.NodeConnectionsView);
    const widget = new App.NodeConnectionsPanel.NodeConnectionsView(undefined, view);
    widget.callback = callback;
    widget.discoveryConfig = ['localhost:9229', '127.0.0.1:9230'];
    await view.nextInput;

    const deleteInputPromise = view.nextInput;
    view.input.onDelete(0);
    const deleteInput = await deleteInputPromise;
    assert.deepEqual(deleteInput.connections, ['127.0.0.1:9230']);
    sinon.assert.calledOnceWithExactly(callback, ['127.0.0.1:9230']);
  });
});
