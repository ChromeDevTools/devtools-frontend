// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';

import * as EventListeners from './event_listeners.js';

describeWithEnvironment('EventListenersView', () => {
  setupLocaleHooks();
  function assertElementDisplayStyle(
      view: EventListeners.EventListenersView.EventListenersView, selector: string, style: string) {
    const element = view.element.querySelector(selector);
    assert.exists(element);
    assert.deepEqual(window.getComputedStyle(element).display, style);
  }

  function createMockEventTarget(target: SDK.Target.Target, objectId = '1'): {
    eventTarget: SDK.RemoteObject.RemoteObject,
    callFunctionStub: sinon.SinonStub,
  } {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    const eventTarget = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      objectId: objectId as Protocol.Runtime.RemoteObjectId,
    });
    const callFunctionStub = sinon.stub(eventTarget, 'callFunction').resolves({object: null});
    return {eventTarget, callFunctionStub};
  }

  function createMockListener(opts: {
    domDebuggerModel: SDK.DOMDebuggerModel.DOMDebuggerModel,
    eventTarget: SDK.RemoteObject.RemoteObject,
    type: string,
    useCapture?: boolean,
    passive?: boolean,
    once?: boolean,
    handler?: SDK.RemoteObject.RemoteObject,
    origin?: string,
    location?: SDK.DebuggerModel.Location,
  }): SDK.DOMDebuggerModel.EventListener {
    const debuggerModel = opts.domDebuggerModel.target().model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);
    let location = opts.location;
    if (!location) {
      const locStub = sinon.createStubInstance(SDK.DebuggerModel.Location);
      locStub.debuggerModel = debuggerModel;
      locStub.script.returns(null);
      location = locStub;
    }
    const handler = opts.handler ?? sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
    return new SDK.DOMDebuggerModel.EventListener(
        opts.domDebuggerModel,
        opts.eventTarget,
        opts.type,
        opts.useCapture ?? false,
        opts.passive ?? false,
        opts.once ?? false,
        handler,
        handler,
        location,
        /* customRemoveFunction= */ null,
        opts.origin,
    );
  }

  it('shows one-liner if in sources', () => {
    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    container.classList.add('sources', 'panel');
    eventListenersView.markAsRoot();
    eventListenersView.show(container);

    const emptyWidgetElement = eventListenersView.emptyHolder.lastElementChild;
    assert.exists(emptyWidgetElement);
    // Check that the EmptyWidget's host element is properly hidden in the sources panel
    assert.deepEqual(window.getComputedStyle(emptyWidgetElement).display, 'none');
    assertElementDisplayStyle(eventListenersView, '.placeholder .gray-info-message', 'inline');

    assert.deepEqual(
        eventListenersView.contentElement.querySelector('.placeholder .gray-info-message')?.textContent,
        'No event listeners');
  });

  it('shows empty widget if in elements panel', () => {
    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    container.classList.add('elements', 'panel');
    eventListenersView.markAsRoot();
    eventListenersView.show(container);
    const emptyWidgetElement = eventListenersView.emptyHolder.lastElementChild;
    assert.exists(emptyWidgetElement);
    // Check that the EmptyWidget's host element is visible in the elements panel
    assert.deepEqual(window.getComputedStyle(emptyWidgetElement).display, 'flex');
    assertElementDisplayStyle(eventListenersView, '.placeholder .gray-info-message', 'none');

    const emptyWidgetShadowRoot = emptyWidgetElement.shadowRoot;
    assert.exists(emptyWidgetShadowRoot);

    assert.deepEqual(emptyWidgetShadowRoot.querySelector('.empty-state-header')?.textContent, 'No event listeners');
    assert.deepEqual(emptyWidgetShadowRoot.querySelector('.empty-state-description > span')?.textContent,
                     'On this page you will find registered event listeners');
  });

  it('shows empty notice for an empty list of objects', async () => {
    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    container.classList.add('elements', 'panel');
    eventListenersView.markAsRoot();
    eventListenersView.show(container);

    // Initial state before addObjects: emptyHolder has .hidden class
    assert.isTrue(eventListenersView.emptyHolder.classList.contains('hidden'));

    // Calling addObjects with an empty list should unhide emptyHolder and hide treeOutline
    await eventListenersView.addObjects([]);
    assert.isFalse(eventListenersView.emptyHolder.classList.contains('hidden'));
    assertElementDisplayStyle(eventListenersView, '.event-listener-tree', 'none');

    // Calling addObjects with an object that has no listeners should also show empty notice
    const target = createTarget();
    const domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    assert.exists(domDebuggerModel);
    const {eventTarget} = createMockEventTarget(target);
    sinon.stub(domDebuggerModel, 'eventListeners').withArgs(eventTarget).resolves([]);

    await eventListenersView.addObjects([eventTarget]);
    assert.isFalse(eventListenersView.emptyHolder.classList.contains('hidden'));
    assertElementDisplayStyle(eventListenersView, '.event-listener-tree', 'none');

    eventListenersView.detach();
    container.remove();
  });

  it('shows empty notice when everything is hidden', async () => {
    const target = createTarget();
    const domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    assert.exists(domDebuggerModel);

    const {eventTarget} = createMockEventTarget(target);
    const clickListener = createMockListener({
      domDebuggerModel,
      eventTarget,
      type: 'click',
    });
    const eventListenersStub = sinon.stub(domDebuggerModel, 'eventListeners');
    eventListenersStub.withArgs(eventTarget).resolves([clickListener]);

    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    container.classList.add('elements', 'panel');
    eventListenersView.markAsRoot();
    eventListenersView.show(container);

    // Populate with a listener. Empty holder should be hidden and tree outline visible.
    await eventListenersView.addObjects([eventTarget]);
    assert.isTrue(eventListenersView.emptyHolder.classList.contains('hidden'));

    // Now update with an object that has no listeners.
    // All listeners are removed/hidden, so the empty notice should be shown.
    const {eventTarget: emptyTarget} = createMockEventTarget(target, '2');
    eventListenersStub.withArgs(emptyTarget).resolves([]);
    await eventListenersView.addObjects([emptyTarget]);

    assert.isFalse(eventListenersView.emptyHolder.classList.contains('hidden'));
    assertElementDisplayStyle(eventListenersView, '.event-listener-tree', 'none');

    eventListenersView.detach();
    container.remove();
  });

  it('removes event listener from the view and calls remove on the model', async () => {
    const target = createTarget();
    const domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    assert.exists(domDebuggerModel);

    const {eventTarget, callFunctionStub} = createMockEventTarget(target, '1');
    const clickListener = createMockListener({
      domDebuggerModel,
      eventTarget,
      type: 'click',
    });
    const mouseoverListener = createMockListener({
      domDebuggerModel,
      eventTarget,
      type: 'mouseover',
    });

    const eventListenersStub = sinon.stub(domDebuggerModel, 'eventListeners');
    eventListenersStub.withArgs(eventTarget).resolves([clickListener, mouseoverListener]);

    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    eventListenersView.markAsRoot();
    eventListenersView.show(container);

    await eventListenersView.addObjects([eventTarget]);

    const rootElement = eventListenersView.treeOutline.rootElement();
    const children = rootElement.children();
    assert.lengthOf(children, 2);

    const clickTreeElement = children.find(c => c.title === 'click');
    assert.exists(clickTreeElement);
    assert.lengthOf(clickTreeElement.children(), 1);

    const mouseoverTreeElement = children.find(c => c.title === 'mouseover');
    assert.exists(mouseoverTreeElement);
    assert.lengthOf(mouseoverTreeElement.children(), 1);

    // Remove the click event listener.
    const clickBar = clickTreeElement.children()[0];
    assert.exists(clickBar);
    if (!(clickBar instanceof EventListeners.EventListenersView.ObjectEventListenerBar)) {
      assert.fail('Expected ObjectEventListenerBar');
    }
    clickBar.ondelete();

    // Verify click listener tree element is now hidden and has no children.
    assert.isTrue(clickTreeElement.hidden);
    assert.lengthOf(clickTreeElement.children(), 0);

    // Verify eventTarget.callFunction was called to remove the click listener (second call after frameworkEventListeners).
    sinon.assert.callCount(callFunctionStub, 2);
    const removeCall = callFunctionStub.getCall(1);
    assert.exists(removeCall);
    assert.strictEqual(removeCall.args[1]?.[0]?.value, 'click');

    // Verify mouseover listener remains intact.
    assert.isFalse(mouseoverTreeElement.hidden);
    assert.lengthOf(mouseoverTreeElement.children(), 1);

    // Now test displaying listeners for a sibling node.
    const {eventTarget: siblingTarget} = createMockEventTarget(target, '2');
    const siblingClickListener = createMockListener({
      domDebuggerModel,
      eventTarget: siblingTarget,
      type: 'click',
    });
    const siblingMouseoverListener = createMockListener({
      domDebuggerModel,
      eventTarget: siblingTarget,
      type: 'mouseover',
    });

    eventListenersStub.withArgs(siblingTarget).resolves([siblingClickListener, siblingMouseoverListener]);

    await eventListenersView.addObjects([siblingTarget]);

    // Click tree element should now be visible again with sibling's click listener.
    assert.isFalse(clickTreeElement.hidden);
    assert.lengthOf(clickTreeElement.children(), 1);
    assert.isFalse(mouseoverTreeElement.hidden);
    assert.lengthOf(mouseoverTreeElement.children(), 1);
  });

  it('renders the event listeners view screenshot', async () => {
    const target = createTarget();
    const domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    assert.exists(domDebuggerModel);

    const {eventTarget} = createMockEventTarget(target);
    const clickListener = createMockListener({
      domDebuggerModel,
      eventTarget,
      type: 'click',
      passive: false,
    });
    const wheelListener = createMockListener({
      domDebuggerModel,
      eventTarget,
      type: 'wheel',
      passive: true,
    });

    sinon.stub(domDebuggerModel, 'eventListeners').withArgs(eventTarget).resolves([clickListener, wheelListener]);

    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    eventListenersView.markAsRoot();
    eventListenersView.show(container);

    await eventListenersView.addObjects([eventTarget]);

    for (const child of eventListenersView.treeOutline.rootElement().children()) {
      child.expand();
      for (const bar of child.children()) {
        if (bar instanceof EventListeners.EventListenersView.ObjectEventListenerBar) {
          await bar.onpopulate();
          bar.expand();
        }
      }
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.focus();

    await assertScreenshot('event_listeners/event_listeners_view.png');

    eventListenersView.detach();
    container.remove();
  });

  it('renders the empty view screenshot (Sources)', async () => {
    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    container.classList.add('sources', 'panel');
    container.style.width = '300px';
    container.style.position = 'relative';
    renderElementIntoDOM(container, {includeCommonStyles: true});
    eventListenersView.markAsRoot();
    eventListenersView.show(container);

    await eventListenersView.addObjects([]);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.focus();

    await assertScreenshot('event_listeners/event_listeners_view_empty_sources.png');

    eventListenersView.detach();
    container.remove();
  });

  it('renders the empty view screenshot (Elements)', async () => {
    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    container.classList.add('elements', 'panel');
    container.style.width = '300px';
    container.style.position = 'relative';
    renderElementIntoDOM(container, {includeCommonStyles: true});
    eventListenersView.markAsRoot();
    eventListenersView.show(container);

    await eventListenersView.addObjects([]);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.focus();

    await assertScreenshot('event_listeners/event_listeners_view_empty_elements.png');

    eventListenersView.detach();
    container.remove();
  });
});
