// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Trace from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as Timeline from '../../timeline/timeline.js';
const { html } = Lit;
export class PerformanceAgentFlameChart extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #flameChartContainer = document.createElement('div');
    #flameChart;
    #dataProvider;
    #parsedTrace = null;
    constructor() {
        super();
        this.#flameChartContainer.classList.add('container');
        this.#dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
        this.#flameChart = new PerfUI.FlameChart.FlameChart(this.#dataProvider, this);
        this.#flameChart.markAsRoot();
        this.#flameChart.show(this.#flameChartContainer);
    }
    set data(data) {
        if (!data.parsedTrace) {
            return;
        }
        if (data.parsedTrace === this.#parsedTrace) {
            return;
        }
        this.#parsedTrace = data.parsedTrace;
        const entityMapper = new Trace.EntityMapper.EntityMapper(data.parsedTrace);
        this.#dataProvider.setModel(data.parsedTrace, entityMapper);
        this.#dataProvider.buildWithCustomTracksForTest({
            filterTracks: trackName => trackName.startsWith('Main'),
            expandTracks: () => true,
        });
        const bounds = Trace.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds({
            min: Trace.Types.Timing.Micro(data.start),
            max: Trace.Types.Timing.Micro(data.end),
            range: Trace.Types.Timing.Micro(data.end - data.start)
        });
        this.#flameChart.setWindowTimes(bounds.min, bounds.max);
        this.#flameChart.setSize(600, 200);
        this.#render();
    }
    #render() {
        if (!this.#parsedTrace) {
            return;
        }
        const output = html `
        <style>
          :host {
            display: flex;
          }

          .container {
            display: flex;
            width: 600px;
            height: 200px;
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
        Lit.render(output, this.#shadow, { host: this });
        this.#flameChart.update();
        this.#flameChart.setSize(600, 200);
    }
    windowChanged(startTime, endTime, animate) {
        this.#flameChart.setWindowTimes(startTime, endTime, animate);
    }
    updateRangeSelection(startTime, endTime) {
        this.#flameChart.updateRangeSelection(startTime, endTime);
    }
    updateSelectedEntry(_entryIndex) {
    }
    updateSelectedGroup(_flameChart, _group) {
    }
}
customElements.define('devtools-performance-agent-flame-chart', PerformanceAgentFlameChart);
//# sourceMappingURL=PerformanceAgentFlameChart.js.map