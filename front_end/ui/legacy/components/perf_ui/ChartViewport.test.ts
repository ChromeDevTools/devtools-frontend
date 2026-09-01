// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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
});
