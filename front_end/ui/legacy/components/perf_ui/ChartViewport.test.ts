// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';

import {assertScreenshot} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {
  renderWidgetInVbox,
} from '../../../../testing/TraceHelpers.js';

import * as PerfUI from './perf_ui.js';

class FakeChartViewportDelegate implements PerfUI.ChartViewport.ChartViewportDelegate {
  windowChanged(): void {
  }
  updateRangeSelection(): void {
  }
  setSize(): void {
  }
  update(): void {
  }
}

describeWithEnvironment('ChartViewport', () => {
  it('does not render the virtual scrollbar if the content fits inside the height', async function() {
    const delegate = new FakeChartViewportDelegate();
    const viewport = new PerfUI.ChartViewport.ChartViewport(delegate, {enableCursorElement: false});

    renderWidgetInVbox(viewport, {
      width: 600,
      height: 400,
      flexAuto: true,
    });
    viewport.setContentHeight(300);

    await assertScreenshot('timeline/chart_viewport_content_fits_no_scroll.png');
  });

  it('does render the virtual scrollbar if the content fits and it is set to always show', async function() {
    const delegate = new FakeChartViewportDelegate();
    const viewport = new PerfUI.ChartViewport.ChartViewport(delegate, {enableCursorElement: false});
    viewport.alwaysShowVerticalScroll();

    renderWidgetInVbox(viewport, {width: 600, height: 400, flexAuto: true});
    viewport.setContentHeight(300);

    await assertScreenshot('timeline/chart_viewport_always_show_vertical_scroll.png');
  });

  it('renders the virtual scrollbar when the content is taller than the element', async function() {
    const delegate = new FakeChartViewportDelegate();
    const viewport = new PerfUI.ChartViewport.ChartViewport(delegate, {enableCursorElement: false});

    renderWidgetInVbox(viewport, {
      width: 600,
      height: 400,
      flexAuto: true,
    });
    viewport.setContentHeight(1000);

    await assertScreenshot('timeline/chart_viewport_scroll_when_overflow.png');
  });

  it('cancels any active animation when setWindowTimes is called without animation', () => {
    const delegate = new FakeChartViewportDelegate();
    const viewport = new PerfUI.ChartViewport.ChartViewport(delegate, {enableCursorElement: false});
    viewport.setBoundaries(0, 1000);
    viewport.setWindowTimes(0, 1000, false);

    assert.strictEqual(viewport.windowLeftTime(), 0);
    assert.strictEqual(viewport.windowRightTime(), 1000);

    // Start an animated window transition.
    viewport.setWindowTimes(200, 800, true);

    // Immediately interrupt with an un-animated window change.
    viewport.setWindowTimes(300, 700, false);

    assert.strictEqual(viewport.windowLeftTime(), 300);
    assert.strictEqual(viewport.windowRightTime(), 700);
  });

  it('snaps to target bounds when willHide is called during an active animation', () => {
    const delegate = new FakeChartViewportDelegate();
    const viewport = new PerfUI.ChartViewport.ChartViewport(delegate, {enableCursorElement: false});
    viewport.setBoundaries(0, 1000);
    viewport.setWindowTimes(0, 1000, false);

    // Start an animated window transition.
    viewport.setWindowTimes(200, 800, true);

    // View is hidden while animation is in flight.
    viewport.willHide();

    assert.strictEqual(viewport.windowLeftTime(), 200);
    assert.strictEqual(viewport.windowRightTime(), 800);
  });

  it('snaps immediately when setWindowTimes is called without animation to the same target as an active animation',
     () => {
       const delegate = new FakeChartViewportDelegate();
       const viewport = new PerfUI.ChartViewport.ChartViewport(delegate, {enableCursorElement: false});
       viewport.setBoundaries(0, 1000);
       viewport.setWindowTimes(0, 1000, false);

       // Start an animated window transition to (200, 800).
       viewport.setWindowTimes(200, 800, true);

       // Snap to the same target (200, 800) without animation.
       viewport.setWindowTimes(200, 800, false);

       assert.strictEqual(viewport.windowLeftTime(), 200);
       assert.strictEqual(viewport.windowRightTime(), 800);
     });

  it('advances visible window on each frame when setWindowTimes is called repeatedly with animation', async () => {
    const delegate = new FakeChartViewportDelegate();
    const viewport = new PerfUI.ChartViewport.ChartViewport(delegate, {enableCursorElement: false});
    renderWidgetInVbox(viewport, {width: 600, height: 400, flexAuto: true});
    viewport.setBoundaries(0, 1000);
    viewport.setWindowTimes(0, 1000, false);

    // Simulate a burst of wheel zoom updates before the first animation frame fires.
    viewport.setWindowTimes(50, 950, true);
    viewport.setWindowTimes(100, 900, true);

    await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));

    const leftAfterFrame1 = viewport.windowLeftTime();
    const rightAfterFrame1 = viewport.windowRightTime();
    assert.isAbove(leftAfterFrame1, 0);
    assert.isBelow(rightAfterFrame1, 1000);

    // Simulate another wheel zoom update arriving on the next frame before rAF fires.
    viewport.setWindowTimes(200, 800, true);
    await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));

    assert.isAbove(viewport.windowLeftTime(), leftAfterFrame1);
    assert.isBelow(viewport.windowRightTime(), rightAfterFrame1);

    viewport.willHide();
  });
});

