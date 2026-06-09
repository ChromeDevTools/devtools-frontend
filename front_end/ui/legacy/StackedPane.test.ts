// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import {raf} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';

import * as UI from './legacy.js';

describe('StackedPane', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let stackedPane: UI.StackedPane.StackedPane;
  let createToolbarStub: sinon.SinonStub;

  const createMockView = (id: string, title: string): UI.View.View => {
    const view = sinon.createStubInstance<UI.View.View>(UI.View.SimpleView);
    view.viewId.returns(id);
    view.title.returns(i18n.i18n.lockedString(title));
    view.widget.resolves(sinon.createStubInstance(UI.Widget.Widget));
    view.toolbarItems.resolves([]);
    return view;
  };

  beforeEach(() => {
    createToolbarStub = sinon.stub().returns(document.createElement('div'));
    stackedPane = new UI.StackedPane.StackedPane(createToolbarStub, () => {});
  });

  it('should append views in the order they are added', () => {
    const viewA = createMockView('viewA', 'View A');
    const viewB = createMockView('viewB', 'View B');

    stackedPane.appendView(viewA);
    stackedPane.appendView(viewB);

    const children = Array.from(stackedPane.contentElement.children);
    assert.lengthOf(children, 2);
    assert.isTrue(children[0].shadowRoot?.textContent?.includes('View A'));
    assert.isTrue(children[1].shadowRoot?.textContent?.includes('View B'));
  });

  it('should support targeted insertion using insertBefore', () => {
    const viewA = createMockView('viewA', 'View A');
    const viewB = createMockView('viewB', 'View B');
    const viewC = createMockView('viewC', 'View C');

    stackedPane.appendView(viewA);
    stackedPane.appendView(viewB);
    stackedPane.appendView(viewC, viewB);

    const children = Array.from(stackedPane.contentElement.children);
    assert.lengthOf(children, 3);
    assert.isTrue(children[0].shadowRoot?.textContent?.includes('View A'));
    assert.isTrue(children[1].shadowRoot?.textContent?.includes('View C'));
    assert.isTrue(children[2].shadowRoot?.textContent?.includes('View B'));
  });

  it('should remove views correctly', () => {
    const viewA = createMockView('viewA', 'View A');
    stackedPane.appendView(viewA);

    assert.lengthOf(stackedPane.contentElement.children, 1);

    stackedPane.removeView(viewA);

    assert.lengthOf(stackedPane.contentElement.children, 0);
    assert.isFalse(stackedPane.isViewExpanded('viewA'));
    assert.isUndefined(stackedPane.getContainerForView(viewA));
  });

  it('should delegate state changes to the container', async () => {
    const viewA = createMockView('viewA', 'View A');
    stackedPane.appendView(viewA);

    assert.isFalse(stackedPane.isViewExpanded('viewA'));

    await stackedPane.expandView(viewA);

    assert.isTrue(stackedPane.isViewExpanded('viewA'));
  });

  it('should notify about view visibility changes', async () => {
    const visibilitySpy = sinon.spy();
    const pane = new UI.StackedPane.StackedPane(createToolbarStub, () => {}, visibilitySpy);
    const viewA = createMockView('viewA', 'View A');
    pane.appendView(viewA);

    await pane.expandView(viewA);
    sinon.assert.calledWith(visibilitySpy, 'viewA', true);

    const container = pane.getContainerForView(viewA);
    const title = container!.element.shadowRoot!.querySelector('.expandable-view-title') as HTMLElement;
    title.dispatchEvent(new Event('click', {bubbles: true}));
    await raf();

    sinon.assert.calledWith(visibilitySpy, 'viewA', false);
  });
});

