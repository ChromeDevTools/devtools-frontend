// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as TraceEngine from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';

import {type TimelineFlameChartDataProvider} from './TimelineFlameChartDataProvider.js';
import {type TimelineFlameChartNetworkDataProvider} from './TimelineFlameChartNetworkDataProvider.js';

const NETWORK_RESIZE_ELEM_HEIGHT_PX = 8;

/**
 * Represents when a user has selected an entry in the timeline
 */
export interface EntrySelected {
  type: 'ENTRY_SELECTED';
  entry: TraceEngine.Types.TraceEvents.TraceEventData;
}

/**
 * All supported overlay types. Expected to grow in time!
 */
export type TimelineOverlay = EntrySelected;

/**
 * To be able to draw overlays accurately at the correct pixel position, we
 * need a variety of pixel values from both flame charts (Network and "Rest").
 * As each FlameChart draws, it emits an event with its latest set of
 * dimensions. That updates the Overlays and causes them to redraw.
 */
interface ActiveDimensions {
  trace: {
    visibleWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds|null,
  };
  charts: {
    main: FlameChartDimensions|null,
    network: FlameChartDimensions|null,
  };
}

interface FlameChartDimensions {
  widthPixels: number;
  heightPixels: number;
  scrollOffsetPixels: number;
}

export interface TimelineCharts {
  mainChart: PerfUI.FlameChart.FlameChart;
  mainProvider: TimelineFlameChartDataProvider;
  networkChart: PerfUI.FlameChart.FlameChart;
  networkProvider: TimelineFlameChartNetworkDataProvider;
}

export class Overlays {
  /**
   * The list of active overlays. Overlays can't be marked as visible or
   * hidden; every overlay in this list is rendered.
   * We track each overlay against the HTML Element we have rendered. This is
   * because on first render of a new overlay, we create it, but then on
   * subsequent renders we do not destroy and recreate it, instead we update it
   * based on the new position of the timeline.
   */
  #elementForOverlay: Map<TimelineOverlay, HTMLElement|null> = new Map();

  #dimensions: ActiveDimensions = {
    trace: {
      visibleWindow: null,
    },
    charts: {
      main: null,
      network: null,
    },
  };

  /**
   * To calculate the Y pixel value for an event we need access to the chart
   * and data provider in order to find out what level the event is on, and from
   * there calculate the pixel value for that level.
   */
  #charts: TimelineCharts;

  /**
   * The Overlays class will take each overlay, generate its HTML, and add it
   * to the container. This container is provided for us when the class is
   * created so we can manage its contents as overlays come and go.
   */
  #overlaysContainer: HTMLElement|null = null;

  constructor(init: {
    container: HTMLElement,
    charts: TimelineCharts,
  }) {
    this.#overlaysContainer = init.container;
    this.#charts = init.charts;
  }

  /**
   * Add a new overlay to the view.
   */
  addOverlay(overlay: TimelineOverlay): void {
    if (this.#elementForOverlay.has(overlay)) {
      return;
    }

    // By setting the value to null, we ensure that on the next render that the
    // overlay will have a new HTML element created for it.
    this.#elementForOverlay.set(overlay, null);
  }

  /**
   * Update the dimenions of a chart.
   * IMPORTANT: this does not trigger a re-draw. You must call the render() method manually.
   */
  updateChartDimensions(chart: 'main'|'network', dimensions: FlameChartDimensions): void {
    this.#dimensions.charts[chart] = dimensions;
  }

  /**
   * Update the visible window of the UI.
   * IMPORTANT: this does not trigger a re-draw. You must call the render() method manually.
   */
  updateVisibleWindow(visibleWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds): void {
    this.#dimensions.trace.visibleWindow = visibleWindow;
  }

  /**
   * Clears all overlays and all data. Call this when the trace is changing
   * (e.g. the user has imported/recorded a new trace) and we need to start from
   * scratch and remove all overlays relating to the preivous trace.
   */
  reset(): void {
    if (this.#overlaysContainer) {
      this.#overlaysContainer.innerHTML = '';
    }
    this.#elementForOverlay.clear();

    // Clear out dimensions from the old Flame Charts.
    this.#dimensions.trace.visibleWindow = null;
    this.#dimensions.charts.main = null;
    this.#dimensions.charts.network = null;
  }

  update(): void {
  }

  /**
   * Calculate the X pixel position for an event on the timeline.
   * @param chart - the chart that the event is on. It is expected that both
   * charts have the same width so this doesn't make a difference - but it might
   * in the future if the UI changes, hence asking for it.
   *
   * @param event - the trace event you want to get the pixel position of
   */
  xPixelForEventOnChart(chart: 'main'|'network', event: TraceEngine.Types.TraceEvents.TraceEventData): number|null {
    if (this.#dimensions.trace.visibleWindow === null) {
      console.error('Cannot calculate xPixel without visible trace window.');
      return null;
    }
    const canvasWidthPixels = this.#dimensions.charts[chart]?.widthPixels ?? null;
    if (!canvasWidthPixels) {
      console.error(`Cannot calculate xPixel without ${chart} dimensions.`);
      return null;
    }

    const timeFromLeft = event.ts - this.#dimensions.trace.visibleWindow.min;
    const totalTimeSpan = this.#dimensions.trace.visibleWindow.range;
    return Math.floor(
        timeFromLeft / totalTimeSpan * canvasWidthPixels,
    );
  }

  /**
   * Calculate the Y pixel position for the event on the timeline relative to
   * the entire window.
   * This means if the event is in the main flame chart and below the network,
   * we add the height of the network chart to the Y value to position it
   * correctly.
   */
  yPixelForEventOnChart(chartName: 'main'|'network', event: TraceEngine.Types.TraceEvents.TraceEventData): number|null {
    const chart = chartName === 'main' ? this.#charts.mainChart : this.#charts.networkChart;
    const provider = chartName === 'main' ? this.#charts.mainProvider : this.#charts.networkProvider;

    const indexForEntry = provider.indexForEvent(event);
    if (typeof indexForEntry !== 'number') {
      return null;
    }
    const timelineData = provider.timelineData();
    if (timelineData === null) {
      return null;
    }
    const level = timelineData.entryLevels.at(indexForEntry);
    if (typeof level === 'undefined') {
      return null;
    }

    const pixelOffsetForLevel = chart.levelToOffset(level);
    // Now we have the offset for the level, we need to adjust it by the user's scroll offset.
    let pixelAdjustedForScroll = pixelOffsetForLevel - (this.#dimensions.charts[chartName]?.scrollOffsetPixels ?? 0);

    // Now if the event is in the main chart, we need to pad its Y position
    // down by the height of the network chart + the network resize element.
    if (chartName === 'main') {
      pixelAdjustedForScroll += this.#networkChartOffsetHeight();
    }

    return pixelAdjustedForScroll;
  }

  /**
   * Calculate the height of the network chart. If the network chart has
   * height, we also allow for the size of the resize handle shown between the
   * two charts.
   */
  #networkChartOffsetHeight(): number {
    if (this.#dimensions.charts.network === null) {
      return 0;
    }

    if (this.#dimensions.charts.network.heightPixels === 0) {
      return 0;
    }

    return this.#dimensions.charts.network.heightPixels + NETWORK_RESIZE_ELEM_HEIGHT_PX;
  }
}
