// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import networkTrackWidgetStyles from './networkTrackWidget.css.js';

const {html, render} = Lit;
const {widget} = UI.Widget;

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
  preparePopoverElement(index: number): Lit.TemplateResult|null;
}

export interface NetworkTrackWidgetData {
  parsedTrace: Trace.TraceModel.ParsedTrace|null;
  bounds: Trace.Types.Timing.TraceWindowMicro;
  dataProvider: NetworkDataProvider;
}

export interface ViewInput {
  flameChart: PerfUI.FlameChart.FlameChart;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(
    html`
      <style>${networkTrackWidgetStyles}</style>
      <devtools-widget class="container" ${widget(UI.Widget.WrapperWidget, {widget: input.flameChart})}></devtools-widget>
    `,
    target);
  // clang-format on
};

export class NetworkTrackWidget extends UI.Widget.Widget implements PerfUI.FlameChart.FlameChartDelegate {
  #flameChart: PerfUI.FlameChart.FlameChart|null = null;
  #dataProvider: NetworkDataProvider|null = null;
  #parsedTrace: Trace.TraceModel.ParsedTrace|null = null;
  #bounds: Trace.Types.Timing.TraceWindowMicro|null = null;
  readonly #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set data(data: NetworkTrackWidgetData) {
    const parsedTrace = data.parsedTrace;
    const dataProvider = data.dataProvider;
    if (!parsedTrace || !dataProvider) {
      return;
    }
    if (this.#dataProvider === dataProvider && this.#parsedTrace === parsedTrace && this.#bounds === data.bounds) {
      return;
    }

    if (dataProvider !== this.#dataProvider) {
      this.#flameChart = null;
    }
    this.#dataProvider = dataProvider;
    this.#parsedTrace = parsedTrace;
    this.#bounds = data.bounds;
    this.requestUpdate();
  }

  override performUpdate(): void {
    if (!this.#parsedTrace || !this.#dataProvider || !this.#bounds) {
      return;
    }

    if (!this.#flameChart) {
      this.#flameChart = new PerfUI.FlameChart.FlameChart(this.#dataProvider, this);
    }

    const entityMapper = Trace.EntityMapper.EntityMapper.getOrCreate(this.#parsedTrace);
    // Override preparePopoverElement to always return null, preventing any hover tooltips
    // from being generated or rendered when the user hovers over the network request blocks.
    this.#dataProvider.preparePopoverElement = () => null;
    this.#dataProvider.setModel(this.#parsedTrace, entityMapper);
    const timelineData = this.#dataProvider.timelineData();
    // Clearing the groups array hides the collapsible "Network" track header on the left.
    // When the groups array is empty, the FlameChart component directly renders the track
    // contents (the network requests) starting right from the top of the canvas.
    timelineData.groups = [];

    const bounds = Trace.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds({
      min: Trace.Types.Timing.Micro(this.#bounds.min),
      max: Trace.Types.Timing.Micro(this.#bounds.max),
      range: Trace.Types.Timing.Micro(this.#bounds.range),
    });

    this.#dataProvider.setWindowTimes(bounds.min, bounds.max);
    this.#flameChart.setWindowTimes(bounds.min, bounds.max);
    this.#view({flameChart: this.#flameChart}, undefined, this.contentElement);
    this.#flameChart.update();
  }

  windowChanged(_windowStartTime: number, _windowEndTime: number, _animate: boolean): void {
  }

  updateRangeSelection(_startTime: number, _endTime: number): void {
  }

  updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group|null): void {
  }
}
