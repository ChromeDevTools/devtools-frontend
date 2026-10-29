// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Trace from '../../../models/trace/trace.js';
import {findMenuItemWithLabel, getMenu, getMenuItemLabels} from '../../../testing/ContextMenuHelpers.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';

import * as TimelineComponents from './components.js';

const {BreadcrumbsUI, DEFAULT_VIEW} = TimelineComponents.BreadcrumbsUI;

function milliToMicro(x: number): Trace.Types.Timing.Micro {
  return Trace.Helpers.Timing.milliToMicro(
      Trace.Types.Timing.Milli(x),
  );
}

function makeSingleBreadcrumb(): Trace.Types.File.Breadcrumb {
  return {
    window: {min: milliToMicro(1), max: milliToMicro(10), range: milliToMicro(9)},
    child: null,
  };
}

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

describeWithEnvironment('BreadcrumbsUI', () => {
  describe('presenter', () => {
    async function createWidget(outputValues?: TimelineComponents.BreadcrumbsUI.ViewOutput) {
      const view = createViewFunctionStub(BreadcrumbsUI, outputValues);
      const widget = new BreadcrumbsUI(undefined, view);
      widget.markAsRoot();
      renderElementIntoDOM(widget);
      await view.nextInput;
      return {view, widget};
    }

    it('renders with no breadcrumbs initially', async () => {
      const {view} = await createWidget();
      assert.isNull(view.input.initialBreadcrumb);
      assert.isNull(view.input.activeBreadcrumb);
    });

    it('passes the breadcrumbs set via the setters to the view', async () => {
      const {view, widget} = await createWidget();
      const [first, second] = makeThreeBreadcrumbs();

      widget.initialBreadcrumb = first;
      widget.activeBreadcrumb = second;
      const input = await view.nextInput;

      assert.strictEqual(input.initialBreadcrumb, first);
      assert.strictEqual(input.activeBreadcrumb, second);
    });

    it('calls onBreadcrumbActivated when a breadcrumb is clicked', async () => {
      const {view, widget} = await createWidget();
      const [first, second, third] = makeThreeBreadcrumbs();
      widget.initialBreadcrumb = first;
      widget.activeBreadcrumb = third;
      const input = await view.nextInput;
      const onBreadcrumbActivated = sinon.spy();
      widget.onBreadcrumbActivated = onBreadcrumbActivated;

      input.onBreadcrumbClick(second);

      sinon.assert.calledOnceWithExactly(onBreadcrumbActivated, second, false);
    });

    describe('context menu', () => {
      async function openContextMenuOnSecondCrumb() {
        const {view, widget} = await createWidget();
        const [first, second, third] = makeThreeBreadcrumbs();
        widget.initialBreadcrumb = first;
        widget.activeBreadcrumb = third;
        const input = await view.nextInput;
        const onBreadcrumbActivated = sinon.spy();
        widget.onBreadcrumbActivated = onBreadcrumbActivated;

        const menu = getMenu(() => input.onBreadcrumbContextMenu(new MouseEvent('contextmenu'), second));
        return {menu, second, onBreadcrumbActivated};
      }

      it('shows the activate and remove child breadcrumbs items', async () => {
        const {menu, onBreadcrumbActivated} = await openContextMenuOnSecondCrumb();
        assert.deepEqual(getMenuItemLabels(menu.defaultSection()), ['Activate breadcrumb', 'Remove child breadcrumbs']);
        // Opening the menu alone must not activate anything.
        sinon.assert.notCalled(onBreadcrumbActivated);
      });

      it('calls onBreadcrumbActivated from "Activate breadcrumb"', async () => {
        const {menu, second, onBreadcrumbActivated} = await openContextMenuOnSecondCrumb();
        const item = findMenuItemWithLabel(menu.defaultSection(), 'Activate breadcrumb');
        assert.exists(item);

        menu.invokeHandler(item.id());

        sinon.assert.calledOnceWithExactly(onBreadcrumbActivated, second, false);
      });

      it('calls onBreadcrumbActivated with childBreadcrumbsRemoved from "Remove child breadcrumbs"', async () => {
        const {menu, second, onBreadcrumbActivated} = await openContextMenuOnSecondCrumb();
        const item = findMenuItemWithLabel(menu.defaultSection(), 'Remove child breadcrumbs');
        assert.exists(item);

        menu.invokeHandler(item.id());

        sinon.assert.calledOnceWithExactly(onBreadcrumbActivated, second, true);
      });

      it('schedules a re-render when removing child breadcrumbs from the already-active breadcrumb', async () => {
        const {view, widget} = await createWidget();
        const [first] = makeThreeBreadcrumbs();
        widget.initialBreadcrumb = first;
        widget.activeBreadcrumb = first;
        const input = await view.nextInput;
        widget.onBreadcrumbActivated = (breadcrumb, childBreadcrumbsRemoved) => {
          if (childBreadcrumbsRemoved) {
            breadcrumb.child = null;
          }
        };

        const menu = getMenu(() => input.onBreadcrumbContextMenu(new MouseEvent('contextmenu'), first));
        const item = findMenuItemWithLabel(menu.defaultSection(), 'Remove child breadcrumbs');
        assert.exists(item);
        const nextInputPromise = view.nextInput;
        menu.invokeHandler(item.id());

        const updatedInput = await nextInputPromise;
        assert.strictEqual(updatedInput.initialBreadcrumb, first);
        assert.strictEqual(updatedInput.activeBreadcrumb, first);
        assert.isNull(updatedInput.initialBreadcrumb?.child);
        assert.isTrue(updatedInput.showBreadcrumbs);
      });
    });

    it('scrolls to the last breadcrumb when there is more than one', async () => {
      const scrollToEnd = sinon.spy();
      const {view, widget} = await createWidget({scrollToEnd});
      scrollToEnd.resetHistory();
      const [first, , third] = makeThreeBreadcrumbs();

      widget.initialBreadcrumb = first;
      widget.activeBreadcrumb = third;
      await view.nextInput;

      sinon.assert.calledOnce(scrollToEnd);
    });

    describe('visibility', () => {
      it('starts hidden with a single breadcrumb', async () => {
        const {view, widget} = await createWidget();
        const breadcrumb = makeSingleBreadcrumb();

        widget.initialBreadcrumb = breadcrumb;
        widget.activeBreadcrumb = breadcrumb;

        assert.isFalse((await view.nextInput).showBreadcrumbs);
      });

      it('shows the breadcrumbs once there is more than one', async () => {
        const {view, widget} = await createWidget();
        const [first, , third] = makeThreeBreadcrumbs();

        widget.initialBreadcrumb = first;
        widget.activeBreadcrumb = third;

        assert.isTrue((await view.nextInput).showBreadcrumbs);
      });

      it('stays visible after going back to a single breadcrumb', async () => {
        const {view, widget} = await createWidget();
        const [first, , third] = makeThreeBreadcrumbs();
        widget.initialBreadcrumb = first;
        widget.activeBreadcrumb = third;
        await view.nextInput;

        // E.g. after "Remove child breadcrumbs" on the first breadcrumb.
        const single = makeSingleBreadcrumb();
        widget.initialBreadcrumb = single;
        widget.activeBreadcrumb = single;

        assert.isTrue((await view.nextInput).showBreadcrumbs);
      });
    });
  });

  describe('DEFAULT_VIEW', () => {
    function renderView(input: Partial<TimelineComponents.BreadcrumbsUI.ViewInput>) {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      const output: TimelineComponents.BreadcrumbsUI.ViewOutput = {};
      const fullInput: TimelineComponents.BreadcrumbsUI.ViewInput = {
        initialBreadcrumb: null,
        activeBreadcrumb: null,
        showBreadcrumbs: false,
        onBreadcrumbClick: sinon.spy(),
        onBreadcrumbContextMenu: sinon.spy(),
        ...input,
      };
      DEFAULT_VIEW(fullInput, output, target);
      return {target, output, input: fullInput};
    }

    function rangeTexts(target: HTMLElement, selector = '.range'): string[] {
      return Array.from(target.querySelectorAll<HTMLElement>(selector)).map(el => el.textContent?.trim() || '');
    }

    it('renders nothing when there is no initial breadcrumb', () => {
      const {target, output} = renderView({});
      assert.isNull(target.querySelector('.breadcrumbs'));
      assert.lengthOf(target.querySelectorAll('.breadcrumb'), 0);
      assert.isUndefined(output.scrollToEnd);
    });

    it('renders one breadcrumb and keeps the container hidden', () => {
      const breadcrumb = makeSingleBreadcrumb();
      const {target} = renderView({initialBreadcrumb: breadcrumb, activeBreadcrumb: breadcrumb});

      // preciseMillisToString separates the value and unit with a non-breaking space.
      assert.deepEqual(rangeTexts(target), ['Full range (9.00\u00A0ms)']);
      const container = target.querySelector('.breadcrumbs');
      assert.exists(container);
      assert.isFalse(container.classList.contains('visible'));
    });

    it('shows a single breadcrumb when showBreadcrumbs is true', () => {
      const breadcrumb = makeSingleBreadcrumb();
      const {target} = renderView({initialBreadcrumb: breadcrumb, activeBreadcrumb: breadcrumb, showBreadcrumbs: true});

      const container = target.querySelector('.breadcrumbs');
      assert.exists(container);
      assert.isTrue(container.classList.contains('visible'));
    });

    it('renders all breadcrumbs, marks the active one and shows the container', () => {
      const [first, second] = makeThreeBreadcrumbs();
      const {target, output} = renderView({initialBreadcrumb: first, activeBreadcrumb: second, showBreadcrumbs: true});

      assert.deepEqual(rangeTexts(target), ['Full range (9.00\u00A0ms)', '7.00\u00A0ms', '5.00\u00A0ms']);
      assert.deepEqual(rangeTexts(target, '.active-breadcrumb'), ['7.00\u00A0ms']);
      const container = target.querySelector('.breadcrumbs');
      assert.exists(container);
      assert.isTrue(container.classList.contains('visible'));
      assert.isFunction(output.scrollToEnd);
    });

    it('calls onBreadcrumbClick when a breadcrumb is clicked', () => {
      const [first, second, third] = makeThreeBreadcrumbs();
      const {target, input} = renderView({initialBreadcrumb: first, activeBreadcrumb: third});

      target.querySelectorAll<HTMLElement>('.breadcrumb')[1].click();

      sinon.assert.calledOnceWithExactly(input.onBreadcrumbClick as sinon.SinonSpy, second);
    });

    it('calls onBreadcrumbContextMenu on right click', () => {
      const [first, second, third] = makeThreeBreadcrumbs();
      const {target, input} = renderView({initialBreadcrumb: first, activeBreadcrumb: third});
      const event = new MouseEvent('contextmenu', {bubbles: true});

      target.querySelectorAll<HTMLElement>('.breadcrumb')[1].dispatchEvent(event);

      sinon.assert.calledOnceWithExactly(input.onBreadcrumbContextMenu as sinon.SinonSpy, event, second);
    });
  });

  describe('screenshots', () => {
    async function renderWidget(initialBreadcrumb: Trace.Types.File.Breadcrumb,
                                activeBreadcrumb: Trace.Types.File.Breadcrumb) {
      const widget = new BreadcrumbsUI();
      widget.markAsRoot();
      renderElementIntoDOM(widget, {includeCommonStyles: true});
      widget.initialBreadcrumb = initialBreadcrumb;
      widget.activeBreadcrumb = activeBreadcrumb;
      await widget.updateComplete;
    }

    it('renders multiple breadcrumbs with the middle one active', async () => {
      const [first, second] = makeThreeBreadcrumbs();
      await renderWidget(first, second);
      // With >1 crumbs the component may scroll the container after two rAFs.
      await raf();
      await raf();

      await assertScreenshot('timeline/breadcrumbs-ui-multiple.png');
    });
  });
});
