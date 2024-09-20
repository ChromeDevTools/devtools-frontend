// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import {
  addDecorationToEvent,
  buildGroupStyle,
  buildTrackHeader,
  getEventLevel,
  type LastTimestampByLevel,
} from './AppenderUtils.js';
import {
  type TrackAppender,
  type TrackAppenderName,
  VisualLoggingTrackName,
} from './CompatibilityTracksAppender.js';
import * as Components from './components/components.js';
import {InstantEventVisibleDurationMs} from './TimelineFlameChartDataProvider.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  network: 'Network',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/NetworkTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type NetworkTrackEvent = Trace.Types.Events.SyntheticNetworkRequest|Trace.Types.Events.WebSocketEvent;

export class NetworkTrackAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'Network';

  #flameChartData: PerfUI.FlameChart.FlameChartTimelineData;
  webSocketIdToLevel = new Map<number, number>();
  #events: NetworkTrackEvent[] = [];

  #font: string;
  #group?: PerfUI.FlameChart.Group;

  constructor(flameChartData: PerfUI.FlameChart.FlameChartTimelineData, events: NetworkTrackEvent[]) {
    this.#flameChartData = flameChartData;
    this.#events = events;
    this.#font = `${PerfUI.Font.DEFAULT_FONT_SIZE} ${PerfUI.Font.getFontFamilyForCanvas()}`;

    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
      if (this.#group) {
        // We only need to update the color here, because FlameChart will call `scheduleUpdate()` when theme is changed.
        this.#group.style.color = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-on-surface');
        this.#group.style.backgroundColor =
            ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container');
      }
    });
  }

  group(): PerfUI.FlameChart.Group|undefined {
    return this.#group;
  }

  font(): string {
    return this.#font;
  }

  /**
   * Appends into the flame chart data the data corresponding to the
   * Network track.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded wether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel: number, expanded?: boolean|undefined): number {
    if (this.#events.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    return this.#appendEventsAtLevel(this.#events, trackStartLevel);
  }

  /**
   * Adds into the flame chart data the header corresponding to the
   * Network track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   * @param expanded wether the track should be rendered expanded.
   */
  #appendTrackHeaderAtLevel(_currentLevel: number, expanded?: boolean): void {
    const style = buildGroupStyle({
      shareHeaderLine: false,
      useFirstLineForOverview: false,
      useDecoratorsForOverview: true,
    });
    const legends: PerfUI.FlameChart.Legend[] = [];
    for (const category of Object.values(Components.Utils.NetworkCategory)) {
      legends.push({
        color: Components.Utils.colorForNetworkCategory(category),
        category,
      });
    }
    this.#group = buildTrackHeader(
        VisualLoggingTrackName.NETWORK, 0, i18nString(UIStrings.network), style, /* selectable= */ true, expanded,
        /* showStackContextMenu= */ false, legends);
    this.#flameChartData.groups.push(this.#group);
  }

  /**
   * Adds into the flame chart data a list of trace events.
   * @param events the trace events that will be appended to the flame chart.
   * The events should be taken straight from the trace handlers. The handlers
   * should sort the events by start time, and the parent event is before the
   * child.
   * @param trackStartLevel the flame chart level from which the events will
   * be appended.
   * @returns the next level after the last occupied by the appended these
   * trace events (the first available level to append next track).
   */
  #appendEventsAtLevel(events: NetworkTrackEvent[], trackStartLevel: number): number {
    // Appending everything to the same level isn't "correct", but filterTimelineDataBetweenTimes() will handle that
    // before anything is rendered.
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      this.#appendEventAtLevel(event, trackStartLevel);
      // Decorate render blocking
      if (Trace.Types.Events.isSyntheticNetworkRequest(event) &&
          Trace.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(event)) {
        addDecorationToEvent(this.#flameChartData, i, {
          type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE,
          customStartTime: event.args.data.syntheticData.sendStartTime,
          customEndTime: event.args.data.syntheticData.finishTime,
        });
      }
    }
    return this.relayoutEntriesWithinBounds(
        events, Trace.Types.Timing.MilliSeconds(-Infinity), Trace.Types.Timing.MilliSeconds(Infinity));
  }

  /**
   * Adds an event to the flame chart data at a defined level.
   * @param event the event to be appended,
   * @param level the level to append the event,
   * @returns the index of the event in all events to be rendered in the flamechart.
   */
  #appendEventAtLevel(event: Trace.Types.Events.Event, level: number): number {
    const index = this.#flameChartData.entryLevels.length;
    this.#flameChartData.entryLevels[index] = level;
    this.#flameChartData.entryStartTimes[index] = Trace.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const dur = event.dur || Trace.Helpers.Timing.millisecondsToMicroseconds(InstantEventVisibleDurationMs);
    this.#flameChartData.entryTotalTimes[index] = Trace.Helpers.Timing.microSecondsToMilliseconds(dur);
    return level;
  }

  /**
   * Update the flame chart data.
   * When users zoom in the flamechart, we only want to show them the network
   * requests between minTime and maxTime. This function will append those
   * invisible events to the last level, and hide them.
   * @returns the number of levels used by this track
   */
  relayoutEntriesWithinBounds(
      events: NetworkTrackEvent[], minTime: Trace.Types.Timing.MilliSeconds,
      maxTime: Trace.Types.Timing.MilliSeconds): number {
    if (!this.#flameChartData || events.length === 0) {
      return 0;
    }
    const lastTimestampByLevel: LastTimestampByLevel = [];
    this.webSocketIdToLevel = new Map<number, number>();
    let maxLevel = 0;
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      const beginTime = Trace.Helpers.Timing.microSecondsToMilliseconds(event.ts);
      const dur =
          event.dur ? Trace.Helpers.Timing.microSecondsToMilliseconds(event.dur) : InstantEventVisibleDurationMs;
      const endTime = beginTime + dur;
      const isBetweenTimes = beginTime < maxTime && endTime > minTime;
      // Exclude events outside the the specified timebounds
      if (!isBetweenTimes) {
        this.#flameChartData.entryLevels[i] = -1;
        continue;
      }
      // Layout the entries by assigning levels.
      let level: number;
      if ('identifier' in event.args.data && Trace.Types.Events.isWebSocketEvent(event)) {
        level = this.getWebSocketLevel(event, lastTimestampByLevel);
      } else {
        level = getEventLevel(event, lastTimestampByLevel);
      }
      this.#flameChartData.entryLevels[i] = level;
      maxLevel = Math.max(maxLevel, lastTimestampByLevel.length, level);
    }
    for (let i = 0; i < events.length; ++i) {
      // -1 means this event is invisible.
      if (this.#flameChartData.entryLevels[i] === -1) {
        // The maxLevel is an invisible level.
        this.#flameChartData.entryLevels[i] = maxLevel;
      }
    }
    return maxLevel;
  }

  getWebSocketLevel(event: Trace.Types.Events.WebSocketEvent, lastTimestampByLevel: LastTimestampByLevel): number {
    const webSocketIdentifier = event.args.data.identifier;
    let level: number;
    if (this.webSocketIdToLevel.has(webSocketIdentifier)) {
      // We're placing an instant event on top of its parent websocket
      level = this.webSocketIdToLevel.get(webSocketIdentifier) || 0;
    } else {
      // We're placing the parent websocket
      level = getEventLevel(event, lastTimestampByLevel);
      this.webSocketIdToLevel.set(webSocketIdentifier, level);
    }
    return level;
  }

  /*
    ------------------------------------------------------------------------------------
     The following methods  are invoked by the flame chart renderer to query features about
     events on rendering.
    ------------------------------------------------------------------------------------
  */

  /**
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event: Trace.Types.Events.Event): string {
    if (Trace.Types.Events.isSyntheticWebSocketConnection(event)) {
      // the synthetic WebSocket events are not selectable, so we don't need to set the color.
      return '';
    }
    if (Trace.Types.Events.isWebSocketTraceEvent(event)) {
      return Components.Utils.colorForNetworkCategory(Components.Utils.NetworkCategory.JS);
    }
    if (!Trace.Types.Events.isSyntheticNetworkRequest(event)) {
      throw new Error(`Unexpected Network Request: The event's type is '${event.name}'`);
    }
    return Components.Utils.colorForNetworkRequest(event);
  }
}
