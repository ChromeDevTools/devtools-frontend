// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as Timeline from '../../timeline/timeline.js';

const {html} = Lit;

export interface PerformanceAgentFlameChartData {
  parsedTrace: Trace.TraceModel.ParsedTrace|null;
  start: Trace.Types.Timing.Micro;
  end: Trace.Types.Timing.Micro;
}

export class PerformanceAgentFlameChart extends HTMLElement implements PerfUI.FlameChart.FlameChartDelegate {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #flameChartContainer = document.createElement('div');
  #flameChart: PerfUI.FlameChart.FlameChart;
  #dataProvider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider;
  #parsedTrace: Trace.TraceModel.ParsedTrace|null = null;

  constructor() {
    super();
    this.#flameChartContainer.classList.add('container');
    this.#dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    this.#flameChart = new PerfUI.FlameChart.FlameChart(this.#dataProvider, this);
    this.#flameChart.markAsRoot();
    this.#flameChart.show(this.#flameChartContainer);
    const observer = new ResizeObserver(this.#onResize.bind(this));
    observer.observe(this.#flameChartContainer);
  }

  set data(data: PerformanceAgentFlameChartData) {
    if (!data.parsedTrace) {
      return;
    }
    this.#parsedTrace = data.parsedTrace;
    const entityMapper = new Trace.EntityMapper.EntityMapper(data.parsedTrace);
    this.#dataProvider.setModel(data.parsedTrace, entityMapper);
    this.#dataProvider.buildWithCustomTracksForTest({
      filterTracks: trackName => trackName.startsWith('Main'),
      expandTracks: () => true,
    });

    let start = Trace.Types.Timing.Micro(data.start);
    let end = Trace.Types.Timing.Micro(data.end);

    const minTraceTime = data.parsedTrace.data.Meta.traceBounds.min;
    const maxTraceTime = data.parsedTrace.data.Meta.traceBounds.max;

    // If the start and end are not within the trace, display the whole trace duration.
    if (start < 0 || end < 0 || start >= end || start === end || start < minTraceTime || end > maxTraceTime) {
      start = minTraceTime;
      end = maxTraceTime;
      // eslint-disable-next-line no-console
      console.log('[GreenDev] Flamechart widget bounds reset to the whole trace duration.');
    }

    const bounds = Trace.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds({
      min: start,
      max: end,
      range: Trace.Types.Timing.Micro(end - start),
    });
    this.#flameChart.setWindowTimes(bounds.min, bounds.max);
    this.#flameChart.setSize(600, 300);
    this.#render();
  }

  #onResize(entries: ResizeObserverEntry[]): void {
    const container = entries[0];
    this.#flameChart.setSize(container.contentRect.width, 600);
  }

  #render(): void {
    if (!this.#parsedTrace) {
      return;
    }
    const output = html`
        <style>
          :host {
            display: flex;
          }

          .container {
            display: flex;
            width: 100%;
            height: 300px;
          }

          .flex-auto {
            flex: auto;
          }

          .vbox {
            display: flex;
            flex-direction: column;
            position: relative;
          }
        </style>
        ${this.#flameChartContainer}
      `;
    // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
    Lit.render(output, this.#shadow, {host: this});

    this.#flameChart.update();
    this.#flameChart.setSize(600, 300);
  }
  windowChanged(startTime: number, endTime: number, animate: boolean): void {
    this.#flameChart.setWindowTimes(startTime, endTime, animate);
  }

  updateRangeSelection(startTime: number, endTime: number): void {
    this.#flameChart.updateRangeSelection(startTime, endTime);
  }

  updateSelectedEntry(_entryIndex: number): void {
  }

  updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group|null): void {
  }
}

customElements.define('devtools-performance-agent-flame-chart', PerformanceAgentFlameChart);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-agent-flame-chart': PerformanceAgentFlameChart;
  }
}
