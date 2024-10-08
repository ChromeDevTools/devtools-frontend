// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as Trace from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import {AnimationsTrackAppender} from './AnimationsTrackAppender.js';
import {getEventLevel, getFormattedTime, type LastTimestampByLevel} from './AppenderUtils.js';
import * as TimelineComponents from './components/components.js';
import {ExtensionDataGatherer} from './ExtensionDataGatherer.js';
import {ExtensionTrackAppender} from './ExtensionTrackAppender.js';
import {GPUTrackAppender} from './GPUTrackAppender.js';
import {InteractionsTrackAppender} from './InteractionsTrackAppender.js';
import {LayoutShiftsTrackAppender} from './LayoutShiftsTrackAppender.js';
import {ServerTimingsTrackAppender} from './ServerTimingsTrackAppender.js';
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
  additionalElement?: HTMLElement,
};

export function entryIsVisibleInTimeline(
    entry: Trace.Types.Events.Event, parsedTrace?: Trace.Handlers.Types.ParsedTrace): boolean {
  if (parsedTrace && parsedTrace.Meta.traceIsGeneric) {
    return true;
  }

  if (Trace.Types.Events.isUpdateCounters(entry)) {
    // These events are not "visible" on the timeline because they are instant events with 0 duration.
    // However, the Memory view (CountersGraph in the codebase) relies on
    // finding the UpdateCounters events within the user's active trace
    // selection in order to show the memory usage for the selected time
    // period.
    // Therefore we mark them as visible so they are appended onto the Thread
    // track, and hence accessible by the CountersGraph view.
    return true;
  }

  // Gate the visibility of post message events behind the experiement flag
  if (Trace.Types.Events.isSchedulePostMessage(entry) || Trace.Types.Events.isHandlePostMessage(entry)) {
    return Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_SHOW_POST_MESSAGE_EVENTS);
  }

  if (Trace.Types.Extensions.isSyntheticExtensionEntry(entry) || Trace.Types.Events.isSyntheticServerTiming(entry)) {
    return true;
  }

  // Default styles are globally defined for each event name. Some
  // events are hidden by default.
  const eventStyle = TimelineComponents.EntryStyles.getEventStyle(entry.name as Trace.Types.Events.Name);
  const eventIsTiming = Trace.Types.Events.isConsoleTime(entry) || Trace.Types.Events.isPerformanceMeasure(entry) ||
      Trace.Types.Events.isPerformanceMark(entry);

  return (eventStyle && !eventStyle.hidden) || eventIsTiming;
}

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
  colorForEvent(event: Trace.Types.Events.Event): string;
  /**
   * Returns the title an event is shown with in the timeline.
   */
  titleForEvent?(event: Trace.Types.Events.Event): string;
  /**
   * Returns the info shown when an event in the timeline is hovered.
   */
  highlightedEntryInfo?(event: Trace.Types.Events.Event): Partial<HighlightedEntryInfo>;
  /**
   * Returns the a callback function to draw an event to overrides the normal rectangle draw operation.
   */
  getDrawOverride?(event: Trace.Types.Events.Event): DrawOverride|undefined;
}

export const TrackNames = [
  'Animations',
  'Timings',
  'Interactions',
  'GPU',
  'LayoutShifts',
  'Thread',
  'Thread_AuctionWorklet',
  'Extension',
  'ServerTimings',
] as const;
// Network track will use TrackAppender interface, but it won't be shown in Main flamechart.
// So manually add it to TrackAppenderName.
export type TrackAppenderName = typeof TrackNames[number]|'Network';

export type DrawOverride = PerfUI.FlameChart.DrawOverride;

/**
 * Used as the context when a track (aka group) is selected and we log
 * something to the VE Logging framework.
 * This enum broadly corresponds with the list of TrackNames, but can be more
 * specific in some situations such as when we want to identify the thread type
 * rather than log "thread" - it is useful to know if the thread is the main
 * thread or not.
 * VE context needs to be kebab-case, and not contain any PII, which is why we
 * log this set list rather than full track names, which in the case of threads
 * can contain URLswhich we do not want to log.
 */
export const enum VisualLoggingTrackName {
  ANIMATIONS = 'animations',
  TIMINGS = 'timings',
  INTERACTIONS = 'interactions',
  GPU = 'gpu',
  LAYOUT_SHIFTS = 'layout-shifts',
  SERVER_TIMINGS = 'server.timings',
  THREAD_CPU_PROFILE = 'thread.cpu-profile',
  THREAD_MAIN = 'thread.main',
  THREAD_FRAME = 'thread.frame',
  THREAD_WORKER = 'thread.worker',
  THREAD_AUCTION_WORKLET = 'thread.auction-worklet',
  THREAD_RASTERIZER = 'thread.rasterizer',
  THREAD_POOL = 'thread.pool',
  THREAD_OTHER = 'thread.other',
  EXTENSION = 'extension',
  NETWORK = 'network',
}

