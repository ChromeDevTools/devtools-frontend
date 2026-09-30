// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Platform from '../../core/platform/platform.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as Lit from '../lit/lit.js';

import * as UI from './legacy.js';

const {html, nothing, render} = Lit;
const {widget} = UI.Widget;

class PaneA extends UI.View.SimpleView {
  constructor(element: HTMLElement) {
    super(element, {title: 'Pane A' as Platform.UIString.LocalizedString, viewId: 'pane-a'});
  }
}

class PaneB extends UI.View.SimpleView {
  constructor(element: HTMLElement) {
    super(element, {title: 'Pane B' as Platform.UIString.LocalizedString, viewId: 'pane-b'});
  }
}

class PaneC extends UI.View.SimpleView {
  constructor(element: HTMLElement) {
    super(element, {title: 'Pane C' as Platform.UIString.LocalizedString, viewId: 'pane-c'});
  }
}

async function waitForSections(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
  await UI.Widget.Widget.allUpdatesComplete;
}

describeWithEnvironment('StackPane', () => {
  let root: UI.Widget.Widget;
  let container: HTMLElement;

  beforeEach(() => {
    root = new UI.Widget.Widget();
    root.markAsRoot();
    renderElementIntoDOM(root);
    container = root.contentElement;
  });

  afterEach(() => {
    root.detach();
  });

  function renderStack({a = false, b = false, c = false, isVisible = true},
                       extra?: Lit.TemplateResult): UI.StackPane.StackPaneElement {
    // clang-format off
    render(html`
      <devtools-stack-pane .isVisible=${isVisible}>
        ${a ? html`<devtools-widget ${widget(PaneA)}></devtools-widget>` : nothing}
        ${b ? html`<devtools-widget ${widget(PaneB)}></devtools-widget>` : nothing}
        ${c ? html`<devtools-widget ${widget(PaneC)}></devtools-widget>` : nothing}
        ${extra ?? nothing}
      </devtools-stack-pane>`, container);
    // clang-format on
    const stack = container.querySelector('devtools-stack-pane');
    assert.instanceOf(stack, UI.StackPane.StackPaneElement);
    return stack;
  }

  function sectionSlots(stack: HTMLElement): HTMLSlotElement[] {
    assert.exists(stack.shadowRoot);
    return [...stack.shadowRoot.querySelectorAll<HTMLSlotElement>('slot[name]')];
  }

  function sectionNames(stack: HTMLElement): string[] {
    return sectionSlots(stack).map(slot => slot.name);
  }

  function sectionTitle(stack: HTMLElement, viewId: string): HTMLElement {
    const slot = sectionSlots(stack).find(slot => slot.name === viewId);
    assert.exists(slot);

    const section = slot.parentElement?.parentElement;
    assert.exists(section?.shadowRoot);

    const title = section.shadowRoot.querySelector<HTMLElement>('.expandable-view-title');
    assert.exists(title);
    return title;
  }

  function paneElement(stack: HTMLElement, viewId: string): HTMLElement {
    const element = stack.querySelector<HTMLElement>(`[slot="${viewId}"]`);
    assert.exists(element);
    return element;
  }

  it('creates one section per child pane in DOM order', async () => {
    const stack = renderStack({a: true, b: true});
    await waitForSections();

    assert.deepEqual(sectionNames(stack), ['pane-a', 'pane-b']);
    assert.isTrue(UI.ViewManager.ViewManager.instance().hasView('pane-a'));
    assert.isTrue(UI.ViewManager.ViewManager.instance().hasView('pane-b'));
  });

  it('uses the pane title as the section title', async () => {
    const stack = renderStack({a: true, b: true});
    await waitForSections();

    assert.include(sectionTitle(stack, 'pane-a').textContent, 'Pane A');
    assert.include(sectionTitle(stack, 'pane-b').textContent, 'Pane B');
  });

  it('keeps panes where Lit rendered them and projects them into sections', async () => {
    const stack = renderStack({a: true, b: true});
    await waitForSections();

    const paneElements = [...stack.querySelectorAll<HTMLElement>('devtools-widget')];
    assert.lengthOf(paneElements, 2);
    for (const element of paneElements) {
      assert.strictEqual(element.parentElement, stack);
      assert.exists(element.assignedSlot);
      assert.strictEqual(element.assignedSlot.name, element.slot);
    }
  });

  it('removes a section when its child is removed and re-inserts it in order', async () => {
    const viewManager = UI.ViewManager.ViewManager.instance();
    const stack = renderStack({a: true, b: true});
    await waitForSections();
    assert.isTrue(viewManager.hasView('pane-a'));

    renderStack({b: true});
    await waitForSections();
    assert.deepEqual(sectionNames(stack), ['pane-b']);
    assert.isFalse(viewManager.hasView('pane-a'));

    renderStack({a: true, b: true});
    await waitForSections();
    assert.deepEqual(sectionNames(stack), ['pane-a', 'pane-b']);
    assert.isTrue(viewManager.hasView('pane-a'));
  });

  it('inserts a new pane between existing panes', async () => {
    const stack = renderStack({a: true, c: true});
    await waitForSections();
    assert.deepEqual(sectionNames(stack), ['pane-a', 'pane-c']);

    renderStack({a: true, b: true, c: true});
    await waitForSections();
    assert.deepEqual(sectionNames(stack), ['pane-a', 'pane-b', 'pane-c']);
  });

  it('appends a new pane after existing panes', async () => {
    const stack = renderStack({a: true});
    await waitForSections();

    renderStack({a: true, c: true});
    await waitForSections();
    assert.deepEqual(sectionNames(stack), ['pane-a', 'pane-c']);
  });

  it('removes all sections when all children are removed', async () => {
    const viewManager = UI.ViewManager.ViewManager.instance();
    const stack = renderStack({a: true, b: true, c: true});
    await waitForSections();
    assert.isTrue(viewManager.hasView('pane-a'));
    assert.isTrue(viewManager.hasView('pane-b'));
    assert.isTrue(viewManager.hasView('pane-c'));

    renderStack({});
    await waitForSections();
    assert.deepEqual(sectionNames(stack), []);
    assert.isFalse(viewManager.hasView('pane-a'));
    assert.isFalse(viewManager.hasView('pane-b'));
    assert.isFalse(viewManager.hasView('pane-c'));
  });

  it('ignores children that are not widgets', async () => {
    const stack = renderStack({a: true}, html`<div id="test-child"></div>`);
    await waitForSections();

    assert.deepEqual(sectionNames(stack), ['pane-a']);
    const testChild = stack.querySelector<HTMLElement>('#test-child');
    assert.exists(testChild);
    assert.isUndefined(UI.Widget.Widget.get(testChild));
    assert.strictEqual(testChild.slot, '');
  });

  it('ignores widget children that are not SimpleViews', async () => {
    const stack = renderStack({a: true},
                              html`<devtools-widget id="test-child" ${widget(element => new UI.Widget.Widget(element))}>
             </devtools-widget>`);
    await waitForSections();

    assert.deepEqual(sectionNames(stack), ['pane-a']);
    const nonViewChild = stack.querySelector<HTMLElement>('#test-child');
    assert.exists(nonViewChild);
    assert.strictEqual(nonViewChild.slot, '');
  });

  it('hides the pane when its section is collapsed and shows it when expanded', async () => {
    const stack = renderStack({a: true});
    await waitForSections();
    const pane = paneElement(stack, 'pane-a');
    const title = sectionTitle(stack, 'pane-a');
    assert.exists(pane.assignedSlot);

    title.click();
    await waitForSections();
    assert.isNull(pane.assignedSlot);

    title.click();
    await waitForSections();
    assert.exists(pane.assignedSlot);
  });

  it('passes isVisible to the stack location', async () => {
    const notifyVisibilityChanged = sinon.spy(UI.ViewManager.StackLocation.prototype, 'notifyVisibilityChanged');

    renderStack({a: true, isVisible: false});
    sinon.assert.calledWith(notifyVisibilityChanged, false);

    renderStack({a: true, isVisible: true});
    sinon.assert.calledWith(notifyVisibilityChanged, true);
  });

  it('removes all subpanes on disconnect and catches up on reconnect', async () => {
    const viewManager = UI.ViewManager.ViewManager.instance();
    const stack = renderStack({b: true});
    await waitForSections();
    assert.deepEqual(sectionNames(stack), ['pane-b']);
    assert.isTrue(viewManager.hasView('pane-b'));

    root.detach();
    await waitForSections();
    assert.deepEqual(sectionNames(stack), []);
    assert.isFalse(viewManager.hasView('pane-b'));

    renderStack({a: true, b: true});
    await waitForSections();
    assert.deepEqual(sectionNames(stack), []);

    renderElementIntoDOM(root);
    await waitForSections();
    assert.deepEqual(sectionNames(stack), ['pane-a', 'pane-b']);
    assert.isTrue(viewManager.hasView('pane-a'));
    assert.isTrue(viewManager.hasView('pane-b'));
  });

  it('detaches the location widget when the devtools-widget wrapper is removed', async () => {
    const stack = renderStack({a: true});
    await waitForSections();

    const devtoolsWidget = stack.shadowRoot?.querySelector('devtools-widget');
    assert.exists(devtoolsWidget);

    const locationWidget = UI.Widget.Widget.get(devtoolsWidget)?.children()[0];
    assert.exists(locationWidget);
    assert.isTrue(locationWidget.isShowing());

    devtoolsWidget.remove();
    await waitForSections();

    assert.isFalse(locationWidget.isShowing());
  });
});
