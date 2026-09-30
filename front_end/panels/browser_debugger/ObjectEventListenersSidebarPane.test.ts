// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as BrowserDebugger from './browser_debugger.js';

describeWithEnvironment('ObjectEventListenersSidebarPane', () => {
  afterEach(() => {
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, null);
  });

  /**
   * Creates an execution context in `target` whose global object (`self`) is a real remote object of that target.
   */
  function createExecutionContext(target: SDK.Target.Target, objectId: string): {
    executionContext: sinon.SinonStubbedInstance<SDK.RuntimeModel.ExecutionContext>,
    globalObject: SDK.RemoteObject.RemoteObject,
  } {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    const globalObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      objectId: objectId as Protocol.Runtime.RemoteObjectId,
      className: target.type() === SDK.Target.Type.ServiceWorker ? 'ServiceWorkerGlobalScope' : 'Window',
    });
    // No framework event listeners are registered in the page.
    const frameworkListenersResult = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      objectId: `${objectId}-framework-listeners` as Protocol.Runtime.RemoteObjectId,
    });
    sinon.stub(frameworkListenersResult, 'getOwnProperties').resolves({properties: [], internalProperties: []});
    sinon.stub(globalObject, 'callFunction').resolves({object: frameworkListenersResult, wasThrown: false});

    const executionContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
    (executionContext as {runtimeModel: SDK.RuntimeModel.RuntimeModel}).runtimeModel = runtimeModel;
    executionContext.target.returns(target);
    executionContext.evaluateWithSelectedFrameFallback.callsFake(async ({expression}) => {
      assert.strictEqual(expression, 'self');
      return {object: globalObject};
    });
    return {executionContext, globalObject};
  }

  function createLoadListener(domDebuggerModel: SDK.DOMDebuggerModel.DOMDebuggerModel,
                              eventTarget: SDK.RemoteObject.RemoteObject): SDK.DOMDebuggerModel.EventListener {
    const debuggerModel = domDebuggerModel.target().model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    const location = sinon.createStubInstance(SDK.DebuggerModel.Location);
    location.debuggerModel = debuggerModel;
    location.script.returns(null);
    const handler = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
    return new SDK.DOMDebuggerModel.EventListener(domDebuggerModel, eventTarget, 'load', /* useCapture */ false,
                                                  /* passive */ false, /* once */ false, handler, handler, location,
                                                  /* customRemoveFunction */ null);
  }

  function eventListenerTypes(pane: BrowserDebugger.ObjectEventListenersSidebarPane.ObjectEventListenersSidebarPane):
      string[] {
    const tree = pane.eventListenersView.contentElement.querySelector('devtools-tree');
    if (!tree) {
      return [];
    }
    return tree.getInternalTreeOutlineForTest()
        .rootElement()
        .children()
        .filter(child => !child.hidden)
        .map(child => child.titleElement.textContent?.trim() ?? '');
  }

  it('renders no listeners for a service worker context and the window listeners for the main frame', async () => {
    const pageTarget = createTarget();
    const serviceWorkerTarget = createTarget({type: SDK.Target.Type.ServiceWorker, parentTarget: pageTarget});
    // Service workers have no DOM, and hence no DOMDebuggerModel to query event listeners from.
    assert.isNull(serviceWorkerTarget.model(SDK.DOMDebuggerModel.DOMDebuggerModel));

    const domDebuggerModel = pageTarget.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    assert.exists(domDebuggerModel);
    const {executionContext: mainContext, globalObject: windowObject} = createExecutionContext(pageTarget, 'window');
    const eventListenersStub = sinon.stub(domDebuggerModel, 'eventListeners');
    eventListenersStub.withArgs(windowObject).resolves([createLoadListener(domDebuggerModel, windowObject)]);
    const {executionContext: serviceWorkerContext} = createExecutionContext(serviceWorkerTarget, 'service-worker');

    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, serviceWorkerContext);
    const pane = new BrowserDebugger.ObjectEventListenersSidebarPane.ObjectEventListenersSidebarPane();
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    pane.markAsRoot();
    pane.show(container);
    await pane.updateComplete;

    sinon.assert.calledOnce(serviceWorkerContext.evaluateWithSelectedFrameFallback);
    assert.deepEqual(eventListenerTypes(pane), []);
    assert.exists(pane.eventListenersView.contentElement.querySelector('.placeholder'));

    // Selecting the main frame context shows the listeners of its window.
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, mainContext);
    await pane.updateComplete;
    await pane.eventListenersView.updateComplete;
    sinon.assert.calledOnce(mainContext.evaluateWithSelectedFrameFallback);
    sinon.assert.calledWith(eventListenersStub, windowObject);
    assert.deepEqual(eventListenerTypes(pane), ['load']);
    assert.isNull(pane.eventListenersView.contentElement.querySelector('.placeholder'));

    // Switching back to the service worker context clears the listeners again.
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, serviceWorkerContext);
    await pane.updateComplete;
    await pane.eventListenersView.updateComplete;
    assert.deepEqual(eventListenerTypes(pane), []);
    assert.exists(pane.eventListenersView.contentElement.querySelector('.placeholder'));

    pane.detach();
    container.remove();
  });
});
