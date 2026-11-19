// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {getAxeViolations} from '../../testing/AxeHelpers.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, registerNoopActions} from '../../testing/EnvironmentHelpers.js';
import {setUpEnvironment} from '../../testing/OverridesHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

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
      description: target.type() === SDK.Target.Type.ServiceWorker ? 'ServiceWorkerGlobalScope' : 'Window',
    });
    // No framework event listeners are registered in the page.
    const emptyEventListeners = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Array,
      objectId: `${objectId}-framework-event-listeners` as Protocol.Runtime.RemoteObjectId,
      description: 'Array(0)',
    });
    const frameworkListenersResult = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      objectId: `${objectId}-framework-listeners` as Protocol.Runtime.RemoteObjectId,
    });
    sinon.stub(frameworkListenersResult, 'getOwnProperties').resolves({
      properties: [new SDK.RemoteObject.RemoteObjectProperty('eventListeners', emptyEventListeners)],
      internalProperties: [],
    });
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
    const tree = pane.contentElement.querySelector('devtools-tree');
    if (!tree) {
      return [];
    }
    return tree.getInternalTreeOutlineForTest()
        .rootElement()
        .children()
        .filter(child => !child.hidden)
        .map(child => child.titleElement.textContent?.trim() ?? '');
  }

  it('updates objects and releases the previous object group on context change and when hidden', async () => {
    const pageTarget = createTarget();
    const {executionContext: firstContext, globalObject: firstGlobal} = createExecutionContext(pageTarget, 'win-1');
    const {executionContext: secondContext, globalObject: secondGlobal} = createExecutionContext(pageTarget, 'win-2');
    const releaseSpy = sinon.spy(firstGlobal.runtimeModel(), 'releaseObjectGroup');

    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, firstContext);
    const pane = new BrowserDebugger.ObjectEventListenersSidebarPane.ObjectEventListenersSidebarPane();
    renderElementIntoDOM(pane);
    await pane.updateComplete;

    assert.strictEqual(pane.contentElement.getAttribute('jslog'), 'Section; context: sources.global-listeners');
    assert.deepEqual(pane.objects, [firstGlobal]);

    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, secondContext);
    await pane.updateComplete;
    sinon.assert.calledOnceWithExactly(releaseSpy, BrowserDebugger.ObjectEventListenersSidebarPane.objectGroupName);
    assert.deepEqual(pane.objects, [secondGlobal]);

    pane.detach();
    sinon.assert.calledTwice(releaseSpy);
  });

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
    renderElementIntoDOM(pane);
    await pane.updateComplete;

    sinon.assert.calledOnce(serviceWorkerContext.evaluateWithSelectedFrameFallback);
    assert.deepEqual(eventListenerTypes(pane), []);
    assert.exists(pane.contentElement.querySelector('.placeholder'));

    // Selecting the main frame context shows the listeners of its window.
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, mainContext);
    await pane.updateComplete;
    sinon.assert.calledOnce(mainContext.evaluateWithSelectedFrameFallback);
    sinon.assert.calledWith(eventListenersStub, windowObject);
    assert.deepEqual(eventListenerTypes(pane), ['load']);
    assert.isNull(pane.contentElement.querySelector('.placeholder'));

    // Switching back to the service worker context clears the listeners again.
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, serviceWorkerContext);
    await pane.updateComplete;
    assert.deepEqual(eventListenerTypes(pane), []);
    assert.exists(pane.contentElement.querySelector('.placeholder'));

    pane.detach();
  });

  it('expands global window touchstart listener details and has no accessibility violations', async () => {
    registerNoopActions(['browser-debugger.refresh-global-event-listeners']);
    setUpEnvironment();
    const pageTarget = createTarget();
    const domDebuggerModel = pageTarget.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    const debuggerModel = pageTarget.model(SDK.DebuggerModel.DebuggerModel);
    const runtimeModel = pageTarget.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(domDebuggerModel);
    assert.exists(debuggerModel);
    assert.exists(runtimeModel);

    const {executionContext, globalObject: windowObject} = createExecutionContext(pageTarget, 'window');
    const handler = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Function,
      description: '() => console.log',
    });
    const script = debuggerModel.parsedScriptSource(
        '1' as Protocol.Runtime.ScriptId,
        'http://localhost/devtools/a11y-axe-core/sources/global-listeners-sidebar-a11y-test.js' as
            ReturnType<SDK.Script.Script['contentURL']>,
        0,
        0,
        27,
        0,
        1,
        '',
        null,
        undefined,
        false,
        false,
        0,
        false,
        null,
        null,
        null,
        null,
        null,
        null,
    );
    const location = debuggerModel.createRawLocation(script, 16, 34);

    const listener = new SDK.DOMDebuggerModel.EventListener(
        domDebuggerModel,
        windowObject,
        'touchstart',
        /* useCapture */ false,
        /* passive */ true,
        /* once */ false,
        handler,
        handler,
        location,
        /* customRemoveFunction */ null,
        SDK.DOMDebuggerModel.EventListener.Origin.RAW,
    );
    sinon.stub(domDebuggerModel, 'eventListeners').withArgs(windowObject).resolves([listener]);

    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);

    const pane = new BrowserDebugger.ObjectEventListenersSidebarPane.ObjectEventListenersSidebarPane();
    renderElementIntoDOM(pane, {width: 400, height: 400, includeCommonStyles: true});
    const toolbar = document.createElement('devtools-toolbar');
    renderElementIntoDOM(toolbar, {allowMultipleChildren: true});
    Lit.render(pane.toolbarItems(), toolbar);

    await pane.updateComplete;
    await UI.Widget.Widget.allUpdatesComplete;

    const refreshButton = toolbar.querySelector('devtools-button');
    assert.exists(refreshButton);
    assert.isEmpty(await getAxeViolations(toolbar));

    const tree = pane.contentElement.querySelector('devtools-tree');
    assert.exists(tree);
    tree.flushPendingUpdatesForTesting();
    const typeElement = tree.getInternalTreeOutlineForTest().rootElement().firstChild();
    assert.exists(typeElement);
    assert.strictEqual(typeElement.titleElement.textContent?.trim(), 'touchstart');

    typeElement.expand();
    await UI.Widget.Widget.allUpdatesComplete;
    await raf();
    tree.flushPendingUpdatesForTesting();

    const listenerElement = typeElement.firstChild();
    assert.exists(listenerElement);
    assert.strictEqual(listenerElement.listItemElement.dataset.origin, 'Raw');

    listenerElement.expand();
    await UI.Widget.Widget.allUpdatesComplete;
    await raf();
    tree.flushPendingUpdatesForTesting();

    const detailsText = listenerElement.listItemElement.textContent?.replaceAll(/\s+/g, ' ').trim() ?? '';
    assert.include(detailsText, 'Window');
    assert.include(detailsText, 'Toggle passive');
    assert.include(detailsText, 'global-listeners-sidebar-a11y-test.js:17');
    assert.exists(listenerElement.listItemElement.querySelector('devtools-button[title="Delete event listener"]'));

    const propertyRows =
        listenerElement.children().map(row => row.listItemElement.textContent?.replaceAll(/\s+/g, ' ').trim() ?? '');
    assert.deepEqual(propertyRows, [
      'handler: () => console.log',
      'once: false',
      'passive: true',
      'useCapture: false',
    ]);

    const rect = pane.contentElement.getBoundingClientRect();
    assert.isAbove(rect.width, 0);
    assert.isAbove(rect.height, 0);
    assert.isEmpty(await getAxeViolations(pane.contentElement));
  });
});