export class CompatibilityTracksAppender {
  #trackForLevel = new Map<number, TrackAppender>();
  #trackForGroup = new Map<PerfUI.FlameChart.Group, TrackAppender>();
  #eventsForTrack = new Map<TrackAppender, Trace.Types.Events.Event[]>();
  #trackEventsForTreeview = new Map<TrackAppender, Trace.Types.Events.Event[]>();
  #flameChartData: PerfUI.FlameChart.FlameChartTimelineData;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace;
  #entryData: TimelineFlameChartEntry[];
  #colorGenerator: Common.Color.Generator;
  #allTrackAppenders: TrackAppender[] = [];
  #visibleTrackNames: Set<TrackAppenderName> = new Set([...TrackNames]);

  #legacyEntryTypeByLevel: EntryType[];
  #timingsTrackAppender: TimingsTrackAppender;
  #animationsTrackAppender: AnimationsTrackAppender;
  #interactionsTrackAppender: InteractionsTrackAppender;
  #gpuTrackAppender: GPUTrackAppender;
  #layoutShiftsTrackAppender: LayoutShiftsTrackAppender;
  #threadAppenders: ThreadAppender[] = [];
  #serverTimingsTrackAppender: ServerTimingsTrackAppender;

  /**
   * @param flameChartData the data used by the flame chart renderer on
   * which the track data will be appended.
   * @param parsedTrace the trace parsing engines output.
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
      flameChartData: PerfUI.FlameChart.FlameChartTimelineData, parsedTrace: Trace.Handlers.Types.ParsedTrace,
      entryData: TimelineFlameChartEntry[], legacyEntryTypeByLevel: EntryType[]) {
    this.#flameChartData = flameChartData;
    this.#parsedTrace = parsedTrace;
    this.#entryData = entryData;
    this.#colorGenerator = new Common.Color.Generator(
        /* hueSpace= */ {min: 30, max: 55, count: undefined},
        /* satSpace= */ {min: 70, max: 100, count: 6},
        /* lightnessSpace= */ 50,
        /* alphaSpace= */ 0.7);
    this.#legacyEntryTypeByLevel = legacyEntryTypeByLevel;
    this.#timingsTrackAppender = new TimingsTrackAppender(this, this.#parsedTrace, this.#colorGenerator);
    this.#allTrackAppenders.push(this.#timingsTrackAppender);

    this.#interactionsTrackAppender = new InteractionsTrackAppender(this, this.#parsedTrace, this.#colorGenerator);
    this.#allTrackAppenders.push(this.#interactionsTrackAppender);

    this.#animationsTrackAppender = new AnimationsTrackAppender(this, this.#parsedTrace);
    this.#allTrackAppenders.push(this.#animationsTrackAppender);

    this.#gpuTrackAppender = new GPUTrackAppender(this, this.#parsedTrace);
    this.#allTrackAppenders.push(this.#gpuTrackAppender);

    this.#layoutShiftsTrackAppender = new LayoutShiftsTrackAppender(this, this.#parsedTrace);
    this.#allTrackAppenders.push(this.#layoutShiftsTrackAppender);

    this.#serverTimingsTrackAppender = new ServerTimingsTrackAppender(this, this.#parsedTrace);
    this.#allTrackAppenders.push(this.#serverTimingsTrackAppender);
    this.#addThreadAppenders();
    this.#addExtensionAppenders();
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

  #addExtensionAppenders(): void {
    const tracks = ExtensionDataGatherer.instance().getExtensionData().extensionTrackData;
    for (const trackData of tracks) {
      this.#allTrackAppenders.push(new ExtensionTrackAppender(this, trackData));
    }
  }

  #addThreadAppenders(): void {
    const threadTrackOrder = (appender: ThreadAppender): number => {
      switch (appender.threadType) {
        case Trace.Handlers.Threads.ThreadType.MAIN_THREAD: {
          if (appender.isOnMainFrame) {
            // Ensure `about:blank` or `chrome://new-tab-page` are deprioritized, as they're likely not the profiling targets
            const url = appender.getUrl();
            if (url.startsWith('about:') || url.startsWith('chrome:')) {
              return 2;
            }
            return 0;
          }
          return 1;
        }
        case Trace.Handlers.Threads.ThreadType.WORKER:
          return 3;
        case Trace.Handlers.Threads.ThreadType.RASTERIZER:
          return 4;
        case Trace.Handlers.Threads.ThreadType.THREAD_POOL:
          return 5;
        case Trace.Handlers.Threads.ThreadType.AUCTION_WORKLET:
          return 6;
        case Trace.Handlers.Threads.ThreadType.OTHER:
          return 7;
        default:
          return 8;
      }
    };
    const threads = Trace.Handlers.Threads.threadsInTrace(this.#parsedTrace);
    const processedAuctionWorkletsIds = new Set<Trace.Types.Events.ProcessID>();
    const showAllEvents = Root.Runtime.experiments.isEnabled('timeline-show-all-events');

    for (const {pid, tid, name, type} of threads) {
      if (this.#parsedTrace.Meta.traceIsGeneric) {
        // If the trace is generic, we just push all of the threads with no
        // effort to differentiate them, hence overriding the thread type to be
        // OTHER for all threads.
        this.#threadAppenders.push(
            new ThreadAppender(this, this.#parsedTrace, pid, tid, name, Trace.Handlers.Threads.ThreadType.OTHER));
        continue;
      }
      // These threads have no useful information. Omit them
      if ((name === 'Chrome_ChildIOThread' || name === 'Compositor' || name === 'GpuMemoryThread') && !showAllEvents) {
        continue;
      }

      const maybeWorklet = this.#parsedTrace.AuctionWorklets.worklets.get(pid);
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
            this, this.#parsedTrace, pid, maybeWorklet.args.data.utilityThread.tid, 'auction-worket-utility',
            Trace.Handlers.Threads.ThreadType.AUCTION_WORKLET));
        this.#threadAppenders.push(new ThreadAppender(
            this, this.#parsedTrace, pid, maybeWorklet.args.data.v8HelperThread.tid, 'auction-worklet-v8helper',
            Trace.Handlers.Threads.ThreadType.AUCTION_WORKLET));
        continue;
      }

      this.#threadAppenders.push(new ThreadAppender(this, this.#parsedTrace, pid, tid, name, type));
    }
    // Sort first by track order, then break ties by placing busier tracks first.
    this.#threadAppenders.sort(
        (a, b) => (threadTrackOrder(a) - threadTrackOrder(b)) || (b.getEntries().length - a.getEntries().length));
    this.#allTrackAppenders.push(...this.#threadAppenders);
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

  serverTimingsTrackAppender(): ServerTimingsTrackAppender {
    return this.#serverTimingsTrackAppender;
  }

  eventsInTrack(trackAppender: TrackAppender): Trace.Types.Events.Event[] {
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
        events.push(this.#entryData[i] as Trace.Types.Events.Event);
      }
    }
    events.sort((a, b) => a.ts - b.ts);  // TODO(paulirish): Remove as I'm 90% it's already sorted.

    this.#eventsForTrack.set(trackAppender, events);
    return events;
  }

  /**
   * Gets the events to be shown in the tree views of the details pane
   * (Bottom-up, Call tree, etc.). These are the events from the track
   * that can be arranged in a tree shape.
   */
  eventsForTreeView(trackAppender: TrackAppender): Trace.Types.Events.Event[] {
    const cachedData = this.#trackEventsForTreeview.get(trackAppender);
    if (cachedData) {
      return cachedData;
    }

    let trackEvents = this.eventsInTrack(trackAppender);
    if (!Trace.Helpers.TreeHelpers.canBuildTreesFromEvents(trackEvents)) {
      // Some tracks can include both async and sync events. When this
      // happens, we use all events for the tree views if a trees can be
      // built from both sync and async events. If this is not possible,
      // async events are filtered out and only sync events are used
      // (it's assumed a tree can always be built using a tracks sync
      // events).
      trackEvents = trackEvents.filter(e => !Trace.Types.Events.isPhaseAsync(e.ph));
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
  getCurrentTrackCountForThreadType(threadType: Trace.Handlers.Threads.ThreadType.RASTERIZER|
                                    Trace.Handlers.Threads.ThreadType.THREAD_POOL): number {
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
  groupEventsForTreeView(group: PerfUI.FlameChart.Group): Trace.Types.Events.Event[]|null {
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

  groupForLevel(level: number): PerfUI.FlameChart.Group|null {
    const appenderForLevel = this.#trackForLevel.get(level);
    if (!appenderForLevel) {
      return null;
    }
    return this.groupForAppender(appenderForLevel);
  }

  /**
   * Adds an event to the flame chart data at a defined level.
   * @param event the event to be appended,
   * @param level the level to append the event,
   * @param appender the track which the event belongs to.
   * @returns the index of the event in all events to be rendered in the flamechart.
   */
  appendEventAtLevel(event: Trace.Types.Events.Event, level: number, appender: TrackAppender): number {
    // TODO(crbug.com/1442454) Figure out how to avoid the circular calls.
    this.#trackForLevel.set(level, appender);
    const index = this.#entryData.length;
    this.#entryData.push(event);
    this.#legacyEntryTypeByLevel[level] = EntryType.TRACK_APPENDER;
    this.#flameChartData.entryLevels[index] = level;
    this.#flameChartData.entryStartTimes[index] = Trace.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const dur = event.dur || Trace.Helpers.Timing.millisecondsToMicroseconds(InstantEventVisibleDurationMs);
    this.#flameChartData.entryTotalTimes[index] = Trace.Helpers.Timing.microSecondsToMilliseconds(dur);
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
  appendEventsAtLevel<T extends Trace.Types.Events.Event>(
      events: readonly T[], trackStartLevel: number, appender: TrackAppender,
      eventAppendedCallback?: (event: T, index: number) => void): number {
    const lastTimestampByLevel: LastTimestampByLevel = [];
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      if (!entryIsVisibleInTimeline(event, this.#parsedTrace)) {
        continue;
      }

      const level = getEventLevel(event, lastTimestampByLevel);
      const index = this.appendEventAtLevel(event, trackStartLevel + level, appender);
      eventAppendedCallback?.(event, index);
    }

    this.#legacyEntryTypeByLevel.length = trackStartLevel + lastTimestampByLevel.length;
    this.#legacyEntryTypeByLevel.fill(EntryType.TRACK_APPENDER, trackStartLevel);
    return trackStartLevel + lastTimestampByLevel.length;
  }

  /**
   * Gets the all track appenders that have been set to be visible.
   */
  allVisibleTrackAppenders(): TrackAppender[] {
    return this.#allTrackAppenders.filter(track => this.#visibleTrackNames.has(track.appenderName));
  }

  allThreadAppendersByProcess(): Map<Trace.Types.Events.ProcessID, ThreadAppender[]> {
    const appenders = this.allVisibleTrackAppenders();
    const result = new Map<Trace.Types.Events.ProcessID, ThreadAppender[]>();
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

  getDrawOverride(event: Trace.Types.Events.Event, level: number): DrawOverride|undefined {
    const track = this.#trackForLevel.get(level);
    if (!track) {
      throw new Error('Track not found for level');
    }
    return track.getDrawOverride?.(event);
  }

  /**
   * Returns the color an event is shown with in the timeline.
   */
  colorForEvent(event: Trace.Types.Events.Event, level: number): string {
    const track = this.#trackForLevel.get(level);
    if (!track) {
      throw new Error('Track not found for level');
    }
    return track.colorForEvent(event);
  }
  /**
   * Returns the title an event is shown with in the timeline.
   */
  titleForEvent(event: Trace.Types.Events.Event, level: number): string {
    const track = this.#trackForLevel.get(level);
    if (!track) {
      throw new Error('Track not found for level');
    }

    // Historically all tracks would have a titleForEvent() method.
    // However, we are working on migrating all event title logic into one place (components/EntryName)
    // TODO(crbug.com/365047728):
    // Once this migration is complete, no tracks will have a custom
    // titleForEvent method and we can remove titleForEvent entirely.
    if (track.titleForEvent) {
      return track.titleForEvent(event);
    }
    return TimelineComponents.EntryName.nameForEntry(event, this.#parsedTrace);
  }
  /**
   * Returns the info shown when an event in the timeline is hovered.
   */
  highlightedEntryInfo(event: Trace.Types.Events.Event, level: number): HighlightedEntryInfo {
    const track = this.#trackForLevel.get(level);
    if (!track) {
      throw new Error('Track not found for level');
    }

    // Add any warnings information to the tooltip. Done here to avoid duplicating this call in every appender.
    // By doing this here, we ensure that any warnings that are
    // added to the WarningsHandler are automatically used and added
    // to the tooltip.
    const warningElements: HTMLSpanElement[] =
        TimelineComponents.DetailsView.buildWarningElementsForEvent(event, this.#parsedTrace);

    let title = this.titleForEvent(event, level);
    let formattedTime = getFormattedTime(event.dur);
    let additionalElement;

    // If the track defines a custom highlight, call it and use its values.
    if (track.highlightedEntryInfo) {
      const {
        title: customTitle,
        formattedTime: customFormattedTime,
        warningElements: extraWarningElements,
        additionalElement: element,
      } = track.highlightedEntryInfo(event);
      if (customTitle) {
        title = customTitle;
      }
      if (customFormattedTime) {
        formattedTime = customFormattedTime;
      }
      if (extraWarningElements) {
        warningElements.push(...extraWarningElements);
      }
      additionalElement = element;
    }
    return {
      title,
      formattedTime,
      warningElements,
      additionalElement,
    };
  }
}
