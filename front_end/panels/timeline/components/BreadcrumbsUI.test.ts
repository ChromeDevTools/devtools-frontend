// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as Trace from '../../../models/trace/trace.js';
import {
  findMenuItemWithLabel,
  getContextMenuForElement,
  getMenuItemLabels,
} from '../../../testing/ContextMenuHelpers.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import type * as UI from '../../../ui/legacy/legacy.js';

import * as TimelineComponents from './components.js';

function milliToMicro(x: number): Trace.Types.Timing.Micro {
  return Trace.Helpers.Timing.milliToMicro(
      Trace.Types.Timing.Milli(x),
  );
}

describeWithEnvironment('BreadcrumbsUI', () => {
  const {BreadcrumbsUI} = TimelineComponents.BreadcrumbsUI;

  function queryBreadcrumbs(component: HTMLElement): (string)[] {
    assert.isNotNull(component.shadowRoot);
    const breadcrumbsRanges = component.shadowRoot.querySelectorAll<HTMLElement>('.range');
    return Array.from(breadcrumbsRanges).map(row => {
      return row.textContent?.trim() || '';
    });
  }

  function queryActiveBreadcrumb(component: HTMLElement): (string)[] {
    assert.isNotNull(component.shadowRoot);
    const breadcrumbsRanges = component.shadowRoot.querySelectorAll<HTMLElement>('.active-breadcrumb');
    return Array.from(breadcrumbsRanges).map(row => {
      return row.textContent?.trim() || '';
    });
  }

  it('renders one breadcrumb', async () => {
    const component = new BreadcrumbsUI();
    renderElementIntoDOM(component);

    const traceWindow: Trace.Types.Timing.TraceWindowMicro = {
      min: milliToMicro(1),
      max: milliToMicro(10),
      range: milliToMicro(9),
    };

    const breadcrumb: Trace.Types.File.Breadcrumb = {
      window: traceWindow,
      child: null,
    };

    component.data = {initialBreadcrumb: breadcrumb, activeBreadcrumb: breadcrumb};

    await RenderCoordinator.done();

    const breadcrumbsRanges = queryBreadcrumbs(component);

    assert.lengthOf(breadcrumbsRanges, 1);
    assert.deepEqual(breadcrumbsRanges, ['Full range (9.00 ms)']);
  });

  it('renders all the breadcrumbs provided', async () => {
    const component = new BreadcrumbsUI();
    renderElementIntoDOM(component);

    const traceWindow2: Trace.Types.Timing.TraceWindowMicro = {
      min: milliToMicro(2),
      max: milliToMicro(9),
      range: milliToMicro(7),
    };

    const traceWindow: Trace.Types.Timing.TraceWindowMicro = {
      min: milliToMicro(1),
      max: milliToMicro(10),
      range: milliToMicro(9),
    };

    const breadcrumb2: Trace.Types.File.Breadcrumb = {
      window: traceWindow2,
      child: null,
    };

    const breadcrumb: Trace.Types.File.Breadcrumb = {
      window: traceWindow,
      child: breadcrumb2,
    };

    component.data = {initialBreadcrumb: breadcrumb, activeBreadcrumb: breadcrumb2};

    await RenderCoordinator.done();

    const breadcrumbsRanges = queryBreadcrumbs(component);

    assert.lengthOf(breadcrumbsRanges, 2);
    assert.deepEqual(breadcrumbsRanges, ['Full range (9.00 ms)', '7.00 ms']);

    // There should always be one active breadcrumb
    const activeRange = queryActiveBreadcrumb(component);
    assert.lengthOf(activeRange, 1);
  });

  /**
   * Creates a linked list of 3 breadcrumbs: Full range (9ms) -> 7ms -> 5ms.
   */
  function makeThreeBreadcrumbs(): [
    Trace.Types.File.Breadcrumb,
    Trace.Types.File.Breadcrumb,
    Trace.Types.File.Breadcrumb,
  ] {
    const third: Trace.Types.File.Breadcrumb = {
      window: {min: milliToMicro(3), max: milliToMicro(8), range: milliToMicro(5)},
      child: null,
    };
    const second: Trace.Types.File.Breadcrumb = {
      window: {min: milliToMicro(2), max: milliToMicro(9), range: milliToMicro(7)},
      child: third,
    };
    const first: Trace.Types.File.Breadcrumb = {
      window: {min: milliToMicro(1), max: milliToMicro(10), range: milliToMicro(9)},
      child: second,
    };
    return [first, second, third];
  }

  function queryBreadcrumbElements(component: HTMLElement): HTMLElement[] {
    assert.isNotNull(component.shadowRoot);
    return Array.from(component.shadowRoot.querySelectorAll<HTMLElement>('.breadcrumb'));
  }

  it('renders nothing when no data has been set', async () => {
    const component = new BreadcrumbsUI();
    renderElementIntoDOM(component);
    await RenderCoordinator.done();

    assert.isNotNull(component.shadowRoot);
    assert.isNull(component.shadowRoot.querySelector('.breadcrumbs'));
    assert.lengthOf(queryBreadcrumbElements(component), 0);
  });

  it('applies the active class only to the active breadcrumb', async () => {
    const component = new BreadcrumbsUI();
    renderElementIntoDOM(component);
    const [first, second] = makeThreeBreadcrumbs();

    component.data = {initialBreadcrumb: first, activeBreadcrumb: second};
    await RenderCoordinator.done();

    // preciseMillisToString separates the value and unit with a non-breaking space.
    assert.deepEqual(queryBreadcrumbs(component), ['Full range (9.00\u00A0ms)', '7.00\u00A0ms', '5.00\u00A0ms']);
    assert.deepEqual(queryActiveBreadcrumb(component), ['7.00\u00A0ms']);
  });

  it('dispatches a BreadcrumbActivatedEvent when a breadcrumb is clicked', async () => {
    const component = new BreadcrumbsUI();
    renderElementIntoDOM(component);
    const [first, second, third] = makeThreeBreadcrumbs();

    component.data = {initialBreadcrumb: first, activeBreadcrumb: third};
    await RenderCoordinator.done();

    const listener = sinon.spy();
    component.addEventListener(TimelineComponents.BreadcrumbsUI.BreadcrumbActivatedEvent.eventName, listener);

    const crumbElements = queryBreadcrumbElements(component);
    assert.lengthOf(crumbElements, 3);
    crumbElements[1].click();

    sinon.assert.calledOnce(listener);
    const event = listener.firstCall.args[0];
    assert.instanceOf(event, TimelineComponents.BreadcrumbsUI.BreadcrumbActivatedEvent);
    assert.strictEqual(event.breadcrumb, second);
    assert.isUndefined(event.childBreadcrumbsRemoved);
  });

  describe('context menu', () => {
    async function renderAndOpenContextMenuOnSecondCrumb(): Promise<{
      menu: UI.ContextMenu.ContextMenu,
      second: Trace.Types.File.Breadcrumb,
      listener: sinon.SinonSpy,
    }> {
      const component = new BreadcrumbsUI();
      renderElementIntoDOM(component);
      const [first, second, third] = makeThreeBreadcrumbs();
      component.data = {initialBreadcrumb: first, activeBreadcrumb: third};
      await RenderCoordinator.done();

      const listener = sinon.spy();
      component.addEventListener(TimelineComponents.BreadcrumbsUI.BreadcrumbActivatedEvent.eventName, listener);

      const crumbElements = queryBreadcrumbElements(component);
      assert.lengthOf(crumbElements, 3);
      const menu = getContextMenuForElement(crumbElements[1]);
      return {menu, second, listener};
    }

    it('shows the activate and remove child breadcrumbs items', async () => {
      const {menu, listener} = await renderAndOpenContextMenuOnSecondCrumb();
      assert.deepEqual(getMenuItemLabels(menu.defaultSection()), ['Activate breadcrumb', 'Remove child breadcrumbs']);
      // Opening the menu alone must not activate anything.
      sinon.assert.notCalled(listener);
    });

    it('dispatches a BreadcrumbActivatedEvent from "Activate breadcrumb"', async () => {
      const {menu, second, listener} = await renderAndOpenContextMenuOnSecondCrumb();
      const item = findMenuItemWithLabel(menu.defaultSection(), 'Activate breadcrumb');
      assert.exists(item);

      menu.invokeHandler(item.id());

      sinon.assert.calledOnce(listener);
      const event = listener.firstCall.args[0];
      assert.instanceOf(event, TimelineComponents.BreadcrumbsUI.BreadcrumbActivatedEvent);
      assert.strictEqual(event.breadcrumb, second);
      assert.isUndefined(event.childBreadcrumbsRemoved);
    });

    it('dispatches a BreadcrumbActivatedEvent with childBreadcrumbsRemoved from "Remove child breadcrumbs"',
       async () => {
         const {menu, second, listener} = await renderAndOpenContextMenuOnSecondCrumb();
         const item = findMenuItemWithLabel(menu.defaultSection(), 'Remove child breadcrumbs');
         assert.exists(item);

         menu.invokeHandler(item.id());

         sinon.assert.calledOnce(listener);
         const event = listener.firstCall.args[0];
         assert.instanceOf(event, TimelineComponents.BreadcrumbsUI.BreadcrumbActivatedEvent);
         assert.strictEqual(event.breadcrumb, second);
         assert.isTrue(event.childBreadcrumbsRemoved);
       });
  });

  describe('screenshots', () => {
    it('renders multiple breadcrumbs with the middle one active', async () => {
      const component = new BreadcrumbsUI();
      renderElementIntoDOM(component, {includeCommonStyles: true});
      const [first, second] = makeThreeBreadcrumbs();
      component.data = {initialBreadcrumb: first, activeBreadcrumb: second};
      await RenderCoordinator.done();
      // With >1 crumbs the component may scroll the container after two rAFs.
      await raf();
      await raf();

      await assertScreenshot('timeline/breadcrumbs-ui-multiple.png');
    });
  });
});