describeWithEnvironment('ChartViewport with the default view', () => {
  it('exposes the rendered canvas host as the viewport element right after construction', () => {
    const viewport =
        new PerfUI.ChartViewport.ChartViewport(new FakeChartViewportDelegate(), {enableCursorElement: true});

    const {viewportElement} = viewport;

    assert.strictEqual(viewportElement.parentElement, viewport.contentElement);
    assert.isTrue(viewportElement.classList.contains('fill'));
    assert.isTrue(viewportElement.nextElementSibling?.classList.contains('chart-viewport-v-scroll'));
  });

  it('shows the cursor while Shift is held over the chart', async () => {
    const viewport =
        new PerfUI.ChartViewport.ChartViewport(new FakeChartViewportDelegate(), {enableCursorElement: true});
    renderWidgetInVbox(viewport, {width: 600, height: 400, flexAuto: true});
    const cursorElement = viewport.contentElement.querySelector('.chart-cursor-element');
    assert.instanceOf(cursorElement, HTMLElement);
    assert.isTrue(cursorElement.hidden);

    viewport.viewportElement.dispatchEvent(new MouseEvent('mousemove', {shiftKey: true}));
    await viewport.updateComplete;

    assert.isFalse(cursorElement.hidden);
  });

  it('shows the vertical scrollbar when alwaysShowVerticalScroll is called after setContentHeight', async () => {
    const viewport =
        new PerfUI.ChartViewport.ChartViewport(new FakeChartViewportDelegate(), {enableCursorElement: false});
    renderWidgetInVbox(viewport, {width: 600, height: 400, flexAuto: true});
    viewport.onResize();
    viewport.setContentHeight(100);
    assert.isFalse(viewport.verticalScrollBarVisible());

    viewport.alwaysShowVerticalScroll();
    await viewport.updateComplete;

    assert.isTrue(viewport.verticalScrollBarVisible());
  });

  it('does not show the cursor on Shift keydown when enableCursorElement is false', async () => {
    const viewport =
        new PerfUI.ChartViewport.ChartViewport(new FakeChartViewportDelegate(), {enableCursorElement: false});
    renderWidgetInVbox(viewport, {width: 600, height: 400, flexAuto: true});
    const cursorElement = viewport.contentElement.querySelector<HTMLElement>('.chart-cursor-element');
    assert.instanceOf(cursorElement, HTMLElement);

    viewport.viewportElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Shift', shiftKey: true}));
    await viewport.updateComplete;

    assert.isTrue(cursorElement.hidden);
  });

  it('positions the cursor at the hovered offset when Shift is pressed after mousemove', async () => {
    const viewport =
        new PerfUI.ChartViewport.ChartViewport(new FakeChartViewportDelegate(), {enableCursorElement: true});
    renderWidgetInVbox(viewport, {width: 600, height: 400, flexAuto: true});
    const cursorElement = viewport.contentElement.querySelector<HTMLElement>('.chart-cursor-element');
    assert.instanceOf(cursorElement, HTMLElement);

    const moveEvent = new MouseEvent('mousemove', {shiftKey: false});
    Object.defineProperty(moveEvent, 'offsetX', {value: 145});
    viewport.viewportElement.dispatchEvent(moveEvent);
    viewport.viewportElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Shift', shiftKey: true}));
    await viewport.updateComplete;

    assert.isFalse(cursorElement.hidden);
    assert.strictEqual(cursorElement.style.left, '145px');
  });
});
