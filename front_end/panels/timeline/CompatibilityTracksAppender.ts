// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import {AnimationsTrackAppender} from './AnimationsTrackAppender.js';
import {getEventLevel} from './AppenderUtils.js';
import * as TimelineComponents from './components/components.js';
import {getEventStyle} from './EventUICategory.js';
import {GPUTrackAppender} from './GPUTrackAppender.js';
import {InteractionsTrackAppender} from './InteractionsTrackAppender.js';
import {LayoutShiftsTrackAppender} from './LayoutShiftsTrackAppender.js';
import {ThreadAppender} from './ThreadAppender.js';
import {
  EntryType,
  InstantEventVisibleDurationMs,
  type TimelineFlameChartEntry,
} from './TimelineFlameChartDataProvider.js';
import {TimingsTrackAppender} from './TimingsTrackAppender.js';

export type HighlightedEntryInfo = {
  title: string,
  formattedTime: string,
  warningElements?: HTMLSpanElement[],
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
 * The migration implementation will result beneficial among other
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
  /**
   * The EntriesFilter instance that used to modify the trees in a track based on user actions,
   * e.g collapsing functions, etc.
   */
  entriesFilter?(): TraceEngine.EntriesFilter.EntriesFilter;
}

export const TrackNames =
    ['Animations', 'Timings', 'Interactions', 'GPU', 'LayoutShifts', 'Thread', 'Thread_AuctionWorklet'] as const;
// Network track will use TrackAppender interface, but it won't be shown in Main flamechart.
// So manually add it to TrackAppenderName.
export type TrackAppenderName = typeof TrackNames[number]|'Network';

