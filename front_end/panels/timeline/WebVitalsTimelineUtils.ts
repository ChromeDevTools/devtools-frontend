// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as TimelineComponents from './components/components.js';

export class WebVitalsIntegrator extends UI.Widget.VBox implements PerfUI.ChartViewport.ChartViewportDelegate {
  delegate: PerfUI.FlameChart.FlameChartDelegate;
  webVitalsTimeline: TimelineComponents.WebVitalsTimeline.WebVitalsTimeline;
  chartViewport: PerfUI.ChartViewport.ChartViewport;

  constructor(delegate: PerfUI.FlameChart.FlameChartDelegate) {
    super(true, true);
    this.delegate = delegate;

    this.element.style.height = '120px';
    this.element.style.flex = '0 auto';

    this.webVitalsTimeline = new TimelineComponents.WebVitalsTimeline.WebVitalsTimeline();

    this.chartViewport = new PerfUI.ChartViewport.ChartViewport(this);
    this.chartViewport.show(this.contentElement);
    this.chartViewport.alwaysShowVerticalScroll();
    this.chartViewport.setContentHeight(114);
    this.chartViewport.viewportElement.appendChild(this.webVitalsTimeline);
  }

  windowChanged(startTime: number, endTime: number, animate: boolean): void {
    this.delegate.windowChanged(startTime, endTime, animate);
  }

  updateRangeSelection(startTime: number, endTime: number): void {
    this.delegate.updateRangeSelection(startTime, endTime);
  }

  setSize(width: number, height: number): void {
    this.webVitalsTimeline.setSize(width, height);
  }

  update(): void {
    this.webVitalsTimeline.render();
  }
}
