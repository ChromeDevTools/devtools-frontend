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
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

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

  it('shows one-liner if in sources', async () => {
    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    container.classList.add('sources', 'panel');
    eventListenersView.markAsRoot();
    eventListenersView.show(container);
    await eventListenersView.performUpdate();

    const placeholder = eventListenersView.contentElement.querySelector<HTMLElement>('.placeholder');
    assert.exists(placeholder);
    const emptyWidgetElement = placeholder.lastElementChild;
    assert.exists(emptyWidgetElement);
    // Check that the EmptyWidget's host element is properly hidden in the sources panel
    assert.deepEqual(window.getComputedStyle(emptyWidgetElement).display, 'none');
    assertElementDisplayStyle(eventListenersView, '.placeholder .gray-info-message', 'block');

    assert.deepEqual(
        eventListenersView.contentElement.querySelector<HTMLElement>('.placeholder .gray-info-message')?.textContent,
        'No event listeners');
  });

  it('shows empty widget if in elements panel', async () => {
    const eventListenersView = new EventListeners.EventListenersView.EventListenersView();
    const container = document.createElement('div');
    renderElementIntoDOM(container, {includeCommonStyles: true});
    container.classList.add('elements', 'panel');
    eventListenersView.markAsRoot();
    eventListenersView.show(container);
    await eventListenersView.performUpdate();

    const placeholder = eventListenersView.contentElement.querySelector<HTMLElement>('.placeholder');
    assert.exists(placeholder);
    const emptyWidgetElement = placeholder.lastElementChild;
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

    // Initial state before objects are set: placeholder is shown
    await eventListenersView.performUpdate();
    assert.exists(eventListenersView.contentElement.querySelector('.placeholder'));

    // Setting objects to an empty list should still show placeholder and not tree
    eventListenersView.objects = [];
    await eventListenersView.performUpdate();
    assert.exists(eventListenersView.contentElement.querySelector('.placeholder'));
    assert.isNull(eventListenersView.contentElement.querySelector('.event-listener-tree'));

    // Calling with an object that has no listeners should also show empty notice
    const target = createTarget();
    const domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    assert.exists(domDebuggerModel);
    const {eventTarget} = createMockEventTarget(target);
    sinon.stub(domDebuggerModel, 'eventListeners').withArgs(eventTarget).resolves([]);

    eventListenersView.objects = [eventTarget];
    await eventListenersView.performUpdate();
    assert.exists(eventListenersView.contentElement.querySelector('.placeholder'));
    assert.isNull(eventListenersView.contentElement.querySelector('.event-listener-tree'));

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

    // Populate with a listener. Placeholder should not exist and tree should exist.
    eventListenersView.objects = [eventTarget];
    await eventListenersView.performUpdate();
    assert.isNull(eventListenersView.contentElement.querySelector('.placeholder'));
    assert.exists(eventListenersView.contentElement.querySelector('.event-listener-tree'));

    // Now update with an object that has no listeners.
    // All listeners are removed/hidden, so the empty notice should be shown.
    const {eventTarget: emptyTarget} = createMockEventTarget(target, '2');
    eventListenersStub.withArgs(emptyTarget).resolves([]);
    eventListenersView.objects = [emptyTarget];
    await eventListenersView.performUpdate();

    assert.exists(eventListenersView.contentElement.querySelector('.placeholder'));
    assert.isNull(eventListenersView.contentElement.querySelector('.event-listener-tree'));

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

    eventListenersView.objects = [eventTarget];
    await eventListenersView.performUpdate();

    const tree = eventListenersView.contentElement.querySelector('devtools-tree');
    assert.exists(tree);
    const rootChildren = tree.getInternalTreeOutlineForTest().rootElement().children();
    assert.lengthOf(rootChildren, 2);

    const clickTreeElement = rootChildren.find(c => c.titleElement.textContent?.trim() === 'click');
    assert.exists(clickTreeElement);
    const clickChildren = clickTreeElement.children();
    assert.lengthOf(clickChildren, 1);

    const mouseoverTreeElement = rootChildren.find(c => c.titleElement.textContent?.trim() === 'mouseover');
    assert.exists(mouseoverTreeElement);
    const mouseoverChildren = mouseoverTreeElement.children();
    assert.lengthOf(mouseoverChildren, 1);

    // Remove the click event listener.
    const clickBar = clickChildren[0];
    assert.exists(clickBar);
    const deleteButton =
        clickBar.listItemElement.querySelector<HTMLElement>('devtools-button[title="Delete event listener"]');
    assert.exists(deleteButton);
    deleteButton.click();
    await eventListenersView.performUpdate();

    // Verify click listener type is now removed.
    const updatedRootChildren = tree.getInternalTreeOutlineForTest().rootElement().children();
    assert.lengthOf(updatedRootChildren, 1);
    assert.strictEqual(updatedRootChildren[0].titleElement.textContent?.trim(), 'mouseover');

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

    eventListenersView.objects = [siblingTarget];
    await eventListenersView.performUpdate();

    // Click and mouseover tree elements should now be visible with sibling's listeners.
    const siblingRootChildren = tree.getInternalTreeOutlineForTest().rootElement().children();
    assert.lengthOf(siblingRootChildren, 2);

    const siblingClickTreeElement = siblingRootChildren.find(c => c.titleElement.textContent?.trim() === 'click');
    assert.exists(siblingClickTreeElement);
    assert.isFalse(siblingClickTreeElement.hidden);
    assert.lengthOf(siblingClickTreeElement.children(), 1);

    const siblingMouseoverTreeElement =
        siblingRootChildren.find(c => c.titleElement.textContent?.trim() === 'mouseover');
    assert.exists(siblingMouseoverTreeElement);
    assert.isFalse(siblingMouseoverTreeElement.hidden);
    assert.lengthOf(siblingMouseoverTreeElement.children(), 1);
  });

  it('resets the linkifier on view updates', async () => {
    const target = createTarget();
    const domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    assert.exists(domDebuggerModel);
    const {eventTarget} = createMockEventTarget(target);
    const clickListener = createMockListener({
      domDebuggerModel,
      eventTarget,
      type: 'click',
    });
    sinon.stub(domDebuggerModel, 'eventListeners').withArgs(eventTarget).resolves([clickListener]);

    const view = createViewFunctionStub(EventListeners.EventListenersView.EventListenersView);
    const eventListenersView = new EventListeners.EventListenersView.EventListenersView(undefined, view);

    eventListenersView.objects = [];
    const {linkifier} = await view.nextInput;
    const resetSpy = sinon.spy(linkifier, 'reset');

    eventListenersView.objects = [eventTarget];
    await view.nextInput;
    sinon.assert.calledOnce(resetSpy);

    eventListenersView.filter = {showFramework: true, showPassive: true, showBlocking: true};
    await view.nextInput;
    sinon.assert.calledTwice(resetSpy);

    view.input.togglePassiveListener(clickListener);
    await view.nextInput;
    sinon.assert.calledThrice(resetSpy);

    view.input.removeListener(clickListener);
    await view.nextInput;
    sinon.assert.callCount(resetSpy, 4);
  });

  it('does not show stale event listeners when objects change while loading', async () => {
    const target = createTarget();
    const domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    assert.exists(domDebuggerModel);

    const {eventTarget: node1} = createMockEventTarget(target, '1');
    const {eventTarget: node2} = createMockEventTarget(target, '2');

    const clickListener1 = createMockListener({
      domDebuggerModel,
      eventTarget: node1,
      type: 'click1',
    });

    const clickListener2 = createMockListener({
      domDebuggerModel,
      eventTarget: node2,
      type: 'click2',
    });

    const node1Listeners = Promise.withResolvers<SDK.DOMDebuggerModel.EventListener[]>();
    const node1Requested = Promise.withResolvers<void>();

    const eventListenersStub = sinon.stub(domDebuggerModel, 'eventListeners');
    eventListenersStub.callsFake((obj: SDK.RemoteObject.RemoteObject) => {
      if (obj === node1) {
        node1Requested.resolve();
        return node1Listeners.promise;
      }
      if (obj === node2) {
        return Promise.resolve([clickListener2]);
      }
      return Promise.resolve([]);
    });

    const view = createViewFunctionStub(EventListeners.EventListenersView.EventListenersView);
    const eventListenersView = new EventListeners.EventListenersView.EventListenersView(undefined, view);

    eventListenersView.objects = [node1];
    await node1Requested.promise;

    eventListenersView.objects = [node2];
    node1Listeners.resolve([clickListener1]);
    await eventListenersView.updateComplete;

    assert.deepEqual([...view.input.listeners.keys()], ['click2']);
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

    eventListenersView.objects = [eventTarget];
    await eventListenersView.performUpdate();

    const tree = eventListenersView.contentElement.querySelector('devtools-tree');
    assert.exists(tree);
    for (const child of tree.getInternalTreeOutlineForTest().rootElement().children()) {
      child.expand();
      for (const bar of child.children()) {
        bar.expand();
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

    eventListenersView.objects = [];
    await eventListenersView.performUpdate();

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

    eventListenersView.objects = [];
    await eventListenersView.performUpdate();

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.focus();

    await assertScreenshot('event_listeners/event_listeners_view_empty_elements.png');

    eventListenersView.detach();
    container.remove();
  });
});
