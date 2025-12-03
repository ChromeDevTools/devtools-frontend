// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

describeWithMockConnection('ThreadsSidebarPane', () => {
  const {ThreadsSidebarPane} = Sources.ThreadsSidebarPane;
  let threadsSidebarPane: Sources.ThreadsSidebarPane.ThreadsSidebarPane;
  let view: sinon.SinonSpy;

  beforeEach(async () => {
    view = sinon.spy();
    threadsSidebarPane = new ThreadsSidebarPane(undefined, view);
    threadsSidebarPane.markAsRoot();
    renderElementIntoDOM(threadsSidebarPane);
    await threadsSidebarPane.updateComplete;
    sinon.assert.calledOnce(view);
    view.resetHistory();
  });

  afterEach(() => {
    threadsSidebarPane.detach();
  });

  it('shows and hides based on the number of debugger models', () => {
    assert.isFalse(ThreadsSidebarPane.shouldBeShown());

    const target = createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    assert.isFalse(ThreadsSidebarPane.shouldBeShown());

    const anotherTarget = createTarget();
    const anotherDebuggerModel = anotherTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(anotherDebuggerModel);
    assert.isTrue(ThreadsSidebarPane.shouldBeShown());

    SDK.TargetManager.TargetManager.instance().removeTarget(target);
    assert.isFalse(ThreadsSidebarPane.shouldBeShown());
  });

  it('updates the view when a model is added or removed', async () => {
    const target = createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    await threadsSidebarPane.updateComplete;
    sinon.assert.calledOnce(view);
  });

  it('updates the view on target flavor change', async () => {
    const target = createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    await threadsSidebarPane.updateComplete;
    view.resetHistory();

    UI.Context.Context.instance().setFlavor(SDK.Target.Target, target);
    await threadsSidebarPane.updateComplete;
    sinon.assert.calledOnce(view);
  });
});
