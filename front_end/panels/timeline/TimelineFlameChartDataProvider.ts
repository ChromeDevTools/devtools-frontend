/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import type * as TraceEngine from '../../models/trace/trace.js';
import {CompatibilityTracksAppender} from './CompatibilityTracksAppender.js';

import timelineFlamechartPopoverStyles from './timelineFlamechartPopover.css.js';

import {type PerformanceModel} from './PerformanceModel.js';
import {FlameChartStyle, Selection, TimelineFlameChartMarker} from './TimelineFlameChartView.js';
import {TimelineSelection} from './TimelinePanel.js';

import {TimelineUIUtils, type TimelineCategory} from './TimelineUIUtils.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  onIgnoreList: 'On ignore list',
  /**
   *@description Text that refers to the animation of the web page
   */
  animation: 'Animation',
  /**
   *@description Text that refers to the interactions on the page shown in the timeline
   */
  userInteractions: 'Interactions',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  timings: 'Timings',
  /**
   *@description Title of the Console tool
   */
  console: 'Console',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   *@example {example.com} PH1
   */
  mainS: 'Main — {PH1}',
  /**
   *@description Text that refers to the main target
   */
  main: 'Main',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   *@example {https://example.com} PH1
   */
  frameS: 'Frame — {PH1}',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  subframe: 'Subframe',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  raster: 'Raster',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   *@example {2} PH1
   */
  rasterizerThreadS: 'Rasterizer Thread {PH1}',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  gpu: 'GPU',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  thread: 'Thread',
  /**
   *@description Text in Timeline for the Experience title
   */
  experience: 'Experience',
  /**
   *@description Text for rendering frames
   */
  frames: 'Frames',
  /**
   * @description Text in the Performance panel to show how long was spent in a particular part of the code.
   * The first placeholder is the total time taken for this node and all children, the second is the self time
   * (time taken in this node, without children included).
   *@example {10ms} PH1
   *@example {10ms} PH2
   */
  sSelfS: '{PH1} (self {PH2})',
  /**
   *@description Tooltip text for the number of CLS occurences in Timeline
   *@example {4} PH1
   */
  occurrencesS: 'Occurrences: {PH1}',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  idleFrame: 'Idle Frame',
  /**
   *@description Text in Timeline Frame Chart Data Provider of the Performance panel
   */
  droppedFrame: 'Dropped Frame',
  /**
   *@description Text in Timeline Frame Chart Data Provider of the Performance panel
   */
  partiallyPresentedFrame: 'Partially Presented Frame',
  /**
   *@description Text for a rendering frame
   */
  frame: 'Frame',
  /**
   *@description Warning text content in Timeline Flame Chart Data Provider of the Performance panel
   */
  longFrame: 'Long frame',
  /**
   * @description Text for the name of a thread of the page. Used when there are multiple threads but
   * a more specific name for this thread is not available. The placeholder is a number that uniquely
   * identifies this thread.
   * @example {1} PH1
   */
  threadS: 'Thread {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineFlameChartDataProvider.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const FONT = '11px ' + Host.Platform.fontFamily();

// At the moment there are two types defined for trace events: TraceEventData and
// SDK.TracingModel.Event. This is only for compatibility between the legacy system
// and the new system proposed in go/rpp-flamechart-arch. In the future, once all
// tracks have been migrated to the new system, all entries will be of the
// TraceEventData type.
export type TimelineFlameChartEntry =
    (SDK.FilmStripModel.Frame|SDK.TracingModel.Event|TimelineModel.TimelineFrameModel.TimelineFrame|
     TraceEngine.Types.TraceEvents.TraceEventData);
export class TimelineFlameChartDataProvider extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    PerfUI.FlameChart.FlameChartDataProvider {
  private droppedFramePatternCanvas: HTMLCanvasElement;
  private partialFramePatternCanvas: HTMLCanvasElement;
  private timelineDataInternal: PerfUI.FlameChart.TimelineData|null;
  private currentLevel: number;

  // The Performance and the Timeline models are expected to be
  // deprecrated in favor of using traceEngineData (new RPP engine) only
  // as part of the work in crbug.com/1386091. For this reason they
  // have the "legacy" prefix on their name.
  private legacyPerformanceModel: PerformanceModel|null;
  private compatibilityTracksAppender: CompatibilityTracksAppender|null;
  private legacyTimelineModel: TimelineModel.TimelineModel.TimelineModelImpl|null;
  private traceEngineData: TraceEngine.Handlers.Types.TraceParseData|null;

  private minimumBoundaryInternal: number;
  private readonly maximumBoundary: number;
  private timeSpan: number;
  private readonly consoleColorGenerator: Common.Color.Generator;
  private readonly extensionColorGenerator: Common.Color.Generator;
  private readonly headerLevel1: PerfUI.FlameChart.GroupStyle;
  private readonly headerLevel2: PerfUI.FlameChart.GroupStyle;
  private readonly staticHeader: PerfUI.FlameChart.GroupStyle;
  private framesHeader: PerfUI.FlameChart.GroupStyle;
  private readonly collapsibleTimingsHeader: PerfUI.FlameChart.GroupStyle;
  private readonly timingsHeader: PerfUI.FlameChart.GroupStyle;
  private readonly screenshotsHeader: PerfUI.FlameChart.GroupStyle;
  private readonly animationsHeader: PerfUI.FlameChart.GroupStyle;
  private readonly userInteractionsHeader: PerfUI.FlameChart.GroupStyle;
  private readonly experienceHeader: PerfUI.FlameChart.GroupStyle;
  private readonly flowEventIndexById: Map<string, number>;
  private entryData!: TimelineFlameChartEntry[];
  private entryTypeByLevel!: EntryType[];
  private markers!: TimelineFlameChartMarker[];
  private screenshotImageCache!: Map<SDK.FilmStripModel.Frame, HTMLImageElement|null>;
  private extensionInfo!: {
    title: string,
    model: SDK.TracingModel.TracingModel,
  }[];
  private entryIndexToTitle!: string[];
  private asyncColorByCategory!: Map<TimelineCategory, string>;
  private lastInitiatorEntry!: number;
  private entryParent!: SDK.TracingModel.Event[];
  private frameGroup?: PerfUI.FlameChart.Group;
  private lastSelection?: Selection;
  private colorForEvent?: ((arg0: SDK.TracingModel.Event) => string);

  constructor() {
    super();
    this.reset();
    this.droppedFramePatternCanvas = document.createElement('canvas');
    this.partialFramePatternCanvas = document.createElement('canvas');
    this.preparePatternCanvas();
    this.timelineDataInternal = null;
    this.currentLevel = 0;
    this.legacyPerformanceModel = null;
    this.legacyTimelineModel = null;
    this.compatibilityTracksAppender = null;
    this.traceEngineData = null;
    this.minimumBoundaryInternal = 0;
    this.maximumBoundary = 0;
    this.timeSpan = 0;

    this.consoleColorGenerator = new Common.Color.Generator(
        {
          min: 30,
          max: 55,
          count: undefined,
        },
        {min: 70, max: 100, count: 6}, 50, 0.7);
    this.extensionColorGenerator = new Common.Color.Generator(
        {
          min: 210,
          max: 300,
          count: undefined,
        },
        {min: 70, max: 100, count: 6}, 70, 0.7);

    this.headerLevel1 = this.buildGroupStyle({shareHeaderLine: false});
    this.headerLevel2 = this.buildGroupStyle({padding: 2, nestingLevel: 1, collapsible: false});
    this.staticHeader = this.buildGroupStyle({collapsible: false});
    this.framesHeader = this.buildGroupStyle({useFirstLineForOverview: true});
    this.collapsibleTimingsHeader =
        this.buildGroupStyle({shareHeaderLine: true, useFirstLineForOverview: true, collapsible: true});
    this.timingsHeader =
        this.buildGroupStyle({shareHeaderLine: true, useFirstLineForOverview: true, collapsible: false});
    this.screenshotsHeader =
        this.buildGroupStyle({useFirstLineForOverview: true, nestingLevel: 1, collapsible: false, itemsHeight: 150});
    this.animationsHeader = this.buildGroupStyle({useFirstLineForOverview: false});
    this.userInteractionsHeader =
        this.buildGroupStyle({shareHeaderLine: false, useFirstLineForOverview: true, collapsible: false});
    this.experienceHeader = this.buildGroupStyle({collapsible: false});

    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
      const headers = [
        this.headerLevel1,
        this.headerLevel2,
        this.staticHeader,
        this.framesHeader,
        this.collapsibleTimingsHeader,
        this.timingsHeader,
        this.screenshotsHeader,
        this.animationsHeader,
        this.userInteractionsHeader,
        this.experienceHeader,
      ];
      for (const header of headers) {
        header.color = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary');
        header.backgroundColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background');
      }
    });

    this.flowEventIndexById = new Map();
  }

  private buildGroupStyle(extra: Object): PerfUI.FlameChart.GroupStyle {
    const defaultGroupStyle = {
      padding: 4,
      height: 17,
      collapsible: true,
      color: ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary'),
      backgroundColor: ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background'),
      font: FONT,
      nestingLevel: 0,
      shareHeaderLine: true,
    };
    return Object.assign(defaultGroupStyle, extra);
  }

  setModel(performanceModel: PerformanceModel|null, newTraceEngineData: TraceEngine.Handlers.Types.TraceParseData|null):
      void {
    this.reset();
    this.legacyPerformanceModel = performanceModel;
    this.legacyTimelineModel = performanceModel && performanceModel.timelineModel();
    this.traceEngineData = newTraceEngineData;
  }

  groupTrack(group: PerfUI.FlameChart.Group): TimelineModel.TimelineModel.Track|null {
    return group.track || null;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navStartTimes(): Map<any, any> {
    if (!this.legacyTimelineModel) {
      return new Map();
    }

    return this.legacyTimelineModel.navStartTimes();
  }

  entryTitle(entryIndex: number): string|null {
    const entryTypes = EntryType;
    const entryType = this.entryType(entryIndex);
    if (entryType === entryTypes.Event) {
      const event = (this.entryData[entryIndex] as SDK.TracingModel.Event);
      if (event.phase === SDK.TracingModel.Phase.AsyncStepInto ||
          event.phase === SDK.TracingModel.Phase.AsyncStepPast) {
        return event.name + ':' + event.args['step'];
      }
      if (eventToDisallowRoot.get(event)) {
        return i18nString(UIStrings.onIgnoreList);
      }
      if (this.legacyPerformanceModel && this.legacyPerformanceModel.timelineModel().isMarkerEvent(event)) {
        return TimelineUIUtils.markerShortTitle(event);
      }
      return TimelineUIUtils.eventTitle(event);
    }
    if (entryType === entryTypes.ExtensionEvent) {
      const event = (this.entryData[entryIndex] as SDK.TracingModel.Event);
      return event.name;
    }
    if (entryType === entryTypes.Screenshot) {
      return '';
    }
    if (entryType === entryTypes.TrackAppender) {
      const timelineData = (this.timelineDataInternal as PerfUI.FlameChart.TimelineData);
      const eventLevel = timelineData.entryLevels[entryIndex];
      const event = (this.entryData[entryIndex] as TraceEngine.Types.TraceEvents.TraceEventData);
      return this.compatibilityTracksAppender?.titleForEvent(event, eventLevel) || null;
    }
    let title: Common.UIString.LocalizedString|string = this.entryIndexToTitle[entryIndex];
    if (!title) {
      title = `Unexpected entryIndex ${entryIndex}`;
      console.error(title);
    }
    return title;
  }

  textColor(index: number): string {
    const event = this.entryData[index];
    return event && eventToDisallowRoot.get((event as SDK.TracingModel.Event)) ? '#888' : FlameChartStyle.textColor;
  }

  entryFont(_index: number): string|null {
    return FONT;
  }

  reset(): void {
    this.currentLevel = 0;
    this.timelineDataInternal = null;
    this.entryData = [];
    this.entryParent = [];
    this.entryTypeByLevel = [];
    this.entryIndexToTitle = [];
    this.markers = [];
    this.asyncColorByCategory = new Map();
    this.extensionInfo = [];
    this.screenshotImageCache = new Map();
  }

  maxStackDepth(): number {
    return this.currentLevel;
  }

  timelineData(): PerfUI.FlameChart.TimelineData {
    if (this.timelineDataInternal) {
      return this.timelineDataInternal;
    }

    this.timelineDataInternal = new PerfUI.FlameChart.TimelineData([], [], [], []);
    if (!this.legacyTimelineModel) {
      return this.timelineDataInternal;
    }

    this.flowEventIndexById.clear();
    this.minimumBoundaryInternal = this.legacyTimelineModel.minimumRecordTime();
    this.timeSpan = this.legacyTimelineModel.isEmpty() ?
        1000 :
        this.legacyTimelineModel.maximumRecordTime() - this.minimumBoundaryInternal;
    this.currentLevel = 0;

    if (this.traceEngineData && this.timelineDataInternal) {
      this.compatibilityTracksAppender = new CompatibilityTracksAppender(this.legacyTimelineModel);
    }
    if (this.legacyTimelineModel.isGenericTrace()) {
      this.processGenericTrace();
    } else {
      this.processInspectorTrace();
    }

    return this.timelineDataInternal;
  }

  private processGenericTrace(): void {
    const processGroupStyle = this.buildGroupStyle({shareHeaderLine: false});
    const threadGroupStyle = this.buildGroupStyle({padding: 2, nestingLevel: 1, shareHeaderLine: false});
    const eventEntryType = EntryType.Event;
    const tracksByProcess =
        new Platform.MapUtilities.Multimap<SDK.TracingModel.Process, TimelineModel.TimelineModel.Track>();
    if (!this.legacyTimelineModel) {
      return;
    }
    for (const track of this.legacyTimelineModel.tracks()) {
      if (track.thread !== null) {
        tracksByProcess.set(track.thread.process(), track);
      } else {
        // The Timings track can reach this point, so we should probably do something more useful.
        console.error('Failed to process track');
      }
    }
    for (const process of tracksByProcess.keysArray()) {
      if (tracksByProcess.size > 1) {
        const name = `${process.name()} ${process.id()}`;
        this.appendHeader(name, processGroupStyle, false /* selectable */);
      }
      for (const track of tracksByProcess.get(process)) {
        const group = this.appendSyncEvents(
            track, track.events, track.name, threadGroupStyle, eventEntryType, true /* selectable */);
        if (this.timelineDataInternal &&
            (!this.timelineDataInternal.selectedGroup ||
             track.name === TimelineModel.TimelineModel.TimelineModelImpl.BrowserMainThreadName)) {
          this.timelineDataInternal.selectedGroup = group;
        }
      }
    }
  }

  private processInspectorTrace(): void {
    this.appendFrames();

    const weight = (track: {type?: string, forMainFrame?: boolean, weight?: number}): number => {
      if (track.weight !== undefined) {
        return track.weight;
      }
      switch (track.type) {
        case TimelineModel.TimelineModel.TrackType.Animation:
          return 0;
        case TimelineModel.TimelineModel.TrackType.Timings:
          return 1;
        case TimelineModel.TimelineModel.TrackType.UserInteractions:
          return 2;
        case TimelineModel.TimelineModel.TrackType.Console:
          return 3;
        case TimelineModel.TimelineModel.TrackType.Experience:
          return 4;
        case TimelineModel.TimelineModel.TrackType.MainThread:
          return track.forMainFrame ? 5 : 6;
        case TimelineModel.TimelineModel.TrackType.Worker:
          return 7;
        case TimelineModel.TimelineModel.TrackType.Raster:
          return 8;
        case TimelineModel.TimelineModel.TrackType.GPU:
          return 9;
        case TimelineModel.TimelineModel.TrackType.Other:
          return 10;
        default:
          return -1;
      }
    };

    if (!this.legacyTimelineModel) {
      return;
    }
    const trackAppenders = this.compatibilityTracksAppender ? this.compatibilityTracksAppender.allTrackAppenders() : [];
    // Due to tracks having a predefined order, we cannot render legacy
    // and new tracks separately.
    const tracksAndAppenders = [...this.legacyTimelineModel.tracks(), ...trackAppenders].slice();
    tracksAndAppenders.sort((a, b) => weight(a) - weight(b));
    const rasterCount = 0;

    // TODO(crbug.com/1386091) Remove interim state to use only new track
    // appenders.
    for (const trackOrAppender of tracksAndAppenders) {
      if ('type' in trackOrAppender) {
        // Legacy track
        this.appendLegacyTrackData(trackOrAppender, rasterCount);
        continue;
      }
      // Track rendered with new engine data.
      if (!this.traceEngineData) {
        continue;
      }
      this.currentLevel =
          trackOrAppender.appendTrackAtLevel(this.currentLevel, this.timelineData(), this.traceEngineData);
    }
    if (this.timelineDataInternal && this.timelineDataInternal.selectedGroup) {
      this.timelineDataInternal.selectedGroup.expanded = true;
    }

    for (let extensionIndex = 0; extensionIndex < this.extensionInfo.length; extensionIndex++) {
      this.innerAppendExtensionEvents(extensionIndex);
    }

    this.flowEventIndexById.clear();

    this.markers.sort((a, b) => a.startTime() - b.startTime());
    if (this.timelineDataInternal) {
      this.timelineDataInternal.markers = this.markers;
    }
  }

  private appendLegacyTrackData(track: TimelineModel.TimelineModel.Track, rasterCount: number): void {
    const eventEntryType = EntryType.Event;
    switch (track.type) {
      case TimelineModel.TimelineModel.TrackType.UserInteractions: {
        this.appendAsyncEventsGroup(
            track, i18nString(UIStrings.userInteractions), track.asyncEvents, this.userInteractionsHeader,
            eventEntryType, false);
        break;
      }
      case TimelineModel.TimelineModel.TrackType.Animation: {
        this.appendAsyncEventsGroup(
            track, i18nString(UIStrings.animation), track.asyncEvents, this.animationsHeader, eventEntryType,
            false /* selectable */);
        break;
      }

      case TimelineModel.TimelineModel.TrackType.Timings: {
        const style = track.asyncEvents.length > 0 ? this.collapsibleTimingsHeader : this.timingsHeader;
        const group = this.appendHeader(i18nString(UIStrings.timings), style, true /* selectable */);
        group.track = track;
        this.appendPageMetrics();
        this.copyPerfMarkEvents(track);
        this.appendSyncEvents(track, track.events, null, null, eventEntryType, true /* selectable */);
        this.appendAsyncEventsGroup(track, null, track.asyncEvents, null, eventEntryType, true /* selectable */);
        break;
      }

      case TimelineModel.TimelineModel.TrackType.Console: {
        this.appendAsyncEventsGroup(
            track, i18nString(UIStrings.console), track.asyncEvents, this.headerLevel1, eventEntryType,
            true /* selectable */);
        break;
      }

      case TimelineModel.TimelineModel.TrackType.MainThread: {
        if (track.forMainFrame) {
          const group = this.appendSyncEvents(
              track, track.events,
              track.url ? i18nString(UIStrings.mainS, {PH1: track.url}) : i18nString(UIStrings.main), this.headerLevel1,
              eventEntryType, true /* selectable */);
          if (group && this.timelineDataInternal) {
            this.timelineDataInternal.selectedGroup = group;
          }
        } else {
          this.appendSyncEvents(
              track, track.events,
              track.url ? i18nString(UIStrings.frameS, {PH1: track.url}) : i18nString(UIStrings.subframe),
              this.headerLevel1, eventEntryType, true /* selectable */);
        }
        break;
      }

      case TimelineModel.TimelineModel.TrackType.Worker: {
        this.appendSyncEvents(
            track, track.events, track.name, this.headerLevel1, eventEntryType, true /* selectable */);
        break;
      }

      case TimelineModel.TimelineModel.TrackType.Raster: {
        if (!rasterCount) {
          this.appendHeader(i18nString(UIStrings.raster), this.headerLevel1, false /* selectable */);
        }
        ++rasterCount;
        this.appendSyncEvents(
            track, track.events, i18nString(UIStrings.rasterizerThreadS, {PH1: rasterCount}), this.headerLevel2,
            eventEntryType, true /* selectable */);
        break;
      }

      case TimelineModel.TimelineModel.TrackType.GPU: {
        this.appendSyncEvents(
            track, track.events, i18nString(UIStrings.gpu), this.headerLevel1, eventEntryType, true /* selectable */);
        break;
      }

      case TimelineModel.TimelineModel.TrackType.Other: {
        this.appendSyncEvents(
            track, track.events, track.name || i18nString(UIStrings.thread), this.headerLevel1, eventEntryType,
            true /* selectable */);
        this.appendAsyncEventsGroup(
            track, track.name, track.asyncEvents, this.headerLevel1, eventEntryType, true /* selectable */);
        break;
      }

      case TimelineModel.TimelineModel.TrackType.Experience: {
        this.appendSyncEvents(
            track, track.events, i18nString(UIStrings.experience), this.experienceHeader, eventEntryType,
            true /* selectable */);
        break;
      }
    }
  }
  minimumBoundary(): number {
    return this.minimumBoundaryInternal;
  }

  totalTime(): number {
    return this.timeSpan;
  }

  /**
   * Narrows an entry of type TimelineFlameChartEntry to the 2 types of
   * simple trace events (legacy and new engine definitions).
   */
  isEntryRegularEvent(entry: TimelineFlameChartEntry): entry is(TraceEngine.Types.TraceEvents.TraceEventData|
                                                                SDK.TracingModel.Event) {
    return 'name' in entry;
  }

  search(startTime: number, endTime: number, filter: TimelineModel.TimelineModelFilter.TimelineModelFilter): number[] {
    const result = [];
    this.timelineData();
    for (let i = 0; i < this.entryData.length; ++i) {
      const entry = this.entryData[i];
      if (!this.isEntryRegularEvent(entry)) {
        continue;
      }
      let event: SDK.TracingModel.Event|null;
      // The search features are implemented for SDK Event types only. Until we haven't fully
      // transitioned to use the types of the new engine, we need to use legacy representation
      // for events coming from the new engine.
      if (entry instanceof SDK.TracingModel.Event) {
        event = entry;
      } else {
        if (!this.compatibilityTracksAppender) {
          // This should not happen.
          console.error('compatibilityTracksAppender was unexpectedly not set.');
          continue;
        }
        event = this.compatibilityTracksAppender.getLegacyEvent(entry);
      }

      if (!event) {
        continue;
      }

      if (event.startTime > endTime) {
        continue;
      }
      if ((event.endTime || event.startTime) < startTime) {
        continue;
      }
      if (filter.accept(event)) {
        result.push(i);
      }
    }
    result.sort(
        (a, b) => SDK.TracingModel.Event.compareStartTime(
            (this.entryData[a] as SDK.TracingModel.Event), (this.entryData[b] as SDK.TracingModel.Event)));
    return result;
  }

  private appendSyncEvents(
      track: TimelineModel.TimelineModel.Track|null, events: SDK.TracingModel.Event[], title: string|null,
      style: PerfUI.FlameChart.GroupStyle|null, entryType: EntryType, selectable: boolean): PerfUI.FlameChart.Group
      |null {
    if (!events.length) {
      return null;
    }
    if (!this.legacyPerformanceModel || !this.legacyTimelineModel) {
      return null;
    }
    const isExtension = entryType === EntryType.ExtensionEvent;
    const openEvents = [];
    const ignoreListingEnabled = !isExtension && Root.Runtime.experiments.isEnabled('ignoreListJSFramesOnTimeline');
    let maxStackDepth = 0;
    let group: PerfUI.FlameChart.Group|null = null;
    if (track && track.type === TimelineModel.TimelineModel.TrackType.MainThread) {
      group = this.appendHeader((title as string), (style as PerfUI.FlameChart.GroupStyle), selectable);
      group.track = track;
    }
    for (let i = 0; i < events.length; ++i) {
      const e = events[i];
      // TODO(crbug.com/1386091) this check should happen at the model level.
      // Skip Layout Shifts and TTI events when dealing with the main thread.
      if (this.legacyPerformanceModel) {
        const isInteractiveTime = this.legacyPerformanceModel.timelineModel().isInteractiveTimeEvent(e);
        const isLayoutShift = this.legacyPerformanceModel.timelineModel().isLayoutShiftEvent(e);
        const skippableEvent = isInteractiveTime || isLayoutShift;

        if (track && track.type === TimelineModel.TimelineModel.TrackType.MainThread && skippableEvent) {
          continue;
        }
      }

      if (this.legacyPerformanceModel && this.legacyPerformanceModel.timelineModel().isLayoutShiftEvent(e)) {
        // TODO(crbug.com/1386091) this check should happen at the model level.
        // Expand layout shift events to the size of the frame in which it is situated.
        for (const frame of this.legacyPerformanceModel.frames()) {
          // Locate the correct frame and expand the event accordingly.
          if (typeof e.endTime === 'undefined') {
            e.setEndTime(e.startTime);
          }

          const isAfterStartTime = e.startTime >= frame.startTime;
          const isBeforeEndTime = e.endTime && e.endTime <= frame.endTime;
          const eventIsInFrame = isAfterStartTime && isBeforeEndTime;

          if (!eventIsInFrame) {
            continue;
          }

          e.startTime = frame.startTime;
          e.setEndTime(frame.endTime);
        }
      }

      if (!isExtension && this.legacyPerformanceModel.timelineModel().isMarkerEvent(e)) {
        this.markers.push(new TimelineFlameChartMarker(
            e.startTime, e.startTime - this.legacyTimelineModel.minimumRecordTime(),
            TimelineUIUtils.markerStyleForEvent(e)));
      }
      if (!SDK.TracingModel.TracingModel.isFlowPhase(e.phase)) {
        if (!e.endTime && e.phase !== SDK.TracingModel.Phase.Instant) {
          continue;
        }
        if (SDK.TracingModel.TracingModel.isAsyncPhase(e.phase)) {
          continue;
        }
        if (!isExtension && !this.legacyPerformanceModel.isVisible(e)) {
          continue;
        }
      }
      // Handle events belonging to a stack. E.g. A call stack in the main thread flame chart.
      while (openEvents.length &&
             // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
             // @ts-expect-error
             ((openEvents[openEvents.length - 1] as SDK.TracingModel.Event).endTime) <= e.startTime) {
        openEvents.pop();
      }
      eventToDisallowRoot.set(e, false);
      if (ignoreListingEnabled && this.isIgnoreListedEvent(e)) {
        const parent = openEvents[openEvents.length - 1];
        if (parent && eventToDisallowRoot.get(parent)) {
          continue;
        }
        eventToDisallowRoot.set(e, true);
      }
      if (!group && title) {
        group = this.appendHeader(title, (style as PerfUI.FlameChart.GroupStyle), selectable);
        if (selectable) {
          group.track = track;
        }
      }

      const level = this.currentLevel + openEvents.length;
      const index = this.appendEvent(e, level);
      if (openEvents.length) {
        this.entryParent[index] = (openEvents[openEvents.length - 1] as SDK.TracingModel.Event);
      }
      if (!isExtension && this.legacyPerformanceModel.timelineModel().isMarkerEvent(e)) {
        // @ts-ignore This is invalid code, but we should keep it for now
        this.timelineDataInternal.entryTotalTimes[this.entryData.length] = undefined;
      }

      maxStackDepth = Math.max(maxStackDepth, openEvents.length + 1);
      if (e.endTime) {
        openEvents.push(e);
      }
    }
    this.entryTypeByLevel.length = this.currentLevel + maxStackDepth;
    this.entryTypeByLevel.fill(entryType, this.currentLevel);
    this.currentLevel += maxStackDepth;
    return group;
  }

  private isIgnoreListedEvent(event: SDK.TracingModel.Event): boolean {
    if (!TimelineModel.TimelineModel.TimelineModelImpl.isJsFrameEvent(event)) {
      return false;
    }
    const url = event.args['data']['url'] as Platform.DevToolsPath.UrlString;
    return url && this.isIgnoreListedURL(url);
  }

  private isIgnoreListedURL(url: Platform.DevToolsPath.UrlString): boolean {
    return Bindings.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(url);
  }

  private appendAsyncEventsGroup(
      track: TimelineModel.TimelineModel.Track|null, title: string|null, events: SDK.TracingModel.AsyncEvent[],
      style: PerfUI.FlameChart.GroupStyle|null, entryType: EntryType, selectable: boolean): PerfUI.FlameChart.Group
      |null {
    if (!events.length) {
      return null;
    }
    const lastUsedTimeByLevel: number[] = [];
    let group: PerfUI.FlameChart.Group|null = null;
    for (let i = 0; i < events.length; ++i) {
      const asyncEvent = events[i];
      if (!this.legacyPerformanceModel || !this.legacyPerformanceModel.isVisible(asyncEvent)) {
        continue;
      }
      if (!group && title) {
        group = this.appendHeader(title, (style as PerfUI.FlameChart.GroupStyle), selectable);
        if (selectable) {
          group.track = track;
        }
      }
      const startTime = asyncEvent.startTime;
      let level;
      for (level = 0; level < lastUsedTimeByLevel.length && lastUsedTimeByLevel[level] > startTime; ++level) {
      }
      this.appendAsyncEvent(asyncEvent, this.currentLevel + level);
      lastUsedTimeByLevel[level] = (asyncEvent.endTime as number);
    }
    this.entryTypeByLevel.length = this.currentLevel + lastUsedTimeByLevel.length;
    this.entryTypeByLevel.fill(entryType, this.currentLevel);
    this.currentLevel += lastUsedTimeByLevel.length;
    return group;
  }

  private appendPageMetrics(): void {
    this.entryTypeByLevel[this.currentLevel] = EntryType.Event;

    if (!this.legacyPerformanceModel || !this.legacyTimelineModel) {
      return;
    }

    const metricEvents: SDK.TracingModel.Event[] = [];
    const lcpEvents = [];
    const timelineModel = this.legacyPerformanceModel.timelineModel();
    for (const track of this.legacyTimelineModel.tracks()) {
      for (const event of track.events) {
        if (!timelineModel.isMarkerEvent(event)) {
          continue;
        }
        if (timelineModel.isLCPCandidateEvent(event) || timelineModel.isLCPInvalidateEvent(event)) {
          lcpEvents.push(event);
        } else {
          metricEvents.push(event);
        }
      }
    }

    // Only the LCP event with the largest candidate index is relevant.
    // Do not record an LCP event if it is an invalidate event.
    if (lcpEvents.length > 0) {
      const lcpEventsByNavigationId = new Map<string, SDK.TracingModel.Event>();
      for (const e of lcpEvents) {
        const key = e.args['data']['navigationId'];
        const previousLastEvent = lcpEventsByNavigationId.get(key);

        if (!previousLastEvent || previousLastEvent.args['data']['candidateIndex'] < e.args['data']['candidateIndex']) {
          lcpEventsByNavigationId.set(key, e);
        }
      }

      const latestCandidates = Array.from(lcpEventsByNavigationId.values());
      const latestEvents = latestCandidates.filter(e => timelineModel.isLCPCandidateEvent(e));

      metricEvents.push(...latestEvents);
    }

    metricEvents.sort(SDK.TracingModel.Event.compareStartTime);
    if (this.timelineDataInternal) {
      const totalTimes = this.timelineDataInternal.entryTotalTimes;
      for (const event of metricEvents) {
        this.appendEvent(event, this.currentLevel);
        totalTimes[totalTimes.length - 1] = Number.NaN;
      }
    }

    ++this.currentLevel;
  }

  /**
   * This function pushes a copy of each performance.mark() event from the Main track
   * into Timings so they can be appended to the performance UI.
   * Performance.mark() are a part of the "blink.user_timing" category alongside
   * Navigation and Resource Timing events, so we must filter them out before pushing.
   */
  private copyPerfMarkEvents(timingTrack: TimelineModel.TimelineModel.Track|null): void {
    this.entryTypeByLevel[this.currentLevel] = EntryType.Event;
    if (!this.legacyPerformanceModel || !this.legacyTimelineModel || !timingTrack) {
      return;
    }
    const timelineModel = this.legacyPerformanceModel.timelineModel();
    const ResourceTimingNames = [
      'workerStart',
      'redirectStart',
      'redirectEnd',
      'fetchStart',
      'domainLookupStart',
      'domainLookupEnd',
      'connectStart',
      'connectEnd',
      'secureConnectionStart',
      'requestStart',
      'responseStart',
      'responseEnd',
    ];
    const NavTimingNames = [
      'navigationStart',
      'unloadEventStart',
      'unloadEventEnd',
      'redirectStart',
      'redirectEnd',
      'fetchStart',
      'domainLookupStart',
      'domainLookupEnd',
      'connectStart',
      'connectEnd',
      'secureConnectionStart',
      'requestStart',
      'responseStart',
      'responseEnd',
      'domLoading',
      'domInteractive',
      'domContentLoadedEventStart',
      'domContentLoadedEventEnd',
      'domComplete',
      'loadEventStart',
      'loadEventEnd',
    ];
    const IgnoreNames = [...ResourceTimingNames, ...NavTimingNames];
    for (const track of this.legacyTimelineModel.tracks()) {
      if (track.type === TimelineModel.TimelineModel.TrackType.MainThread) {
        for (const event of track.events) {
          if (timelineModel.isUserTimingEvent(event)) {
            if (IgnoreNames.includes(event.name)) {
              continue;
            }
            if (SDK.TracingModel.TracingModel.isAsyncPhase(event.phase)) {
              continue;
            }
            event.setEndTime(event.startTime);
            timingTrack.events.push(event);
          }
        }
      }
    }

    ++this.currentLevel;
  }

  private appendFrames(): void {
    if (!this.legacyPerformanceModel || !this.timelineDataInternal || !this.legacyTimelineModel) {
      return;
    }
    const screenshots = this.legacyPerformanceModel.filmStripModel().frames();
    const hasFilmStrip = Boolean(screenshots.length);
    this.framesHeader.collapsible = hasFilmStrip;
    this.appendHeader(i18nString(UIStrings.frames), this.framesHeader, false /* selectable */);
    this.frameGroup = this.timelineDataInternal.groups[this.timelineDataInternal.groups.length - 1];

    this.entryTypeByLevel[this.currentLevel] = EntryType.Frame;
    for (const frame of this.legacyPerformanceModel.frames()) {
      this.appendFrame(frame);
    }
    ++this.currentLevel;

    if (!hasFilmStrip) {
      return;
    }
    this.appendHeader('', this.screenshotsHeader, false /* selectable */);
    this.entryTypeByLevel[this.currentLevel] = EntryType.Screenshot;
    let prevTimestamp: number|undefined;
    for (const screenshot of screenshots) {
      this.entryData.push(screenshot);
      (this.timelineDataInternal.entryLevels as number[]).push(this.currentLevel);
      (this.timelineDataInternal.entryStartTimes as number[]).push(screenshot.timestamp);
      if (prevTimestamp) {
        (this.timelineDataInternal.entryTotalTimes as number[]).push(screenshot.timestamp - prevTimestamp);
      }
      prevTimestamp = screenshot.timestamp;
    }
    if (screenshots.length && prevTimestamp !== undefined) {
      (this.timelineDataInternal.entryTotalTimes as number[])
          .push(this.legacyTimelineModel.maximumRecordTime() - prevTimestamp);
    }
    ++this.currentLevel;
  }

  private entryType(entryIndex: number): EntryType {
    return this.entryTypeByLevel[(this.timelineDataInternal as PerfUI.FlameChart.TimelineData).entryLevels[entryIndex]];
  }

  prepareHighlightedEntryInfo(entryIndex: number): Element|null {
    let time = '';
    let title;
    let warning;
    let nameSpanTimelineInfoTime = 'timeline-info-time';

    const entryType = this.entryType(entryIndex);
    if (entryType === EntryType.TrackAppender) {
      if (!this.compatibilityTracksAppender) {
        return null;
      }
      const event = (this.entryData[entryIndex] as TraceEngine.Types.TraceEvents.TraceEventData);
      const timelineData = (this.timelineDataInternal as PerfUI.FlameChart.TimelineData);
      const eventLevel = timelineData.entryLevels[entryIndex];
      const highlightedEntryInfo = this.compatibilityTracksAppender.highlightedEntryInfo(event, eventLevel);
      title = highlightedEntryInfo.title;
      time = highlightedEntryInfo.formattedTime;
    } else if (entryType === EntryType.Event) {
      const event = (this.entryData[entryIndex] as SDK.TracingModel.Event);
      const totalTime = event.duration;
      const selfTime = event.selfTime;
      const eps = 1e-6;
      if (typeof totalTime === 'number') {
        time = Math.abs(totalTime - selfTime) > eps && selfTime > eps ?
            i18nString(UIStrings.sSelfS, {
              PH1: i18n.TimeUtilities.millisToString(totalTime, true),
              PH2: i18n.TimeUtilities.millisToString(selfTime, true),
            }) :
            i18n.TimeUtilities.millisToString(totalTime, true);
      }
      if (this.legacyPerformanceModel && this.legacyPerformanceModel.timelineModel().isMarkerEvent(event)) {
        title = TimelineUIUtils.eventTitle(event);
      } else {
        title = this.entryTitle(entryIndex);
      }
      warning = TimelineUIUtils.eventWarning(event);

      if (this.legacyTimelineModel && this.legacyTimelineModel.isLayoutShiftEvent(event)) {
        // TODO: Update this to be dynamic when the trace data supports it.
        const occurrences = 1;
        time = i18nString(UIStrings.occurrencesS, {PH1: occurrences});
      }

      if (this.legacyTimelineModel && this.legacyTimelineModel.isParseHTMLEvent(event)) {
        const startLine = event.args['beginData']['startLine'];
        const endLine = event.args['endData'] && event.args['endData']['endLine'];
        const url = Bindings.ResourceUtils.displayNameForURL(event.args['beginData']['url']);
        const range = (endLine !== -1 || endLine === startLine) ? `${startLine}...${endLine}` : startLine;
        title += ` - ${url} [${range}]`;
      }

    } else if (entryType === EntryType.Frame) {
      const frame = (this.entryData[entryIndex] as TimelineModel.TimelineFrameModel.TimelineFrame);
      time = i18n.TimeUtilities.preciseMillisToString(frame.duration, 1);

      if (frame.idle) {
        title = i18nString(UIStrings.idleFrame);
      } else if (frame.dropped) {
        if (frame.isPartial) {
          title = i18nString(UIStrings.partiallyPresentedFrame);
        } else {
          title = i18nString(UIStrings.droppedFrame);
        }
        nameSpanTimelineInfoTime = 'timeline-info-warning';
      } else {
        title = i18nString(UIStrings.frame);
      }

      if (frame.hasWarnings()) {
        warning = document.createElement('span');
        warning.textContent = i18nString(UIStrings.longFrame);
      }
    } else {
      return null;
    }

    const element = document.createElement('div');
    const root = UI.Utils.createShadowRootWithCoreStyles(element, {
      cssFile: [timelineFlamechartPopoverStyles],
      delegatesFocus: undefined,
    });
    const contents = root.createChild('div', 'timeline-flamechart-popover');
    contents.createChild('span', nameSpanTimelineInfoTime).textContent = time;
    contents.createChild('span', 'timeline-info-title').textContent = title;
    if (warning) {
      warning.classList.add('timeline-info-warning');
      contents.appendChild(warning);
    }
    return element;
  }

  entryColor(entryIndex: number): string {
    function patchColorAndCache<KEY>(cache: Map<KEY, string>, key: KEY, lookupColor: (arg0: KEY) => string): string {
      let color = cache.get(key);
      if (color) {
        return color;
      }
      const parsedColor = Common.Color.parse(lookupColor(key));
      if (!parsedColor) {
        throw new Error('Could not parse color from entry');
      }
      color = parsedColor.setAlpha(0.7).asString(Common.Color.Format.RGBA) || '';
      cache.set(key, color);
      return color;
    }

    if (!this.legacyPerformanceModel || !this.legacyTimelineModel) {
      return '';
    }

    const entryTypes = EntryType;
    const entryType = this.entryType(entryIndex);
    if (entryType === entryTypes.Event) {
      const event = (this.entryData[entryIndex] as SDK.TracingModel.Event);
      if (this.legacyTimelineModel.isGenericTrace()) {
        return this.genericTraceEventColor(event);
      }
      if (this.legacyPerformanceModel.timelineModel().isMarkerEvent(event)) {
        return TimelineUIUtils.markerStyleForEvent(event).color;
      }
      if (!SDK.TracingModel.TracingModel.isAsyncPhase(event.phase) && this.colorForEvent) {
        return this.colorForEvent(event);
      }
      if (this.legacyTimelineModel.isEventTimingInteractionEvent(event)) {
        return this.consoleColorGenerator.colorForID(event.args.data.type + ':' + event.args.data.interactionId);
      }
      if (event.hasCategory(TimelineModel.TimelineModel.TimelineModelImpl.Category.Console) ||
          event.hasCategory(TimelineModel.TimelineModel.TimelineModelImpl.Category.UserTiming)) {
        return this.consoleColorGenerator.colorForID(event.name);
      }
      const category = TimelineUIUtils.eventStyle(event).category;
      return patchColorAndCache(this.asyncColorByCategory, category, () => category.color);
    }
    if (entryType === entryTypes.Frame) {
      return 'white';
    }
    if (entryType === entryTypes.ExtensionEvent) {
      const event = (this.entryData[entryIndex] as SDK.TracingModel.Event);
      return this.extensionColorGenerator.colorForID(event.name);
    }
    if (entryType === entryTypes.TrackAppender) {
      const timelineData = (this.timelineDataInternal as PerfUI.FlameChart.TimelineData);
      const eventLevel = timelineData.entryLevels[entryIndex];
      const event = (this.entryData[entryIndex] as TraceEngine.Types.TraceEvents.TraceEventData);
      return this.compatibilityTracksAppender?.colorForEvent(event, eventLevel) || '';
    }
    return '';
  }

  private genericTraceEventColor(event: SDK.TracingModel.Event): string {
    const key = event.categoriesString || event.name;
    return key ? `hsl(${Platform.StringUtilities.hashCode(key) % 300 + 30}, 40%, 70%)` : '#ccc';
  }

  private preparePatternCanvas(): void {
    // Set the candy stripe pattern to 17px so it repeats well.
    const size = 17;
    this.droppedFramePatternCanvas.width = size;
    this.droppedFramePatternCanvas.height = size;

    this.partialFramePatternCanvas.width = size;
    this.partialFramePatternCanvas.height = size;

    const ctx = this.droppedFramePatternCanvas.getContext('2d');
    if (ctx) {
      // Make a dense solid-line pattern.
      ctx.translate(size * 0.5, size * 0.5);
      ctx.rotate(Math.PI * 0.25);
      ctx.translate(-size * 0.5, -size * 0.5);

      ctx.fillStyle = 'rgb(255, 255, 255)';
      for (let x = -size; x < size * 2; x += 3) {
        ctx.fillRect(x, -size, 1, size * 3);
      }
    }

    const ctx2 = this.partialFramePatternCanvas.getContext('2d');
    if (ctx2) {
      // Make a sparse dashed-line pattern.
      ctx2.strokeStyle = 'rgb(255, 255, 255)';
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(17, 0);
      ctx2.lineTo(10, 7);
      ctx2.moveTo(8, 9);
      ctx2.lineTo(2, 15);
      ctx2.stroke();
    }
  }

  private drawFrame(
      entryIndex: number, context: CanvasRenderingContext2D, text: string|null, barX: number, barY: number,
      barWidth: number, barHeight: number): void {
    const hPadding = 1;
    const frame = (this.entryData[entryIndex] as TimelineModel.TimelineFrameModel.TimelineFrame);
    barX += hPadding;
    barWidth -= 2 * hPadding;
    if (frame.idle) {
      context.fillStyle = 'white';
    } else if (frame.dropped) {
      if (frame.isPartial) {
        // For partially presented frame boxes, paint a yellow background with
        // a sparse white dashed-line pattern overlay.
        context.fillStyle = '#f0e442';
        context.fillRect(barX, barY, barWidth, barHeight);

        const overlay = context.createPattern(this.partialFramePatternCanvas, 'repeat');
        context.fillStyle = overlay || context.fillStyle;
      } else {
        // For dropped frame boxes, paint a red background with a dense white
        // solid-line pattern overlay.
        context.fillStyle = '#f08080';
        context.fillRect(barX, barY, barWidth, barHeight);

        const overlay = context.createPattern(this.droppedFramePatternCanvas, 'repeat');
        context.fillStyle = overlay || context.fillStyle;
      }
    } else if (frame.hasWarnings()) {
      context.fillStyle = '#fad1d1';
    } else {
      context.fillStyle = '#d7f0d1';
    }
    context.fillRect(barX, barY, barWidth, barHeight);

    const frameDurationText = i18n.TimeUtilities.preciseMillisToString(frame.duration, 1);
    const textWidth = context.measureText(frameDurationText).width;
    if (textWidth <= barWidth) {
      context.fillStyle = this.textColor(entryIndex);
      context.fillText(frameDurationText, barX + (barWidth - textWidth) / 2, barY + barHeight - 4);
    }
  }

  private async drawScreenshot(
      entryIndex: number, context: CanvasRenderingContext2D, barX: number, barY: number, barWidth: number,
      barHeight: number): Promise<void> {
    const screenshot = (this.entryData[entryIndex] as SDK.FilmStripModel.Frame);
    if (!this.screenshotImageCache.has(screenshot)) {
      this.screenshotImageCache.set(screenshot, null);
      const data = await screenshot.imageDataPromise();
      const image = await UI.UIUtils.loadImageFromData(data);
      this.screenshotImageCache.set(screenshot, image);
      this.dispatchEventToListeners(Events.DataChanged);
      return;
    }

    const image = this.screenshotImageCache.get(screenshot);
    if (!image) {
      return;
    }
    const imageX = barX + 1;
    const imageY = barY + 1;
    const imageHeight = barHeight - 2;
    const scale = imageHeight / image.naturalHeight;
    const imageWidth = Math.floor(image.naturalWidth * scale);
    context.save();
    context.beginPath();
    context.rect(barX, barY, barWidth, barHeight);
    context.clip();
    context.drawImage(image, imageX, imageY, imageWidth, imageHeight);
    context.strokeStyle = '#ccc';
    context.strokeRect(imageX - 0.5, imageY - 0.5, Math.min(barWidth - 1, imageWidth + 1), imageHeight);
    context.restore();
  }

  decorateEntry(
      entryIndex: number, context: CanvasRenderingContext2D, text: string|null, barX: number, barY: number,
      barWidth: number, barHeight: number, unclippedBarX: number, timeToPixels: number): boolean {
    const data = this.entryData[entryIndex];
    const entryType = this.entryType(entryIndex);
    const entryTypes = EntryType;

    if (entryType === entryTypes.Frame) {
      this.drawFrame(entryIndex, context, text, barX, barY, barWidth, barHeight);
      return true;
    }

    if (entryType === entryTypes.Screenshot) {
      void this.drawScreenshot(entryIndex, context, barX, barY, barWidth, barHeight);
      return true;
    }

    if (entryType === entryTypes.Event) {
      const event = (data as SDK.TracingModel.Event);
      if (event.hasCategory(TimelineModel.TimelineModel.TimelineModelImpl.Category.LatencyInfo)) {
        const timeWaitingForMainThread =
            TimelineModel.TimelineModel.TimelineData.forEvent(event).timeWaitingForMainThread;
        if (timeWaitingForMainThread) {
          context.fillStyle = 'hsla(0, 70%, 60%, 1)';
          const width = Math.floor(unclippedBarX - barX + timeWaitingForMainThread * timeToPixels);
          context.fillRect(barX, barY + barHeight - 3, width, 2);
        }
      }
      if (TimelineModel.TimelineModel.TimelineData.forEvent(event).warning) {
        paintWarningDecoration(barX, barWidth - 1.5);
      }
    }

    function paintWarningDecoration(x: number, width: number): void {
      const /** @const */ triangleSize = 8;
      context.save();
      context.beginPath();
      context.rect(x, barY, width, barHeight);
      context.clip();
      context.beginPath();
      context.fillStyle = 'red';
      context.moveTo(x + width - triangleSize, barY);
      context.lineTo(x + width, barY);
      context.lineTo(x + width, barY + triangleSize);
      context.fill();
      context.restore();
    }

    return false;
  }

  forceDecoration(entryIndex: number): boolean {
    const entryTypes = EntryType;
    const entryType = this.entryType(entryIndex);
    if (entryType === entryTypes.Frame) {
      return true;
    }
    if (entryType === entryTypes.Screenshot) {
      return true;
    }

    if (entryType === entryTypes.Event) {
      const event = (this.entryData[entryIndex] as SDK.TracingModel.Event);
      return Boolean(TimelineModel.TimelineModel.TimelineData.forEvent(event).warning);
    }
    return false;
  }

  appendExtensionEvents(entry: {
    title: string,
    model: SDK.TracingModel.TracingModel,
  }): void {
    this.extensionInfo.push(entry);
    if (this.timelineDataInternal) {
      this.innerAppendExtensionEvents(this.extensionInfo.length - 1);
    }
  }

  private innerAppendExtensionEvents(index: number): void {
    const entry = this.extensionInfo[index];
    const entryType = EntryType.ExtensionEvent;
    const allThreads = [...entry.model.sortedProcesses().map(process => process.sortedThreads())].flat();
    if (!allThreads.length) {
      return;
    }

    const singleTrack =
        allThreads.length === 1 && (!allThreads[0].events().length || !allThreads[0].asyncEvents().length);
    if (!singleTrack) {
      this.appendHeader(entry.title, this.headerLevel1, false /* selectable */);
    }
    const style = singleTrack ? this.headerLevel2 : this.headerLevel1;
    let threadIndex = 0;
    for (const thread of allThreads) {
      const title = singleTrack ? entry.title : thread.name() || i18nString(UIStrings.threadS, {PH1: ++threadIndex});
      this.appendAsyncEventsGroup(null, title, thread.asyncEvents(), style, entryType, false /* selectable */);
      this.appendSyncEvents(null, thread.events(), title, style, entryType, false /* selectable */);
    }
  }

  private appendHeader(title: string, style: PerfUI.FlameChart.GroupStyle, selectable: boolean):
      PerfUI.FlameChart.Group {
    const group =
        ({startLevel: this.currentLevel, name: title, style: style, selectable: selectable} as PerfUI.FlameChart.Group);
    (this.timelineDataInternal as PerfUI.FlameChart.TimelineData).groups.push(group);
    return group;
  }

  private appendEvent(event: SDK.TracingModel.Event, level: number): number {
    const index = this.entryData.length;
    this.entryData.push(event);
    const timelineData = (this.timelineDataInternal as PerfUI.FlameChart.TimelineData);
    timelineData.entryLevels[index] = level;
    timelineData.entryTotalTimes[index] = event.duration || InstantEventVisibleDurationMs;
    timelineData.entryStartTimes[index] = event.startTime;
    indexForEvent.set(event, index);
    return index;
  }

  private appendAsyncEvent(asyncEvent: SDK.TracingModel.AsyncEvent, level: number): void {
    const steps = asyncEvent.steps;
    // If we have past steps, put the end event for each range rather than start one.
    const eventOffset = steps.length > 1 && steps[1].phase === SDK.TracingModel.Phase.AsyncStepPast ? 1 : 0;
    for (let i = 0; i < steps.length - 1; ++i) {
      const index = this.entryData.length;
      this.entryData.push(steps[i + eventOffset]);
      const startTime = steps[i].startTime;
      const timelineData = (this.timelineDataInternal as PerfUI.FlameChart.TimelineData);
      timelineData.entryLevels[index] = level;
      timelineData.entryTotalTimes[index] = steps[i + 1].startTime - startTime;
      timelineData.entryStartTimes[index] = startTime;
    }
  }

  private appendFrame(frame: TimelineModel.TimelineFrameModel.TimelineFrame): void {
    const index = this.entryData.length;
    this.entryData.push(frame);
    this.entryIndexToTitle[index] = i18n.TimeUtilities.millisToString(frame.duration, true);
    if (!this.timelineDataInternal) {
      return;
    }
    this.timelineDataInternal.entryLevels[index] = this.currentLevel;
    this.timelineDataInternal.entryTotalTimes[index] = frame.duration;
    this.timelineDataInternal.entryStartTimes[index] = frame.startTime;
  }

  createSelection(entryIndex: number): TimelineSelection|null {
    const entryType = this.entryType(entryIndex);
    let timelineSelection: TimelineSelection|null = null;
    const entry = this.entryData[entryIndex];
    if (this.isEntryRegularEvent(entry)) {
      const event =
          entry instanceof SDK.TracingModel.Event ? entry : this.compatibilityTracksAppender?.getLegacyEvent(entry);
      if (!event) {
        return null;
      }
      timelineSelection = TimelineSelection.fromTraceEvent(event);
    } else if (entryType === EntryType.Frame) {
      timelineSelection =
          TimelineSelection.fromFrame((this.entryData[entryIndex] as TimelineModel.TimelineFrameModel.TimelineFrame));
    }
    if (timelineSelection) {
      this.lastSelection = new Selection(timelineSelection, entryIndex);
    }
    return timelineSelection;
  }

  formatValue(value: number, precision?: number): string {
    return i18n.TimeUtilities.preciseMillisToString(value, precision);
  }

  canJumpToEntry(_entryIndex: number): boolean {
    return false;
  }

  entryIndexForSelection(selection: TimelineSelection|null): number {
    if (!selection || selection.type() === TimelineSelection.Type.Range) {
      return -1;
    }

    if (this.lastSelection && this.lastSelection.timelineSelection.object() === selection.object()) {
      return this.lastSelection.entryIndex;
    }
    const index = this.entryData.indexOf(
        (selection.object() as SDK.TracingModel.Event | TimelineModel.TimelineFrameModel.TimelineFrame));
    if (index !== -1) {
      this.lastSelection = new Selection(selection, index);
    }
    return index;
  }

  buildFlowForInitiator(entryIndex: number): boolean {
    if (this.lastInitiatorEntry === entryIndex) {
      return false;
    }
    this.lastInitiatorEntry = entryIndex;
    let event = this.eventByIndex(entryIndex);
    const td = this.timelineDataInternal;
    if (!td) {
      return false;
    }
    td.flowStartTimes = [];
    td.flowStartLevels = [];
    td.flowEndTimes = [];
    td.flowEndLevels = [];
    while (event) {
      // Find the closest ancestor with an initiator.
      let initiator;
      for (; event; event = this.eventParent(event)) {
        initiator = TimelineModel.TimelineModel.TimelineData.forEvent(event).initiator();
        if (initiator) {
          break;
        }
      }
      if (!initiator || !event) {
        break;
      }
      const eventIndex = (indexForEvent.get(event) as number);
      const initiatorIndex = (indexForEvent.get(initiator) as number);
      td.flowStartTimes.push(initiator.endTime || initiator.startTime);
      td.flowStartLevels.push(td.entryLevels[initiatorIndex]);
      td.flowEndTimes.push(event.startTime);
      td.flowEndLevels.push(td.entryLevels[eventIndex]);
      event = initiator;
    }
    return true;
  }

  private eventParent(event: SDK.TracingModel.Event): SDK.TracingModel.Event|null {
    const eventIndex = indexForEvent.get(event);
    if (eventIndex === undefined) {
      return null;
    }
    return this.entryParent[eventIndex] || null;
  }

  eventByIndex(entryIndex: number): SDK.TracingModel.Event|null {
    return entryIndex >= 0 && this.entryType(entryIndex) === EntryType.Event ?
        this.entryData[entryIndex] as SDK.TracingModel.Event :
        null;
  }

  setEventColorMapping(colorForEvent: (arg0: SDK.TracingModel.Event) => string): void {
    this.colorForEvent = colorForEvent;
  }

  // Included only for layout tests.
  // TODO(crbug.com/1386091): Fix/port layout tests and remove.
  get performanceModel(): PerformanceModel|null {
    return this.legacyPerformanceModel;
  }
}

export const InstantEventVisibleDurationMs = 0.001;

const eventToDisallowRoot = new WeakMap<SDK.TracingModel.Event, boolean>();
const indexForEvent = new WeakMap<SDK.TracingModel.Event, number>();

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  DataChanged = 'DataChanged',
}

export type EventTypes = {
  [Events.DataChanged]: void,
};

// an entry is a trace event, they are classified into "entry types"
// because some events are rendered differently. For example, screenshot
// events are rendered as images. Checks for entry types allow to have
// different styles, names, etc. for events that look differently.
// In the future we won't have this checks: instead we will forward
// the event to the corresponding "track appender" and it will determine
// how the event shall be rendered.
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum EntryType {
  Frame = 'Frame',
  Event = 'Event',
  TrackAppender = 'TrackAppender',
  ExtensionEvent = 'ExtensionEvent',
  Screenshot = 'Screenshot',
}
