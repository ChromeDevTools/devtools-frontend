// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
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

  it('removes event listener from the view and calls remove on the model', async () => {
    const target = createTarget();
    const domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    assert.exists(domDebuggerModel);

    const eventTarget = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
    eventTarget.runtimeModel.returns(target.model(SDK.RuntimeModel.RuntimeModel)!);
    // @ts-expect-error
    eventTarget.objectId = '1' as Protocol.Runtime.RemoteObjectId;
    eventTarget.callFunction.resolves({object: null});

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
    const location = sinon.createStubInstance(SDK.DebuggerModel.Location);
    location.debuggerModel = debuggerModel;
    location.script.returns(null);

    const handler = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);

    const clickListener = new SDK.DOMDebuggerModel.EventListener(domDebuggerModel, eventTarget, 'click', false, false,
                                                                 false, handler, handler, location, null);
    const mouseoverListener = new SDK.DOMDebuggerModel.EventListener(domDebuggerModel, eventTarget, 'mouseover', false,
                                                                     false, false, handler, handler, location, null);

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
    const clickBar = clickTreeElement.children()[0] as EventListeners.EventListenersView.ObjectEventListenerBar;
    clickBar.ondelete();

    // Verify click listener tree element is now hidden and has no children.
    assert.isTrue(clickTreeElement.hidden);
    assert.lengthOf(clickTreeElement.children(), 0);

    // Verify eventTarget.callFunction was called to remove the click listener (second call after frameworkEventListeners).
    sinon.assert.callCount(eventTarget.callFunction, 2);
    const removeCall = eventTarget.callFunction.getCall(1);
    assert.exists(removeCall);
    assert.strictEqual((removeCall.args[1] as Array<{value?: string}>)[0]?.value, 'click');

    // Verify mouseover listener remains intact.
    assert.isFalse(mouseoverTreeElement.hidden);
    assert.lengthOf(mouseoverTreeElement.children(), 1);

    // Now test displaying listeners for a sibling node.
    const siblingTarget = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
    siblingTarget.runtimeModel.returns(target.model(SDK.RuntimeModel.RuntimeModel)!);
    // @ts-expect-error
    siblingTarget.objectId = '2' as Protocol.Runtime.RemoteObjectId;
    siblingTarget.callFunction.resolves({object: null});

    const siblingClickListener = new SDK.DOMDebuggerModel.EventListener(domDebuggerModel, siblingTarget, 'click', false,
                                                                        false, false, handler, handler, location, null);
    const siblingMouseoverListener = new SDK.DOMDebuggerModel.EventListener(
        domDebuggerModel, siblingTarget, 'mouseover', false, false, false, handler, handler, location, null);

    eventListenersStub.withArgs(siblingTarget).resolves([siblingClickListener, siblingMouseoverListener]);

    await eventListenersView.addObjects([siblingTarget]);

    // Click tree element should now be visible again with sibling's click listener.
    assert.isFalse(clickTreeElement.hidden);
    assert.lengthOf(clickTreeElement.children(), 1);
    assert.isFalse(mouseoverTreeElement.hidden);
    assert.lengthOf(mouseoverTreeElement.children(), 1);
  });
});
