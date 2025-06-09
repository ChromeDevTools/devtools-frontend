// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
});
