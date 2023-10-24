// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as Helpers from '../../models/trace/helpers/helpers.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as TimingTypes from '../../models/trace/types/types.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as TimelineComponents from './components/components.js';
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
import {ThreadTracksSource} from './TimelinePanel.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';

export interface OverviewData {
  performanceModel: PerformanceModel|null;
  traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData|null;
  isCpuProfile?: boolean;
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
  breadcrumbsActivated: boolean = false;
  #overviewComponent = new PerfUI.TimelineOverviewPane.TimelineOverviewPane('timeline');
  #controls: TimelineEventOverview[] = [];
  breadcrumbs: TimelineComponents.Breadcrumbs.Breadcrumbs|null = null;
  #breadcrumbsUI: TimelineComponents.BreadcrumbsUI.BreadcrumbsUI;
  #minTime: TimingTypes.Timing.MilliSeconds = TimingTypes.Timing.MilliSeconds(0);
  // Once the sync tracks migration is completely shipped, this can be removed.
  #threadTracksSource: ThreadTracksSource;

  constructor(threadTracksSource: ThreadTracksSource) {
    super();
    this.#threadTracksSource = threadTracksSource;
    this.element.classList.add('timeline-minimap');
    this.#breadcrumbsUI = new TimelineComponents.BreadcrumbsUI.BreadcrumbsUI();

    this.#overviewComponent.show(this.element);
    // Push the event up into the parent component so the panel knows when the window is changed.
    this.#overviewComponent.addEventListener(PerfUI.TimelineOverviewPane.Events.WindowChanged, event => {
      if (this.breadcrumbs) {
        this.dispatchEventToListeners(PerfUI.TimelineOverviewPane.Events.WindowChanged, {
          ...event.data,
          breadcrumb: {
            min: TraceEngine.Types.Timing.MicroSeconds(this.breadcrumbs.lastBreadcrumb.window.min + this.#minTime),
            max: TraceEngine.Types.Timing.MicroSeconds(this.breadcrumbs.lastBreadcrumb.window.max + this.#minTime),
            range: TraceEngine.Types.Timing.MicroSeconds(
                this.breadcrumbs.lastBreadcrumb.window.max - this.breadcrumbs.lastBreadcrumb.window.min),
          },
        });
      } else {
        this.dispatchEventToListeners(PerfUI.TimelineOverviewPane.Events.WindowChanged, event.data);
      }
    });

    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.BREADCRUMBS_PERFORMANCE_PANEL)) {
      this.activateBreadcrumbs();
    }
  }

  activateBreadcrumbs(): void {
    this.breadcrumbsActivated = true;
    this.element.prepend(this.#breadcrumbsUI);
    this.#overviewComponent.addEventListener(PerfUI.TimelineOverviewPane.Events.BreadcrumbAdded, event => {
      this.addBreadcrumb(this.breadcrumbWindowBounds(event.data));
    });

    this.#breadcrumbsUI.addEventListener(TimelineComponents.BreadcrumbsUI.BreadcrumbRemovedEvent.eventName, event => {
      const breadcrumb = (event as TimelineComponents.BreadcrumbsUI.BreadcrumbRemovedEvent).breadcrumb;
      this.removeBreadcrumb(breadcrumb);
    });
    this.#overviewComponent.enableCreateBreadcrumbsButton();
  }

  // If the window sliders are on the edges of the window, the window values are set to 0 or Infity.
  // This behaviour is not needed for breadcrumbs so we reset them to the maximum or minimum window boundary.
  breadcrumbWindowBounds(breadcrumbWindow: PerfUI.TimelineOverviewPane.BreadcrumbAddedEvent):
      PerfUI.TimelineOverviewPane.BreadcrumbAddedEvent {
    breadcrumbWindow.endTime = TraceEngine.Types.Timing.MilliSeconds(
        Math.min(this.#overviewComponent.overviewCalculator.maximumBoundary(), breadcrumbWindow.endTime));
    breadcrumbWindow.startTime = TraceEngine.Types.Timing.MilliSeconds(
        Math.max(this.#overviewComponent.overviewCalculator.minimumBoundary(), breadcrumbWindow.startTime));

    return breadcrumbWindow;
  }

  addBreadcrumb({startTime, endTime}: PerfUI.TimelineOverviewPane.BreadcrumbAddedEvent): void {
    const startWithoutMin = startTime - this.#minTime;
    const endWithoutMin = endTime - this.#minTime;

    const traceWindow: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(startWithoutMin),
      max: TraceEngine.Types.Timing.MicroSeconds(endWithoutMin),
      range: TraceEngine.Types.Timing.MicroSeconds(endWithoutMin - startWithoutMin),
    };
    if (this.breadcrumbs === null) {
      this.breadcrumbs = new TimelineComponents.Breadcrumbs.Breadcrumbs(traceWindow);

    } else {
      this.breadcrumbs.add(traceWindow);
      this.setBounds(startTime, endTime);
      this.#overviewComponent.scheduleUpdate(startTime, endTime);
    }

    this.#breadcrumbsUI.data = {
      breadcrumb: this.breadcrumbs.initialBreadcrumb,
    };
  }

  removeBreadcrumb(breadcrumb: TimelineComponents.Breadcrumbs.Breadcrumb): void {
    const startMSWithMin = TraceEngine.Types.Timing.MilliSeconds(breadcrumb.window.min + this.#minTime);
    const endMSWithMin = TraceEngine.Types.Timing.MilliSeconds(breadcrumb.window.max + this.#minTime);

    if (this.breadcrumbs) {
      this.breadcrumbs.makeBreadcrumbActive(breadcrumb);
      // Only the initial breadcrumb is passed in because breadcrumbs are stored in a linked list and breadcrumbsUI component iterates through them
      this.#breadcrumbsUI.data = {
        breadcrumb: this.breadcrumbs.initialBreadcrumb,
      };
    }

    this.setBounds(startMSWithMin, endMSWithMin);
    this.#overviewComponent.scheduleUpdate(startMSWithMin, endMSWithMin);
    this.#overviewComponent.setWindowTimes(startMSWithMin, endMSWithMin);
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
    if (data.traceParsedData?.Meta.traceBounds.min !== undefined) {
      this.#minTime = Helpers.Timing.microSecondsToMilliseconds(data.traceParsedData?.Meta.traceBounds.min);
    }

    if (data.traceParsedData) {
      this.#setMarkers(data.traceParsedData);
      this.#setNavigationStartEvents(data.traceParsedData);
      this.#controls.push(new TimelineEventOverviewResponsiveness(data.traceParsedData));
      // TODO: Once we commit to shipping sync tracks, we can remove this
      // conditional and update the CPUActivity component to not be given the
      // PerformanceModel instance.
      if (this.#threadTracksSource === ThreadTracksSource.NEW_ENGINE) {
        this.#controls.push(new TimelineEventOverviewCPUActivity(null, data.traceParsedData));
      }
    }

    const useOldEngineForCpu = this.#threadTracksSource !== ThreadTracksSource.NEW_ENGINE;
    if (data.performanceModel && useOldEngineForCpu) {
      this.#controls.push(new TimelineEventOverviewCPUActivity(data.performanceModel, null));
    }

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
    this.#overviewComponent.setOverviewControls(this.#controls);
  }

  addInitialBreadcrumb(): void {
    // Create first breadcrumb from the initial full window
    this.breadcrumbs = null;
    this.addBreadcrumb(this.breadcrumbWindowBounds({
      startTime: TraceEngine.Types.Timing.MilliSeconds(this.#overviewComponent.overviewCalculator.minimumBoundary()),
      endTime: TraceEngine.Types.Timing.MilliSeconds(this.#overviewComponent.overviewCalculator.maximumBoundary()),
    }));
  }
}
