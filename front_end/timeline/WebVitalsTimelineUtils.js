// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as PerfUI from '../perf_ui/perf_ui.js';
import * as UI from '../ui/ui.js';

import {PerformanceModel} from './PerformanceModel.js';  // eslint-disable-line no-unused-vars
import {createWebVitalsTimeline} from './WebVitalsTimeline_bridge.js';

/**
 * @implements {PerfUI.ChartViewport.ChartViewportDelegate}
 */
export class WebVitalsIntegrator extends UI.Widget.VBox {
  /**
   *
   * @param {!PerfUI.FlameChart.FlameChartDelegate} delegate
   * @param {!PerformanceModel} model
   */
  constructor(delegate, model) {
    super(true, true);
    this.model = model;
    this.delegate = delegate;

    this.element.style.height = '120px';
    this.element.style.flex = '0 auto';

    this.webVitalsTimeline = createWebVitalsTimeline();

    this.chartViewport = new PerfUI.ChartViewport.ChartViewport(this);
    this.chartViewport.show(this.contentElement);
    this.chartViewport.alwaysShowVerticalScroll();
    this.chartViewport.setContentHeight(114);
    this.chartViewport.viewportElement.appendChild(this.webVitalsTimeline);
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   * @param {boolean} animate
   */
  windowChanged(startTime, endTime, animate) {
    this.delegate.windowChanged(startTime, endTime, animate);
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  updateRangeSelection(startTime, endTime) {
    this.delegate.updateRangeSelection(startTime, endTime);
  }

  /**
   * @override
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    this.webVitalsTimeline.setSize(width, height);
  }

  /**
   * @override
   */
  update() {
    this.webVitalsTimeline.render();
  }
}
