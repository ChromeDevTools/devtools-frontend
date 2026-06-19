// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Trace from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Lit from '../../../ui/lit/lit.js';
import networkTrackWidgetStyles from './networkTrackWidget.css.js';
const { html } = Lit;
export class NetworkTrackWidget extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #flameChartContainer = document.createElement('div');
    #flameChart = null;
    #dataProvider = null;
    #parsedTrace = null;
    constructor() {
        super();
        this.#flameChartContainer.classList.add('container');
    }
    set data(data) {
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
    #render() {
        if (!this.#parsedTrace) {
            return;
        }
        const output = html `
        <style>${networkTrackWidgetStyles}</style>
        ${this.#flameChartContainer}
      `;
        // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
        Lit.render(output, this.#shadow, { host: this });
        if (this.#flameChart) {
            this.#flameChart.update();
        }
    }
    windowChanged(_windowStartTime, _windowEndTime, _animate) {
    }
    updateRangeSelection(_startTime, _endTime) {
    }
    updateSelectedGroup(_flameChart, _group) {
    }
}
if (!customElements.get('devtools-performance-agent-network-track')) {
    customElements.define('devtools-performance-agent-network-track', NetworkTrackWidget);
}
//# sourceMappingURL=NetworkTrackWidget.js.map