describe('ExpandableContainerWidget', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let mockView: sinon.SinonStubbedInstance<UI.View.View>;
  let mockWidget: sinon.SinonStubbedInstance<UI.Widget.Widget>;
  let container: UI.StackedPane.ExpandableContainerWidget;
  let createToolbarStub: sinon.SinonStub;

  beforeEach(() => {
    mockWidget = sinon.createStubInstance(UI.Widget.Widget);

    mockView = sinon.createStubInstance(UI.View.SimpleView);
    mockView.viewId.returns('test-view');
    mockView.title.returns('Test View' as Platform.UIString.LocalizedString);
    mockView.widget.resolves(mockWidget);
    mockView.toolbarItems.resolves([]);

    createToolbarStub = sinon.stub().returns(document.createElement('div'));

    container = new UI.StackedPane.ExpandableContainerWidget(mockView, createToolbarStub, () => {});
  });

  it('should have correct initial state and lazy load views', () => {
    assert.isFalse(container.isExpanded());

    // Check ARIA expanded state
    const title = container.element.shadowRoot!.querySelector('.expandable-view-title') as HTMLElement;
    assert.strictEqual(title.getAttribute('aria-expanded'), 'false');

    assert.isFalse(mockView.widget.called, 'widget() should not be called initially');
    assert.isFalse(mockView.toolbarItems.called, 'toolbarItems() should not be called initially');
  });

  it('should handle expansion lifecycle correctly', async () => {
    await container.expand();

    assert.isTrue(container.isExpanded());

    const title = container.element.shadowRoot!.querySelector('.expandable-view-title') as HTMLElement;
    assert.strictEqual(title.getAttribute('aria-expanded'), 'true');

    sinon.assert.calledOnce(mockView.widget);
    sinon.assert.calledOnce(mockView.toolbarItems);
    sinon.assert.calledOnce(mockWidget.show);
    sinon.assert.calledOnce(createToolbarStub);

    const toolbar = title.querySelector('div:not(.expandable-view-title)');
    assert.exists(toolbar, 'toolbar element should be appended to title');
  });

  it('should handle collapse lifecycle correctly', async () => {
    await container.expand();

    // Since collapse is private, we trigger it via the title element's invoke handler
    const title = container.element.shadowRoot!.querySelector('.expandable-view-title') as HTMLElement;

    // Simulate a click/invoke event
    const event = new Event('click', {bubbles: true});
    title.dispatchEvent(event);

    // Need to wait for the materialize promise in collapse() to resolve
    await raf();

    assert.isFalse(container.isExpanded());
    sinon.assert.calledOnce(mockWidget.detach);
  });

  it('should handle keyboard navigation', async () => {
    const title = container.element.shadowRoot!.querySelector('.expandable-view-title') as HTMLElement;
    title.focus();

    // ArrowRight -> Expand
    title.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    await raf();
    assert.isTrue(container.isExpanded());

    // ArrowLeft -> Collapse
    title.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
    await raf();
    assert.isFalse(container.isExpanded());

    // ArrowRight while expanded -> Focus widget
    await container.expand();
    title.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    sinon.assert.calledOnce(mockWidget.focus);
  });

  it('should handle materialization race conditions', async () => {
    // Mock widget to return a promise we can control
    const {promise: widgetPromise, resolve: resolveWidget} = Promise.withResolvers<UI.Widget.Widget>();
    mockView.widget.returns(widgetPromise);

    // Trigger expand
    const expandPromise = container.expand();

    // While expanding, trigger collapse via title click
    const title = container.element.shadowRoot!.querySelector('.expandable-view-title') as HTMLElement;
    title.dispatchEvent(new Event('click', {bubbles: true}));

    // Now resolve the widget promise
    resolveWidget(mockWidget);
    await expandPromise;
    await raf();

    assert.isFalse(container.isExpanded());
    sinon.assert.notCalled(mockWidget.show);
  });

  it('should notify via onVisibilityChanged callback', async () => {
    const visibilitySpy = sinon.spy();
    const callbackContainer =
        new UI.StackedPane.ExpandableContainerWidget(mockView, createToolbarStub, () => {}, visibilitySpy);

    await callbackContainer.expand();
    sinon.assert.calledWith(visibilitySpy, true);

    const title = callbackContainer.element.shadowRoot!.querySelector('.expandable-view-title') as HTMLElement;
    title.dispatchEvent(new Event('click', {bubbles: true}));
    await raf();

    sinon.assert.calledWith(visibilitySpy, false);
  });
});
