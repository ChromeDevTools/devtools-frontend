// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Lit from '../../../ui/lit/lit.js';

import networkTrackWidgetStyles from './networkTrackWidget.css.js';

const {html} = Lit;

// TODO: Do not redeclare the DataProvider here.
// To prevent circular dependencies with the parent timeline module (since timeline.ts
// imports and re-exports components/components.js, which in turn imports this file),
// we must not import any classes from '../../timeline/timeline.js' here.
// Instead, we declare a decoupled local `NetworkDataProvider` interface that extends
// the legacy PerfUI FlameChart data provider, and have the widget accept it.
export interface NetworkDataProvider extends PerfUI.FlameChart.FlameChartDataProvider {
  setModel(parsedTrace: Trace.TraceModel.ParsedTrace, entityMapper: Trace.EntityMapper.EntityMapper): void;
  setWindowTimes(min: number, max: number): void;
  timelineData(): PerfUI.FlameChart.FlameChartTimelineData;
  preparePopoverElement(index: number): Element|null;
}

export interface NetworkTrackWidgetData {
  parsedTrace: Trace.TraceModel.ParsedTrace|null;
  bounds: Trace.Types.Timing.TraceWindowMicro;
  dataProvider: NetworkDataProvider;
}

export class NetworkTrackWidget extends HTMLElement implements PerfUI.FlameChart.FlameChartDelegate {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #flameChartContainer = document.createElement('div');
  #flameChart: PerfUI.FlameChart.FlameChart|null = null;
  #dataProvider: NetworkDataProvider|null = null;
  #parsedTrace: Trace.TraceModel.ParsedTrace|null = null;

  constructor() {
    super();
    this.#flameChartContainer.classList.add('container');
  }

  set data(data: NetworkTrackWidgetData) {
    const parsedTrace = data.parsedTrace;
    const dataProvider = data.dataProvider;
    if (!parsedTrace || !dataProvider) {
      return;
    }

    const isDataProviderChanged = dataProvider !== this.#dataProvider;
    this.#dataProvider = dataProvider;
    this.#parsedTrace = parsedTrace;

    // 1. Render first to mount the container in the DOM so show() succeeds
    this.#render();

    // 2. Instantiate and show the flame chart in the mounted container
    if (isDataProviderChanged || !this.#flameChart) {
      this.#flameChartContainer.innerHTML = '';
      this.#flameChart = new PerfUI.FlameChart.FlameChart(this.#dataProvider, this);
      this.#flameChart.show(this.#flameChartContainer, undefined, true);
    }

    const entityMapper = Trace.EntityMapper.EntityMapper.getOrCreate(parsedTrace);
    // Override preparePopoverElement to always return null, preventing any hover tooltips
    // from being generated or rendered when the user hovers over the network request blocks.
    this.#dataProvider.preparePopoverElement = () => null;
    this.#dataProvider.setModel(parsedTrace, entityMapper);
    const timelineData = this.#dataProvider.timelineData();
    // Clearing the groups array hides the collapsible "Network" track header on the left.
    // When the groups array is empty, the FlameChart component directly renders the track
    // contents (the network requests) starting right from the top of the canvas.
    timelineData.groups = [];

    const bounds = Trace.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds({
      min: Trace.Types.Timing.Micro(data.bounds.min),
      max: Trace.Types.Timing.Micro(data.bounds.max),
      range: Trace.Types.Timing.Micro(data.bounds.range),
    });

    this.#dataProvider.setWindowTimes(bounds.min, bounds.max);
    this.#flameChart.setWindowTimes(bounds.min, bounds.max);
    this.#render();
  }

  #render(): void {
    if (!this.#parsedTrace) {
      return;
    }
    const output = html`
        <style>${networkTrackWidgetStyles}</style>
        ${this.#flameChartContainer}
      `;
    // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
    Lit.render(output, this.#shadow, {host: this});

    if (this.#flameChart) {
      this.#flameChart.update();
    }
  }

  windowChanged(_windowStartTime: number, _windowEndTime: number, _animate: boolean): void {
  }

  updateRangeSelection(_startTime: number, _endTime: number): void {
  }

  updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group|null): void {
  }
}

if (!customElements.get('devtools-performance-agent-network-track')) {
  customElements.define('devtools-performance-agent-network-track', NetworkTrackWidget);
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-agent-network-track': NetworkTrackWidget;
  }
}
