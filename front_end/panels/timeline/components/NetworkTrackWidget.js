// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Trace from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import networkTrackWidgetStyles from './networkTrackWidget.css.js';
const { html, render } = Lit;
const { widget } = UI.Widget;
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      <style>${networkTrackWidgetStyles}</style>
      <devtools-widget
        class="container"
        ${widget((element) => new PerfUI.FlameChart.FlameChart(input.dataProvider, input.delegate, undefined, element), { windowTimes: input.windowTimes })}
      ></devtools-widget>
    `, target);
    // clang-format on
};
export class NetworkTrackWidget extends UI.Widget.Widget {
    #dataProvider = null;
    #parsedTrace = null;
    #bounds = null;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    set data(data) {
        const parsedTrace = data.parsedTrace;
        const dataProvider = data.dataProvider;
        if (!parsedTrace || !dataProvider) {
            return;
        }
        if (this.#dataProvider === dataProvider && this.#parsedTrace === parsedTrace && this.#bounds === data.bounds) {
            return;
        }
        this.#dataProvider = dataProvider;
        this.#parsedTrace = parsedTrace;
        this.#bounds = data.bounds;
        this.requestUpdate();
    }
    performUpdate() {
        if (!this.#parsedTrace || !this.#dataProvider || !this.#bounds) {
            return;
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
        this.#view({
            dataProvider: this.#dataProvider,
            delegate: this,
            windowTimes: bounds,
        }, undefined, this.contentElement);
    }
    windowChanged(_windowStartTime, _windowEndTime, _animate) {
    }
    updateRangeSelection(_startTime, _endTime) {
    }
    updateSelectedGroup(_flameChart, _group) {
    }
}
//# sourceMappingURL=NetworkTrackWidget.js.map