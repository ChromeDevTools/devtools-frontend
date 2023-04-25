// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import {type TimelineFlameChartEntry, type EntryType} from './TimelineFlameChartDataProvider.js';
import {TimingsTrackAppender} from './TimingsTrackAppender.js';
import {InteractionsTrackAppender} from './InteractionsTrackAppender.js';
import {GPUTrackAppender} from './GPUTrackAppender.js';
import {LayoutShiftsTrackAppender} from './LayoutShiftsTrackAppender.js';

export type HighlightedEntryInfo = {
  title: string,
  formattedTime: string,
  warning?: string,
};

/**
 * Track appenders add the data of each track into the timeline flame
 * chart. Each track appender also implements functions tha allow the
 * canvas renderer to gather more information about an event in a track,
 * like its display name or color.
 *
 * At the moment, tracks in the timeline flame chart are appended in
 * two locations: in the TimelineFlameChartDataProvider and in the track
 * appenders exported by this module. As part of the work to use a new
 * trace parsing engine, a track appender will be defined with this API
 * for each of the tracks in the timeline. With this implementation in
 * place its counterpart in the TimelineFlameChartDataProvider can be
 * removed. This processes of doing this for a track is referred to as
 * "migrating the track" to the new system.
 *
 * The migration implementation will result benefitial among other
 * things because the complexity of rendering the details of each track
 * is distributed among multiple standalone modules.
 * Read more at go/rpp-flamechart-arch
 */

export interface TrackAppender {
  /**
   * The unique name given to the track appender.
   */
  appenderName: TrackAppenderName;

  /**
   * Appends into the flame chart data the data corresponding to a track.
   * @param level the horizontal level of the flame chart events where the
   * track's events will start being appended.
   * @param expanded wether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(level: number, expanded?: boolean): number;
  /**
   * Returns the color an event is shown with in the timeline.
   */
  colorForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string;
  /**
   * Returns the title an event is shown with in the timeline.
   */
  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string;
  /**
   * Returns the info shown when an event in the timeline is hovered.
   */
  highlightedEntryInfo(event: TraceEngine.Types.TraceEvents.TraceEventData): HighlightedEntryInfo;
}

export const TrackNames = ['Timings', 'Interactions', 'GPU', 'LayoutShifts'] as const;
export type TrackAppenderName = typeof TrackNames[number];

export class CompatibilityTracksAppender {
  #trackForLevel = new Map<number, TrackAppender>();
  #flameChartData: PerfUI.FlameChart.FlameChartTimelineData;
  #traceParsedData: TraceEngine.TraceModel.PartialTraceParseDataDuringMigration;
  #entryData: TimelineFlameChartEntry[];
  #allTrackAppenders: TrackAppender[] = [];
  #visibleTrackNames: Set<TrackAppenderName> = new Set([...TrackNames]);

  // TODO(crbug.com/1416533)
  // These are used only for compatibility with the legacy flame chart
  // architecture of the panel. Once all tracks have been migrated to
  // use the new engine and flame chart architecture, the reference can
  // be removed.
  #legacyTimelineModel: TimelineModel.TimelineModel.TimelineModelImpl;
  #legacyEntryTypeByLevel: EntryType[];
  #timingsTrackAppender: TimingsTrackAppender;
  #interactionsTrackAppender: InteractionsTrackAppender;
  #gpuTrackAppender: GPUTrackAppender;
  #layoutShiftsTrackAppender: LayoutShiftsTrackAppender;

  /**
   * @param flameChartData the data used by the flame chart renderer on
   * which the track data will be appended.
   * @param traceParsedData the trace parsing engines output.
   * @param entryData the array containing all event to be rendered in
   * the flamechart.
   * @param legacyEntryTypeByLevel an array containing the type of
   * each entry in the entryData array. Indexed by the position the
   * corresponding entry occupies in the entryData array. This reference
   * is needed only for compatibility with the legacy flamechart
   * architecture and should be removed once all tracks use the new
   * system.
   */
  constructor(
      flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
      traceParsedData: TraceEngine.TraceModel.PartialTraceParseDataDuringMigration,
      entryData: TimelineFlameChartEntry[], legacyEntryTypeByLevel: EntryType[],
      legacyTimelineModel: TimelineModel.TimelineModel.TimelineModelImpl) {
    this.#flameChartData = flameChartData;
    this.#traceParsedData = traceParsedData;
    this.#entryData = entryData;
    this.#legacyEntryTypeByLevel = legacyEntryTypeByLevel;
    this.#legacyTimelineModel = legacyTimelineModel;
    const timingsLegacyTrack =
        this.#legacyTimelineModel.tracks().find(track => track.type === TimelineModel.TimelineModel.TrackType.Timings);
    this.#timingsTrackAppender = new TimingsTrackAppender(
        this, this.#flameChartData, this.#traceParsedData, this.#entryData, this.#legacyEntryTypeByLevel,
        timingsLegacyTrack);
    this.#allTrackAppenders.push(this.#timingsTrackAppender);