export class CompatibilityTracksAppender {
  #trackForLevel = new Map<number, TrackAppender>();
  #trackForGroup = new Map<PerfUI.FlameChart.Group, TrackAppender>();
  #eventsForTrack = new Map<TrackAppender, TraceEngine.Types.TraceEvents.TraceEventData[]>();
  #trackEventsForTreeview = new Map<TrackAppender, TraceEngine.Types.TraceEvents.TraceEventData[]>();
  #flameChartData: PerfUI.FlameChart.FlameChartTimelineData;
  #traceParsedData: TraceEngine.Handlers.Types.TraceParseData;
  #entryData: TimelineFlameChartEntry[];
  #colorGenerator: Common.Color.Generator;
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
  #animationsTrackAppender: AnimationsTrackAppender;
  #interactionsTrackAppender: InteractionsTrackAppender;
  #gpuTrackAppender: GPUTrackAppender;
  #layoutShiftsTrackAppender: LayoutShiftsTrackAppender;
  #threadAppenders: ThreadAppender[] = [];

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
      traceParsedData: TraceEngine.Handlers.Types.TraceParseData, entryData: TimelineFlameChartEntry[],
      legacyEntryTypeByLevel: EntryType[], legacyTimelineModel: TimelineModel.TimelineModel.TimelineModelImpl) {
    this.#flameChartData = flameChartData;
    this.#traceParsedData = traceParsedData;
    this.#entryData = entryData;
    this.#colorGenerator = new Common.Color.Generator(
        /* hueSpace= */ {min: 30, max: 55, count: undefined},
        /* satSpace= */ {min: 70, max: 100, count: 6},
        /* lightnessSpace= */ 50,
        /* alphaSpace= */ 0.7);
    this.#legacyEntryTypeByLevel = legacyEntryTypeByLevel;
    this.#legacyTimelineModel = legacyTimelineModel;
    this.#timingsTrackAppender = new TimingsTrackAppender(this, this.#traceParsedData, this.#colorGenerator);
    this.#allTrackAppenders.push(this.#timingsTrackAppender);

    this.#interactionsTrackAppender = new InteractionsTrackAppender(this, this.#traceParsedData, this.#colorGenerator);
    this.#allTrackAppenders.push(this.#interactionsTrackAppender);

    this.#animationsTrackAppender = new AnimationsTrackAppender(this, this.#traceParsedData);
    this.#allTrackAppenders.push(this.#animationsTrackAppender);

    this.#gpuTrackAppender = new GPUTrackAppender(this, this.#traceParsedData);
    this.#allTrackAppenders.push(this.#gpuTrackAppender);

    // Layout Shifts track in OPP was called the "Experience" track even though
    // all it shows are layout shifts.
    this.#layoutShiftsTrackAppender = new LayoutShiftsTrackAppender(this, this.#traceParsedData);
    this.#allTrackAppenders.push(this.#layoutShiftsTrackAppender);

    this.#addThreadAppenders();
    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
      for (const group of this.#flameChartData.groups) {
        // We only need to update the color here, because FlameChart will call `scheduleUpdate()` when theme is changed.
        group.style.color = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-on-surface');
        group.style.backgroundColor =
            ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container');
      }
    });
  }

  setFlameChartDataAndEntryData(
      flameChartData: PerfUI.FlameChart.FlameChartTimelineData, entryData: TimelineFlameChartEntry[],
      legacyEntryTypeByLevel: EntryType[]): void {
    this.#trackForGroup.clear();
    this.#flameChartData = flameChartData;
    this.#entryData = entryData;
    this.#legacyEntryTypeByLevel = legacyEntryTypeByLevel;
  }

  getFlameChartTimelineData(): PerfUI.FlameChart.FlameChartTimelineData {
    return this.#flameChartData;
  }

  modifyTree(
      group: PerfUI.FlameChart.Group, entry: TraceEngine.Types.TraceEvents.SyntheticTraceEntry,
      type: TraceEngine.EntriesFilter.FilterAction): void {
    const appender = this.#trackForGroup.get(group);
    if (appender && appender.entriesFilter) {
      appender.entriesFilter().applyFilterAction({entry, type});
    } else {
      console.warn('Could not modify tree on a track.');
    }
  }

  findPossibleContextMenuActions(
      group: PerfUI.FlameChart.Group,
      node: TraceEngine.Types.TraceEvents.SyntheticTraceEntry): TraceEngine.EntriesFilter.PossibleFilterActions|void {
    const appender = this.#trackForGroup.get(group);
    if (appender && appender.entriesFilter) {
      return appender.entriesFilter().findPossibleActions(node);
    }
    console.warn('Could not modify tree on a track.');
  }

  findHiddenDescendantsAmount(group: PerfUI.FlameChart.Group, node: TraceEngine.Types.TraceEvents.SyntheticTraceEntry):
      number|void {
    const appender = this.#trackForGroup.get(group);
    if (appender && appender.entriesFilter) {
      return appender.entriesFilter().findHiddenDescendantsAmount(node);
    }
    console.warn('Could not find hidden entries on a track.');
  }

  #addThreadAppenders(): void {
    const weight = (appender: ThreadAppender): number => {
      switch (appender.threadType) {
        case TraceEngine.Handlers.Threads.ThreadType.MAIN_THREAD: {
          // Within tracks of the main thread, those with data
          // from about:blank are treated with the lowest priority,
          // since there's a chance they have only noise from the
          // navigation to about:blank done on record and reload.
          if (!appender.getUrl()) {
            // We expect each appender to have a URL as we filter out empty URL
            // processes, but in the event that we do not have a URL (can
            // happen for a generic trace), return 2, to ensure these are put
            // below any that do have value URLs.
            return 2;
          }
          const asUrl = new URL(appender.getUrl());
          if (asUrl.protocol === 'about:') {
            return 2;
          }
          return (appender.isOnMainFrame && appender.getUrl() !== '') ? 0 : 1;
        }
        case TraceEngine.Handlers.Threads.ThreadType.WORKER:
          return 3;
        case TraceEngine.Handlers.Threads.ThreadType.RASTERIZER:
          return 4;
        case TraceEngine.Handlers.Threads.ThreadType.THREAD_POOL:
          return 5;
        case TraceEngine.Handlers.Threads.ThreadType.AUCTION_WORKLET:
          return 6;
        case TraceEngine.Handlers.Threads.ThreadType.OTHER:
          return 7;
        default:
          return 8;
      }
    };
    const threads = TraceEngine.Handlers.Threads.threadsInTrace(this.#traceParsedData);
    const processedAuctionWorkletsIds = new Set<TraceEngine.Types.TraceEvents.ProcessID>();

    for (const {pid, tid, name, type} of threads) {
      if (this.#traceParsedData.Meta.traceIsGeneric) {
        // If the trace is generic, we just push all of the threads with no
        // effort to differentiate them, hence overriding the thread type to be
        // OTHER for all threads.
        this.#threadAppenders.push(new ThreadAppender(
            this, this.#traceParsedData, pid, tid, name, TraceEngine.Handlers.Threads.ThreadType.OTHER));
        continue;
      }

      const maybeWorklet = this.#traceParsedData.AuctionWorklets.worklets.get(pid);
      if (processedAuctionWorkletsIds.has(pid)) {
        // Keep track of this process to ensure we only add the following
        // tracks once per process and not once per thread.
        continue;
      }
      if (maybeWorklet) {
        processedAuctionWorkletsIds.add(pid);
        // Each AuctionWorklet event represents two threads:
        // 1. the Utility Thread
        // 2. the V8 Helper Thread
        // Note that the names passed here are not used visually. TODO: remove this name?
        this.#threadAppenders.push(new ThreadAppender(
            this, this.#traceParsedData, pid, maybeWorklet.args.data.utilityThread.tid, 'auction-worket-utility',
            TraceEngine.Handlers.Threads.ThreadType.AUCTION_WORKLET));
        this.#threadAppenders.push(new ThreadAppender(
            this, this.#traceParsedData, pid, maybeWorklet.args.data.v8HelperThread.tid, 'auction-worklet-v8helper',
            TraceEngine.Handlers.Threads.ThreadType.AUCTION_WORKLET));
        continue;
      }

      this.#threadAppenders.push(new ThreadAppender(this, this.#traceParsedData, pid, tid, name, type));
    }

    this.#threadAppenders.sort((a, b) => weight(a) - weight(b));
    this.#allTrackAppenders.push(...this.#threadAppenders);
  }
  /**
   * Given a trace event returns instantiates a legacy SDK.Event. This should
   * be used for compatibility purposes only.
   */
  getLegacyEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): TraceEngine.Legacy.Event|null {
    const process = this.#legacyTimelineModel.tracingModel()?.getProcessById(event.pid);
    const thread = process?.threadById(event.tid);
    if (!thread) {
      return null;
    }
    return TraceEngine.Legacy.PayloadEvent.fromPayload(
        event as unknown as TraceEngine.TracingManager.EventPayload, thread);
  }

  timingsTrackAppender(): TimingsTrackAppender {
    return this.#timingsTrackAppender;
  }

  animationsTrackAppender(): AnimationsTrackAppender {
    return this.#animationsTrackAppender;
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

  threadAppenders(): ThreadAppender[] {
    return this.#threadAppenders;
  }

  eventsInTrack(trackAppender: TrackAppender): TraceEngine.Types.TraceEvents.TraceEventData[] {
    const cachedData = this.#eventsForTrack.get(trackAppender);
    if (cachedData) {
      return cachedData;
    }

    // Calculate the levels occupied by a track.
    let trackStartLevel = null;
    let trackEndLevel = null;
    for (const [level, track] of this.#trackForLevel) {
      if (track !== trackAppender) {
        continue;
      }
      if (trackStartLevel === null) {
        trackStartLevel = level;
      }
      trackEndLevel = level;
    }

    if (trackStartLevel === null || trackEndLevel === null) {
      throw new Error(`Could not find events for track: ${trackAppender}`);
    }
    const entryLevels = this.#flameChartData.entryLevels;
    const events = [];
    for (let i = 0; i < entryLevels.length; i++) {
      if (trackStartLevel <= entryLevels[i] && entryLevels[i] <= trackEndLevel) {
        events.push(this.#entryData[i] as TraceEngine.Types.TraceEvents.TraceEventData);
      }
    }
    events.sort((a, b) => a.ts - b.ts);
    this.#eventsForTrack.set(trackAppender, events);
    return events;
  }

  /**
   * Determines if the given events, which are assumed to be ordered can
   * be organized into tree structures.
   * This condition is met if there is *not* a pair of async events
   * e1 and e2 where:
   *
   * e1.startTime <= e2.startTime && e1.endTime > e2.startTime && e1.endTime > e2.endTime.
   * or, graphically:
   * |------- e1 ------|
   *   |------- e2 --------|
   *
   * Because a parent-child relationship cannot be made from the example
   * above, a tree cannot be made from the set of events.
   *
   * Note that this will also return true if multiple trees can be
   * built, for example if none of the events overlap with each other.
   */
  canBuildTreesFromEvents(events: readonly TraceEngine.Types.TraceEvents.TraceEventData[]): boolean {
    const stack: TraceEngine.Types.TraceEvents.TraceEventData[] = [];
    for (const event of events) {
      const startTime = event.ts;
      const endTime = event.ts + (event.dur || 0);
      let parent = stack.at(-1);
      if (parent === undefined) {
        stack.push(event);
        continue;
      }
      let parentEndTime = parent.ts + (parent.dur || 0);
      // Discard events that are not parents for this event. The parent
      // is one whose end time is after this event start time.
      while (stack.length && startTime >= parentEndTime) {
        stack.pop();
        parent = stack.at(-1);

        if (parent === undefined) {
          break;
        }
        parentEndTime = parent.ts + (parent.dur || 0);
      }
      if (stack.length && endTime > parentEndTime) {
        // If such an event exists but its end time is before this
        // event's end time, then a tree cannot be made using this
        // events.
        return false;
      }
      stack.push(event);
    }
    return true;
  }

  /**
   * Gets the events to be shown in the tree views of the details pane
   * (Bottom-up, Call tree, etc.). These are the events from the track
   * that can be arranged in a tree shape.
   */
  eventsForTreeView(trackAppender: TrackAppender): TraceEngine.Types.TraceEvents.TraceEventData[] {
    const cachedData = this.#trackEventsForTreeview.get(trackAppender);
    if (cachedData) {
      return cachedData;
    }

    let trackEvents = this.eventsInTrack(trackAppender);
    if (!this.canBuildTreesFromEvents(trackEvents)) {
      // Some tracks can include both async and sync events. When this
      // happens, we use all events for the tree views if a trees can be
      // built from both sync and async events. If this is not possible,
      // async events are filtered out and only sync events are used
      // (it's assumed a tree can always be built using a tracks sync
      // events).
      trackEvents = trackEvents.filter(e => !TraceEngine.Types.TraceEvents.isAsyncPhase(e.ph));
    }
    this.#trackEventsForTreeview.set(trackAppender, trackEvents);
    return trackEvents;
  }

  /**
   * Caches the track appender that owns a flame chart group. FlameChart
   * groups are created for each track in the timeline. When an user
   * selects a track in the UI, the track's group is passed to the model
   * layer to inform about the selection.
   */
  registerTrackForGroup(group: PerfUI.FlameChart.Group, appender: TrackAppender): void {
    this.#flameChartData.groups.push(group);
    this.#trackForGroup.set(group, appender);
  }

  /**
   * Returns number of tracks of given type already appended.
   * Used to name the "Raster Thread 6" tracks, etc
   */
  getCurrentTrackCountForThreadType(threadType: TraceEngine.Handlers.Threads.ThreadType.RASTERIZER|
                                    TraceEngine.Handlers.Threads.ThreadType.THREAD_POOL): number {
    return this.#threadAppenders.filter(appender => appender.threadType === threadType && appender.headerAppended())
        .length;
  }

  /**
   * Looks up a FlameChart group for a given appender.
   */
  groupForAppender(targetAppender: TrackAppender): PerfUI.FlameChart.Group|null {
    let foundGroup: PerfUI.FlameChart.Group|null = null;
    for (const [group, appender] of this.#trackForGroup) {
      if (appender === targetAppender) {
        foundGroup = group;
        break;
      }
    }
    return foundGroup;
  }

  /**
   * Given a FlameChart group, gets the events to be shown in the tree
   * views if that group was registered by the appender system.
   */
  groupEventsForTreeView(group: PerfUI.FlameChart.Group): TraceEngine.Types.TraceEvents.TraceEventData[]|null {
    const track = this.#trackForGroup.get(group);
    if (!track) {
      return null;
    }
    return this.eventsForTreeView(track);
  }

  /**
   * Caches the track appender that owns a level. An appender takes
   * ownership of a level when it appends data to it.
   * The cache is useful to determine what appender should handle a
   * query from the flame chart renderer when an event's feature (like
   * style, title, etc.) is needed.
   */
  registerTrackForLevel(level: number, appender: TrackAppender): void {
    // TODO(crbug.com/1442454) Figure out how to avoid the circular calls.
    this.#trackForLevel.set(level, appender);
  }

  /**
   * Adds an event to the flame chart data at a defined level.
   * @param event the event to be appended,
   * @param level the level to append the event,
   * @param appender the track which the event belongs to.
   * @returns the index of the event in all events to be rendered in the flamechart.
   */
  appendEventAtLevel(event: TraceEngine.Types.TraceEvents.TraceEventData, level: number, appender: TrackAppender):
      number {
    // TODO(crbug.com/1442454) Figure out how to avoid the circular calls.
    this.#trackForLevel.set(level, appender);
    const index = this.#entryData.length;
    this.#entryData.push(event);
    this.#legacyEntryTypeByLevel[level] = EntryType.TrackAppender;
    this.#flameChartData.entryLevels[index] = level;
    this.#flameChartData.entryStartTimes[index] = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const msDuration = event.dur ||
        TraceEngine.Helpers.Timing.millisecondsToMicroseconds(
            InstantEventVisibleDurationMs as TraceEngine.Types.Timing.MilliSeconds);
    this.#flameChartData.entryTotalTimes[index] = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(msDuration);
    return index;
  }

  /**
   * Adds into the flame chart data a list of trace events.
   * @param events the trace events that will be appended to the flame chart.
   * The events should be taken straight from the trace handlers. The handlers
   * should sort the events by start time, and the parent event is before the
   * child.
   * @param trackStartLevel the flame chart level from which the events will
   * be appended.
   * @param appender the track that the trace events belong to.
   * @param eventAppendedCallback an optional function called after the
   * event has been added to the timeline data. This allows the caller
   * to know f.e. the position of the event in the entry data. Use this
   * hook to customize the data after it has been appended, f.e. to add
   * decorations to a set of the entries.
   * @returns the next level after the last occupied by the appended these
   * trace events (the first available level to append next track).
   */
  appendEventsAtLevel<T extends TraceEngine.Types.TraceEvents.TraceEventData>(
      events: readonly T[], trackStartLevel: number, appender: TrackAppender,
      eventAppendedCallback?: (event: T, index: number) => void): number {
    const lastUsedTimeByLevel: number[] = [];
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      if (!this.entryIsVisibleInTimeline(event)) {
        continue;
      }

      const level = getEventLevel(event, lastUsedTimeByLevel);
      const index = this.appendEventAtLevel(event, trackStartLevel + level, appender);
      eventAppendedCallback?.(event, index);
    }

    this.#legacyEntryTypeByLevel.length = trackStartLevel + lastUsedTimeByLevel.length;
    this.#legacyEntryTypeByLevel.fill(EntryType.TrackAppender, trackStartLevel);
    return trackStartLevel + lastUsedTimeByLevel.length;
  }

  entryIsVisibleInTimeline(entry: TraceEngine.Types.TraceEvents.TraceEventData): boolean {
    if (this.#traceParsedData.Meta.traceIsGeneric) {
      return true;
    }

    if (TraceEngine.Types.TraceEvents.isTraceEventUpdateCounters(entry)) {
      // These events are not "visible" on the timeline because they are instant events with 0 duration.
      // However, the Memory view (CountersGraph in the codebase) relies on
      // finding the UpdateCounters events within the user's active trace
      // selection in order to show the memory usage for the selected time
      // period.
      // Therefore we mark them as visible so they are appended onto the Thread
      // track, and hence accessible by the CountersGraph view.
      return true;
    }

    // Default styles are globally defined for each event name. Some
    // events are hidden by default.
    const eventStyle = getEventStyle(entry.name as TraceEngine.Types.TraceEvents.KnownEventName);
    const eventIsTiming = TraceEngine.Types.TraceEvents.isTraceEventConsoleTime(entry) ||
        TraceEngine.Types.TraceEvents.isTraceEventPerformanceMeasure(entry) ||
        TraceEngine.Types.TraceEvents.isTraceEventPerformanceMark(entry);

    return (eventStyle && !eventStyle.hidden) || eventIsTiming;
  }

  /**
   * Gets the all track appenders that have been set to be visible.
   */
  allVisibleTrackAppenders(): TrackAppender[] {
    return this.#allTrackAppenders.filter(track => this.#visibleTrackNames.has(track.appenderName));
  }

  allThreadAppendersByProcess(): Map<TraceEngine.Types.TraceEvents.ProcessID, ThreadAppender[]> {
    const appenders = this.allVisibleTrackAppenders();
    const result = new Map<TraceEngine.Types.TraceEvents.ProcessID, ThreadAppender[]>();
    for (const appender of appenders) {
      if (!(appender instanceof ThreadAppender)) {
        continue;
      }
      const existing = result.get(appender.processId()) ?? [];
      existing.push(appender);
      result.set(appender.processId(), existing);
    }
    return result;
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

    // Add any warnings information to the tooltip. Done here to avoid duplicating this call in every appender.
    // By doing this here, we ensure that any warnings that are
    // added to the WarningsHandler are automatically used and added
    // to the tooltip.
    const warningElements: HTMLSpanElement[] =
        TimelineComponents.DetailsView.buildWarningElementsForEvent(event, this.#traceParsedData);

    const {title, formattedTime, warningElements: extraWarningElements} = track.highlightedEntryInfo(event);
    return {
      title,
      formattedTime,
      warningElements: warningElements.concat(extraWarningElements || []),
    };
  }
}
