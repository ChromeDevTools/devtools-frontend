// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as TraceEngine from '../../models/trace/trace.js';

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
   * The Overlays class will take each overlay, generate its HTML, and add it
   * to the container. This container is provided for us when the class is
   * created so we can manage its contents as overlays come and go.
   */
  #overlaysContainer: HTMLElement|null = null;

  constructor(init: {
    container: HTMLElement,
  }) {
    this.#overlaysContainer = init.container;
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
  xPixelForEventOnChart(chart: 'main'|'network', event: TraceEngine.Types.TraceEvents.TraceEventData): number {
    if (this.#dimensions.trace.visibleWindow === null) {
      throw new Error('Cannot calculate xPixel without visible trace window.');
    }
    const canvasWidthPixels = this.#dimensions.charts[chart]?.widthPixels ?? null;
    if (!canvasWidthPixels) {
      throw new Error(`Cannot calculate xPixel without ${chart} dimensions.`);
    }

    const timeFromLeft = event.ts - this.#dimensions.trace.visibleWindow.min;
    const totalTimeSpan = this.#dimensions.trace.visibleWindow.range;
    return Math.floor(
        timeFromLeft / totalTimeSpan * canvasWidthPixels,
    );
  }
}