    const interactionsLegacyTrack = this.#legacyTimelineModel.tracks().find(
        track => track.type === TimelineModel.TimelineModel.TrackType.UserInteractions);
    this.#interactionsTrackAppender = new InteractionsTrackAppender(
        this, this.#flameChartData, this.#traceParsedData, this.#entryData, this.#legacyEntryTypeByLevel,
        interactionsLegacyTrack);
    this.#allTrackAppenders.push(this.#interactionsTrackAppender);

    const gpuLegacyTrack =
        this.#legacyTimelineModel.tracks().find(track => track.type === TimelineModel.TimelineModel.TrackType.GPU);
    this.#gpuTrackAppender = new GPUTrackAppender(
        this, this.#flameChartData, this.#traceParsedData, this.#entryData, this.#legacyEntryTypeByLevel,
        gpuLegacyTrack);
    this.#allTrackAppenders.push(this.#gpuTrackAppender);

    // Layout Shifts track in OPP was called the "Experience" track even though
    // all it shows are layout shifts.
    const layoutShiftsLegacyTrack = this.#legacyTimelineModel.tracks().find(
        track => track.type === TimelineModel.TimelineModel.TrackType.Experience);
    this.#layoutShiftsTrackAppender = new LayoutShiftsTrackAppender(
        this, this.#flameChartData, this.#traceParsedData, this.#entryData, this.#legacyEntryTypeByLevel,
        layoutShiftsLegacyTrack);
    this.#allTrackAppenders.push(this.#layoutShiftsTrackAppender);
  }

  /**
   * Given a trace event returns instantiates a legacy SDK.Event. This should
   * be used for compatibility purposes only.
   */
  getLegacyEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): SDK.TracingModel.Event|null {
    const process = this.#legacyTimelineModel.tracingModel()?.getProcessById(event.pid);
    const thread = process?.threadById(event.tid);
    if (!thread) {
      return null;
    }
    return SDK.TracingModel.PayloadEvent.fromPayload(event as unknown as SDK.TracingManager.EventPayload, thread);
  }

  timingsTrackAppender(): TimingsTrackAppender {
    return this.#timingsTrackAppender;
  }

  interactionsTrackAppender(): InteractionsTrackAppender {
    return this.#interactionsTrackAppender;
  }

  gpuTrackAppender(): GPUTrackAppender {
    return this.#gpuTrackAppender;
  }

  layoutShiftsTrackAppender(): LayoutShiftsTrackAppender {
    return this.#layoutShiftsTrackAppender;
  }

  /**
   * Caches the track appender that owns a level. An appender takes
   * ownership of a level when it appends data to it.
   * The cache is useful to determine what appender should handle a
   * query from the flame chart renderer when an event's feature (like
   * style, title, etc.) is needed.
   */
  registerTrackForLevel(level: number, appender: TrackAppender): void {
    this.#trackForLevel.set(level, appender);
  }

  /**
   * Gets the all track appenders that have been set to be visible.
   */
  allVisibleTrackAppenders(): TrackAppender[] {
    return this.#allTrackAppenders.filter(track => this.#visibleTrackNames.has(track.appenderName));
  }

  /**
   * Sets the visible tracks internally
   * @param visibleTracks set with the names of the visible track
   * appenders. If undefined, all tracks are set to be visible.
   */
  setVisibleTracks(visibleTracks?: Set<TrackAppenderName>): void {
    if (!visibleTracks) {
      this.#visibleTrackNames = new Set([...TrackNames]);
      return;
    }
    this.#visibleTrackNames = visibleTracks;
  }

  /**
   * Returns the color an event is shown with in the timeline.
   */
  colorForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData, level: number): string {
    const track = this.#trackForLevel.get(level);
    if (!track) {
      throw new Error('Track not found for level');
    }
    return track.colorForEvent(event);
  }
  /**
   * Returns the title an event is shown with in the timeline.
   */
  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData, level: number): string {
    const track = this.#trackForLevel.get(level);
    if (!track) {
      throw new Error('Track not found for level');
    }
    return track.titleForEvent(event);
  }
  /**
   * Returns the info shown when an event in the timeline is hovered.
   */
  highlightedEntryInfo(event: TraceEngine.Types.TraceEvents.TraceEventData, level: number): HighlightedEntryInfo {
    const track = this.#trackForLevel.get(level);
    if (!track) {
      throw new Error('Track not found for level');
    }
    return track.highlightedEntryInfo(event);
  }
}
