// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import {type PerformanceModel} from './PerformanceModel.js';
import {
  type TimelineEventOverview,
  TimelineEventOverviewCPUActivity,
  TimelineEventOverviewMemory,
  TimelineEventOverviewNetwork,
  TimelineEventOverviewResponsiveness,
  TimelineFilmStripOverview,
} from './TimelineEventOverview.js';
import miniMapStyles from './timelineMiniMap.css.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';

export interface OverviewData {
  performanceModel: PerformanceModel|null;
  traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData|null;
  settings: {
    showScreenshots: boolean,
    showMemory: boolean,
  };
}

/**
 * This component wraps the generic PerfUI Overview component and configures it
 * specifically for the Performance Panel, including injecting the CSS we use
 * to customise how the components render within the Performance Panel.
 */
export class TimelineMiniMap extends
    Common.ObjectWrapper.eventMixin<PerfUI.TimelineOverviewPane.EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox) {
  #overviewComponent = new PerfUI.TimelineOverviewPane.TimelineOverviewPane('timeline');
  #controls: TimelineEventOverview[] = [];

  constructor() {
    super();
    this.element.classList.add('timeline-minimap');

    this.#overviewComponent.show(this.element);
    // Push the event up into the parent component so the panel knows when the window is changed.
    this.#overviewComponent.addEventListener(PerfUI.TimelineOverviewPane.Events.WindowChanged, event => {
      this.dispatchEventToListeners(PerfUI.TimelineOverviewPane.Events.WindowChanged, event.data);
    });
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([miniMapStyles]);
  }

  reset(): void {
    this.#overviewComponent.reset();
  }

  setBounds(min: TraceEngine.Types.Timing.MilliSeconds, max: TraceEngine.Types.Timing.MilliSeconds): void {
    this.#overviewComponent.setBounds(min, max);
  }

  setWindowTimes(left: number, right: number): void {
    this.#overviewComponent.setWindowTimes(left, right);
  }

  #setMarkers(traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData): void {
    const markers = new Map<number, Element>();

    const {Meta, PageLoadMetrics} = traceParsedData;

    // Add markers for navigation start times.
    const navStartEvents = Meta.mainFrameNavigations;
    const minTimeInMilliseconds = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(Meta.traceBounds.min);

    for (const event of navStartEvents) {
      const {startTime} = TraceEngine.Legacy.timesForEventInMilliseconds(event);
      markers.set(startTime, TimelineUIUtils.createEventDivider(event, minTimeInMilliseconds));
    }

    // Now add markers for the page load events
    for (const event of PageLoadMetrics.allMarkerEvents) {
      const {startTime} = TraceEngine.Legacy.timesForEventInMilliseconds(event);
      markers.set(startTime, TimelineUIUtils.createEventDivider(event, minTimeInMilliseconds));
    }

    this.#overviewComponent.setMarkers(markers);
  }

  #setNavigationStartEvents(traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData): void {
    this.#overviewComponent.setNavStartTimes(traceParsedData.Meta.mainFrameNavigations);
  }

  setData(data: OverviewData): void {
    this.#controls = [];
    if (data.traceParsedData) {
      this.#setMarkers(data.traceParsedData);
      this.#setNavigationStartEvents(data.traceParsedData);
      this.#controls.push(new TimelineEventOverviewResponsiveness(data.traceParsedData));
    }
    this.#controls.push(new TimelineEventOverviewCPUActivity());
    if (data.traceParsedData) {
      this.#controls.push(new TimelineEventOverviewNetwork(data.traceParsedData));
    }
    if (data.settings.showScreenshots && data.traceParsedData) {
      const filmStrip = TraceEngine.Extras.FilmStrip.fromTraceData(data.traceParsedData);
      if (filmStrip.frames.length) {
        this.#controls.push(new TimelineFilmStripOverview(filmStrip));
      }
    }
    if (data.settings.showMemory && data.traceParsedData) {
      this.#controls.push(new TimelineEventOverviewMemory(data.traceParsedData));
    }
    for (const control of this.#controls) {
      control.setModel(data.performanceModel);
    }
    this.#overviewComponent.setOverviewControls(this.#controls);
  }
}
