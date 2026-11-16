// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {html, nothing, render} from '../../ui/lit/lit.js';

import * as UI from './legacy.js';

const widgetRef = UI.Widget.widgetRef;
const SplitWidget = UI.SplitWidget.SplitWidget;

describeWithEnvironment('SplitWidget', () => {
  describe('toggling', () => {
    it('returns the open state of the sidebar', async () => {
      const widget = new SplitWidget(
          true,   // isVertical
          false,  // secondIsSidebar
      );
      widget.showBoth();

      // Sidebar is showing, so toggling it hides it.
      assert.isFalse(widget.toggleSidebar());

      // Now it toggles to make it visible again
      assert.isTrue(widget.toggleSidebar());
    });

    it('does not alert LiveAnnouncer when sidebar strings are empty', () => {
      const alertSpy = sinon.spy(UI.ARIAUtils.LiveAnnouncer, 'alert');
      const widget = new SplitWidget(true, false);
      widget.showBoth();

      widget.toggleSidebar();
      widget.toggleSidebar();

      sinon.assert.notCalled(alertSpy);
    });
  });

  it('can be set to vertical and back', () => {
    const widget = new SplitWidget(false, false);
    widget.setVertical(true);
    assert.isTrue(widget.isVertical());
    widget.setVertical(false);
    assert.isFalse(widget.isVertical());
  });

  it('sets jslog attribute with drag tracking on the resizer element', () => {
    const widget = new SplitWidget(true, false);
    assert.strictEqual(widget.resizerElement().getAttribute('jslog'), 'Resizer; track: drag');
  });

  it('stacks the widgets when an auto-oriented split widget is narrow', () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    renderElementIntoDOM(container, {includeCommonStyles: true});
    const setContainerSize = (width: number, height: number): void => {
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
    };

    setContainerSize(360, 500);
    const parent = new UI.Widget.VBox();
    parent.markAsRoot();
    parent.show(container);
    const widget = new SplitWidget(true, true);
    widget.show(parent.element);
    widget.setAutoAdjustOrientation(true);
    assert.isFalse(widget.isVertical(), 'narrow and tall');

    setContainerSize(1000, 300);
    parent.doResize();
    assert.isTrue(widget.isVertical(), 'wide');

    setContainerSize(500, 400);
    parent.doResize();
    assert.isTrue(widget.isVertical(), 'narrow but even shorter');

    setContainerSize(360, 500);
    parent.doResize();
    assert.isFalse(widget.isVertical(), 'narrow and tall again');

    parent.detach();
  });

  it('can be instantiated from the template', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    let widget!: UI.SplitWidget.SplitWidget;

    // clang-format off
    render(
        html`
      <devtools-split-view direction="column" sidebar-initial-size="100"
                             ${widgetRef(SplitWidget, e => {widget = e;})}>
        <div slot="main">Main content</div>
        <div slot="sidebar">Sidebar content</div>
      </devtools-split-view>`,
        container, {host: this});
    // clang-format on

    await new Promise(resolve => setTimeout(resolve, 0));

    assert.exists(widget);
    assert.exists(widget.mainWidget());
    assert.strictEqual(widget.mainWidget()!.contentElement.textContent!.trim(), 'Main content');
    assert.strictEqual(widget.sidebarWidget()!.contentElement.textContent!.trim(), 'Sidebar content');
    assert.isFalse(widget.shouldHideOnDetach());

    widget.detach();
  });

  it('does not revert main widget when previous widget uses hideOnDetach', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const splitWidget = new SplitWidget(true, false);
    splitWidget.markAsRoot();
    splitWidget.show(container);

    const widget1 = new UI.Widget.Widget();
    widget1.setHideOnDetach();
    splitWidget.setMainWidget(widget1);
    assert.strictEqual(splitWidget.mainWidget(), widget1);

    const widget2 = new UI.Widget.Widget();
    splitWidget.setMainWidget(widget2);
    assert.strictEqual(splitWidget.mainWidget(), widget2);

    await new Promise(resolve => setTimeout(resolve, 0));
    assert.strictEqual(splitWidget.mainWidget(), widget2);

    splitWidget.detach();
  });

  it('toggles main widget visibility via show attribute on template', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    let splitWidget!: UI.SplitWidget.SplitWidget;

    const renderSplitView = (show: UI.SplitWidget.ShowAttribute) => {
      // clang-format off
      render(
          html`
        <devtools-split-view direction="column" sidebar-position="second"
                             show=${show}
                             ${widgetRef(SplitWidget, e => {splitWidget = e;})}>
          <div slot="main">Main content</div>
          <div slot="sidebar">Sidebar content</div>
        </devtools-split-view>`,
          container);
      // clang-format on
    };

    renderSplitView('sidebar');
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.exists(splitWidget);
    assert.strictEqual(splitWidget.showMode(), UI.SplitWidget.ShowMode.ONLY_SIDEBAR);
    assert.isFalse(splitWidget.mainWidget()?.isShowing());
    assert.isTrue(splitWidget.sidebarWidget()?.isShowing());

    renderSplitView('both');
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.strictEqual(splitWidget.showMode(), UI.SplitWidget.ShowMode.BOTH);
    assert.isTrue(splitWidget.mainWidget()?.isShowing());
    assert.isTrue(splitWidget.sidebarWidget()?.isShowing());

    renderSplitView('sidebar');
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.strictEqual(splitWidget.showMode(), UI.SplitWidget.ShowMode.ONLY_SIDEBAR);
    assert.isFalse(splitWidget.mainWidget()?.isShowing());
    assert.isTrue(splitWidget.sidebarWidget()?.isShowing());

    splitWidget.detach();
  });

  it('toggles sidebar widget visibility via show attribute on template', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    let splitWidget!: UI.SplitWidget.SplitWidget;

    const renderSplitView = (show: UI.SplitWidget.ShowAttribute) => {
      // clang-format off
      render(
          html`
        <devtools-split-view direction="column" sidebar-position="second"
                             show=${show}
                             ${widgetRef(SplitWidget, e => {splitWidget = e;})}>
          <div slot="main">Main content</div>
          <div slot="sidebar">Sidebar content</div>
        </devtools-split-view>`,
          container);
      // clang-format on
    };

    renderSplitView('main');
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.exists(splitWidget);
    assert.strictEqual(splitWidget.showMode(), UI.SplitWidget.ShowMode.ONLY_MAIN);
    assert.isTrue(splitWidget.mainWidget()?.isShowing());
    assert.isFalse(splitWidget.sidebarWidget()?.isShowing());

    renderSplitView('both');
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.strictEqual(splitWidget.showMode(), UI.SplitWidget.ShowMode.BOTH);
    assert.isTrue(splitWidget.mainWidget()?.isShowing());
    assert.isTrue(splitWidget.sidebarWidget()?.isShowing());

    renderSplitView('main');
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.strictEqual(splitWidget.showMode(), UI.SplitWidget.ShowMode.ONLY_MAIN);
    assert.isTrue(splitWidget.mainWidget()?.isShowing());
    assert.isFalse(splitWidget.sidebarWidget()?.isShowing());

    splitWidget.detach();
  });

  it('keeps dynamically slotted main and sidebar widgets hidden when show attribute hides them', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    let splitWidget!: UI.SplitWidget.SplitWidget;

    const renderSplitView = (slotMain: boolean, slotSidebar: boolean, show: UI.SplitWidget.ShowAttribute) => {
      // clang-format off
      render(
          html`
        <devtools-split-view direction="column" sidebar-position="second"
                             show=${show}
                             ${widgetRef(SplitWidget, e => {splitWidget = e;})}>
          ${slotMain ? html`<devtools-widget slot="main"></devtools-widget>` : nothing}
          ${slotSidebar ? html`<devtools-widget slot="sidebar"></devtools-widget>` : nothing}
        </devtools-split-view>`,
          container);
      // clang-format on
    };

    renderSplitView(false, true, 'sidebar');
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.isNull(splitWidget.mainWidget());
    assert.isTrue(splitWidget.sidebarWidget()?.isShowing());

    renderSplitView(true, true, 'sidebar');
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.exists(splitWidget.mainWidget());
    assert.isFalse(splitWidget.mainWidget()?.isShowing());
    assert.isTrue(splitWidget.sidebarWidget()?.isShowing());

    renderSplitView(true, false, 'main');
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.isTrue(splitWidget.mainWidget()?.isShowing());

    renderSplitView(true, true, 'main');
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.exists(splitWidget.sidebarWidget());
    assert.isTrue(splitWidget.mainWidget()?.isShowing());
    assert.isFalse(splitWidget.sidebarWidget()?.isShowing());

    splitWidget.detach();
  });

  it('enforces size constraints across nested split widgets', () => {
    interface BoundingBox {
      left: number;
      right: number;
      top: number;
      bottom: number;
    }

    function showRootSplitWidget(splitWidget: UI.SplitWidget.SplitWidget): UI.SplitWidget.SplitWidget {
      splitWidget.element.style.position = 'absolute';
      splitWidget.element.style.top = '0';
      splitWidget.element.style.left = '0';
      splitWidget.element.style.height = '500px';
      splitWidget.element.style.width = '500px';
      renderElementIntoDOM(splitWidget, {includeCommonStyles: true});
      return splitWidget;
    }

    function getBoundingBoxes(widgets: Record<string, UI.Widget.AnyWidget>): Record<string, BoundingBox> {
      return Object.fromEntries(Object.entries(widgets).map(([name, widget]) => {
        const {left, right, top, bottom} = widget.element.getBoundingClientRect();
        return [name, {left, right, top, bottom}];
      }));
    }

    // Create the initial split widget hierarchy.
    const splitWidget = new SplitWidget(true, true, 'splitWidgetStateSettingName.splitWidget', 250, 250);
    showRootSplitWidget(splitWidget);

    const mainWidget = new UI.Widget.Widget();
    mainWidget.setMinimumSize(100, 80);
    splitWidget.setMainWidget(mainWidget);

    const firstSidebarWidget = new UI.Widget.Widget();
    firstSidebarWidget.setMinimumSize(40, 70);
    splitWidget.setSidebarWidget(firstSidebarWidget);

    const widgets: Record<string, UI.Widget.AnyWidget> = {
      splitWidget,
      mainWidget,
      sidebarWidget: firstSidebarWidget,
    };
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 250, top: 0, bottom: 500},
      sidebarWidget: {left: 251, right: 500, top: 0, bottom: 500},
    });

    // Resize the sidebar below its minimum width.
    splitWidget.setSidebarSize(30);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 459, top: 0, bottom: 500},
      sidebarWidget: {left: 460, right: 500, top: 0, bottom: 500},
    });

    // Increase the sidebar widget minimum width.
    firstSidebarWidget.setMinimumSize(90, 70);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 409, top: 0, bottom: 500},
      sidebarWidget: {left: 410, right: 500, top: 0, bottom: 500},
    });

    // Switch the split widget orientation to horizontal.
    splitWidget.setVertical(false);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 0, bottom: 250},
      sidebarWidget: {left: 0, right: 500, top: 251, bottom: 500},
    });

    // Increase the main widget minimum size.
    mainWidget.setMinimumSize(450, 450);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 0, bottom: 450},
      sidebarWidget: {left: 0, right: 500, top: 451, bottom: 500},
    });

    // Restore the main widget minimum size and resize the sidebar.
    mainWidget.setMinimumSize(100, 80);
    splitWidget.setSidebarSize(450);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 0, bottom: 80},
      sidebarWidget: {left: 0, right: 500, top: 81, bottom: 500},
    });

    // Wrap the main widget inside a nested split widget with a hidden sidebar.
    const childSplitWidget = new SplitWidget(false, true, 'splitWidgetStateSettingName.childsplitWidget', 100, 100);
    childSplitWidget.hideSidebar();
    childSplitWidget.setMainWidget(mainWidget);
    splitWidget.setMainWidget(childSplitWidget);
    widgets['childSplitWidget'] = childSplitWidget;
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 0, bottom: 80},
      sidebarWidget: {left: 0, right: 500, top: 81, bottom: 500},
      childSplitWidget: {left: 0, right: 500, top: 0, bottom: 80},
    });

    // Attach a sidebar widget while the nested sidebar is hidden.
    const secondSidebarWidget = new UI.Widget.Widget();
    secondSidebarWidget.setMinimumSize(60, 60);
    childSplitWidget.setSidebarWidget(secondSidebarWidget);
    widgets['secondSidebarWidget'] = secondSidebarWidget;
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 0, bottom: 80},
      sidebarWidget: {left: 0, right: 500, top: 81, bottom: 500},
      childSplitWidget: {left: 0, right: 500, top: 0, bottom: 80},
      secondSidebarWidget: {left: 0, right: 0, top: 0, bottom: 0},
    });

    // Show both panes of the nested split widget.
    childSplitWidget.showBoth();
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 0, bottom: 80},
      sidebarWidget: {left: 0, right: 500, top: 142, bottom: 500},
      childSplitWidget: {left: 0, right: 500, top: 0, bottom: 141},
      secondSidebarWidget: {left: 0, right: 500, top: 81, bottom: 141},
    });

    // Detach the nested sidebar widget.
    secondSidebarWidget.detach();
    delete widgets['secondSidebarWidget'];
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 0, bottom: 80},
      sidebarWidget: {left: 0, right: 500, top: 102, bottom: 500},
      childSplitWidget: {left: 0, right: 500, top: 0, bottom: 101},
    });

    // Attach another sidebar widget to the nested split widget.
    const thirdSidebarWidget = new UI.Widget.Widget();
    thirdSidebarWidget.setMinimumSize(80, 80);
    childSplitWidget.setSidebarWidget(thirdSidebarWidget);
    widgets['thirdSidebarWidget'] = thirdSidebarWidget;
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 0, bottom: 80},
      sidebarWidget: {left: 0, right: 500, top: 162, bottom: 500},
      childSplitWidget: {left: 0, right: 500, top: 0, bottom: 161},
      thirdSidebarWidget: {left: 0, right: 500, top: 81, bottom: 161},
    });

    // Swap main and sidebar positions in the root split widget.
    splitWidget.setSecondIsSidebar(false);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 339, bottom: 419},
      sidebarWidget: {left: 0, right: 500, top: 0, bottom: 338},
      childSplitWidget: {left: 0, right: 500, top: 339, bottom: 500},
      thirdSidebarWidget: {left: 0, right: 500, top: 420, bottom: 500},
    });

    // Set minimum and preferred sizes across the hierarchy.
    firstSidebarWidget.setMinimumAndPreferredSizes(50, 50, 100, 100);
    mainWidget.setMinimumAndPreferredSizes(50, 50, 200, 200);
    thirdSidebarWidget.setMinimumAndPreferredSizes(49, 49, 99, 99);
    splitWidget.setSidebarSize(260);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 260, bottom: 420},
      sidebarWidget: {left: 0, right: 500, top: 0, bottom: 259},
      childSplitWidget: {left: 0, right: 500, top: 260, bottom: 500},
      thirdSidebarWidget: {left: 0, right: 500, top: 421, bottom: 500},
    });

    // Resize the sidebar below its preferred size.
    splitWidget.setSidebarSize(80);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 81, bottom: 400},
      sidebarWidget: {left: 0, right: 500, top: 0, bottom: 80},
      childSplitWidget: {left: 0, right: 500, top: 81, bottom: 500},
      thirdSidebarWidget: {left: 0, right: 500, top: 401, bottom: 500},
    });

    // Shrink the nested split widget proportionally between minimum and preferred sizes.
    splitWidget.setSidebarSize(320);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 320, bottom: 440},
      sidebarWidget: {left: 0, right: 500, top: 0, bottom: 319},
      childSplitWidget: {left: 0, right: 500, top: 320, bottom: 500},
      thirdSidebarWidget: {left: 0, right: 500, top: 441, bottom: 500},
    });

    // Resize the sidebar inside the nested split widget to 50px.
    childSplitWidget.setSidebarSize(50);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 320, bottom: 449},
      sidebarWidget: {left: 0, right: 500, top: 0, bottom: 319},
      childSplitWidget: {left: 0, right: 500, top: 320, bottom: 500},
      thirdSidebarWidget: {left: 0, right: 500, top: 450, bottom: 500},
    });

    // Resize the sidebar inside the nested split widget to 120px.
    childSplitWidget.setSidebarSize(120);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 320, bottom: 380},
      sidebarWidget: {left: 0, right: 500, top: 0, bottom: 319},
      childSplitWidget: {left: 0, right: 500, top: 320, bottom: 500},
      thirdSidebarWidget: {left: 0, right: 500, top: 381, bottom: 500},
    });

    // Give the nested split widget more space.
    splitWidget.setSidebarSize(170);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 170, bottom: 380},
      sidebarWidget: {left: 0, right: 500, top: 0, bottom: 169},
      childSplitWidget: {left: 0, right: 500, top: 170, bottom: 500},
      thirdSidebarWidget: {left: 0, right: 500, top: 381, bottom: 500},
    });

    // Give the nested split widget less space.
    splitWidget.setSidebarSize(360);
    assert.deepEqual(getBoundingBoxes(widgets), {
      splitWidget: {left: 0, right: 500, top: 0, bottom: 500},
      mainWidget: {left: 0, right: 500, top: 360, bottom: 451},
      sidebarWidget: {left: 0, right: 500, top: 0, bottom: 359},
      childSplitWidget: {left: 0, right: 500, top: 360, bottom: 500},
      thirdSidebarWidget: {left: 0, right: 500, top: 452, bottom: 500},
    });

    splitWidget.detach();
  });
});
