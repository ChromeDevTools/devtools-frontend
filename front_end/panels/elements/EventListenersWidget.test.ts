// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';  // Added this
import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

const {EventListenersWidget, DispatchFilterBy} = Elements.EventListenersWidget;

describeWithMockConnection('EventListenersWidget', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    target = createTarget();
  });

  async function setup() {
    const view = createViewFunctionStub(EventListenersWidget);
    const widget = new EventListenersWidget(view);
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    widget.markAsRoot();
    widget.show(container);
    await view.nextInput;
    return view;
  }

  it('updates on filter change from both programmatic setting change and UI event', async () => {
    const view = await setup();
    const dispatchFilterTypeSetting =
        Common.Settings.Settings.instance().settingForTest('event-listener-dispatch-filter-type');
    // Trigger update via setting change listener.
    dispatchFilterTypeSetting.set(DispatchFilterBy.Blocking);
    let input = await view.nextInput;
    assert.strictEqual(input.selectedDispatchFilter, DispatchFilterBy.Blocking);
    assert.isFalse(input.filter.showPassive);
    assert.isTrue(input.filter.showBlocking);

    // Trigger update via the view's event handler.
    input.onDispatchFilterTypeChange(DispatchFilterBy.Passive);
    input = await view.nextInput;
    assert.strictEqual(input.selectedDispatchFilter, DispatchFilterBy.Passive);
    assert.isTrue(input.filter.showPassive);
    assert.isFalse(input.filter.showBlocking);
  });

  it('updates on framework listeners setting change', async () => {
    const view = await setup();
    const showFrameworkListenersSetting =
        Common.Settings.Settings.instance().settingForTest('show-frameowkr-listeners');
    showFrameworkListenersSetting.set(false);
    let input = await view.nextInput;
    assert.isFalse(input.filter.showFramework);

    showFrameworkListenersSetting.set(true);
    input = await view.nextInput;
    assert.isTrue(input.filter.showFramework);
  });

  it('updates on ancestor setting change', async () => {
    const view = await setup();
    const showForAncestorsSetting =
        Common.Settings.Settings.instance().moduleSetting('show-event-listeners-for-ancestors');

    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const grandParent = new SDK.DOMModel.DOMNode(domModel);
    const parent = new SDK.DOMModel.DOMNode(domModel);
    parent.parentNode = grandParent;
    const node = new SDK.DOMModel.DOMNode(domModel);
    node.parentNode = parent;

    const nodeRemoteObject = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
    const parentRemoteObject = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
    const grandParentRemoteObject = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
    const windowRemoteObject = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);

    sinon.stub(node, 'resolveToObject').withArgs('event-listeners-panel').resolves(nodeRemoteObject);
    sinon.stub(parent, 'resolveToObject').withArgs('event-listeners-panel').resolves(parentRemoteObject);
    sinon.stub(grandParent, 'resolveToObject').withArgs('event-listeners-panel').resolves(grandParentRemoteObject);
    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    executionContext.evaluate.resolves({object: windowRemoteObject});
    sinon.stub(runtimeModel, 'executionContexts').returns([executionContext]);

    // Set flavor, which will trigger an update.
    showForAncestorsSetting.set(false);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
    let input = await view.nextInput;
    assert.deepEqual(input.eventListenerObjects, [nodeRemoteObject]);

    showForAncestorsSetting.set(true);
    input = await view.nextInput;
    assert.deepEqual(
        input.eventListenerObjects,
        [nodeRemoteObject, parentRemoteObject, grandParentRemoteObject, windowRemoteObject]);
  });

  it('updates on node change', async () => {
    const view = await setup();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const node1 = new SDK.DOMModel.DOMNode(domModel);
    const node1RemoteObject = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
    sinon.stub(node1, 'resolveToObject').withArgs('event-listeners-panel').resolves(node1RemoteObject);

    const windowRemoteObject = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    executionContext.evaluate.resolves({object: windowRemoteObject});
    sinon.stub(runtimeModel, 'executionContexts').returns([executionContext]);

    Common.Settings.Settings.instance().moduleSetting('show-event-listeners-for-ancestors').set(true);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node1);
    const input = await view.nextInput;
    assert.deepEqual(input.eventListenerObjects, [node1RemoteObject, windowRemoteObject]);
  });
});
