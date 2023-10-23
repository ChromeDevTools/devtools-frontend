// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TraceEngine from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';

import {
  addDecorationToEvent,
  buildGroupStyle,
  buildTrackHeader,
  getFormattedTime,
} from './AppenderUtils.js';
import {
  type CompatibilityTracksAppender,
  type HighlightedEntryInfo,
  type TrackAppender,
  type TrackAppenderName,
} from './CompatibilityTracksAppender.js';
import * as TimelineComponents from './components/components.js';
import {getCategoryStyles, getEventStyle} from './EventUICategory.js';

const UIStrings = {
  /**
   *@description Text shown for an entry in the flame chart that is ignored because it matches
   * a predefined ignore list.
   */
  onIgnoreList: 'On ignore list',
  /**
   * @description Refers to the "Main frame", meaning the top level frame. See https://www.w3.org/TR/html401/present/frames.html
   * @example{example.com} PH1
   */
  mainS: 'Main — {PH1}',
  /**
   * @description Refers to the main thread of execution of a program. See https://developer.mozilla.org/en-US/docs/Glossary/Main_thread
   */
  main: 'Main',
  /**
   * @description Refers to any frame in the page. See https://www.w3.org/TR/html401/present/frames.html
   * @example {https://example.com} PH1
   */
  frameS: 'Frame — {PH1}',
  /**
   *@description A web worker in the page. See https://developer.mozilla.org/en-US/docs/Web/API/Worker
   *@example {https://google.com} PH1
   */
  workerS: '`Worker` — {PH1}',
  /**
   *@description A web worker in the page. See https://developer.mozilla.org/en-US/docs/Web/API/Worker
   *@example {FormatterWorker} PH1
   *@example {https://google.com} PH2
   */
  workerSS: '`Worker`: {PH1} — {PH2}',
  /**
   *@description Label for a web worker exclusively allocated for a purpose.
   */
  dedicatedWorker: 'Dedicated `Worker`',
  /**
   *@description Text for the name of anonymous functions
   */
  anonymous: '(anonymous)',
  /**
   *@description A generic name given for a thread running in the browser (sequence of programmed instructions).
   * The placeholder is an enumeration given to the thread.
   *@example {1} PH1
   */
  threadS: 'Thread {PH1}',
  /**
   *@description Rasterization in computer graphics.
   */
  raster: 'Raster',
  /**
   *@description Name for a thread that rasterizes graphics in a website.
   *@example {2} PH1
   */
  rasterizerThreadS: 'Rasterizer Thread {PH1}',
  /**
   *@description Title of a bidder auction worklet with known URL in the timeline flame chart of the Performance panel
   *@example {https://google.com} PH1
   */
  bidderWorkletS: 'Bidder Worklet — {PH1}',
  /**
   *@description Title of a bidder auction worklet in the timeline flame chart of the Performance panel with an unknown URL
   */
  bidderWorklet: 'Bidder Worklet',

  /**
   *@description Title of a seller auction worklet in the timeline flame chart of the Performance panel with an unknown URL
   */
  sellerWorklet: 'Seller Worklet',

  /**
   *@description Title of an auction worklet in the timeline flame chart of the Performance panel with an unknown URL
   */
  unknownWorklet: 'Auction Worklet',

  /**
   *@description Title of control thread of a service process for an auction worklet in the timeline flame chart of the Performance panel with an unknown URL
   */
  workletService: 'Auction Worklet Service',

  /**
   *@description Title of a seller auction worklet with known URL in the timeline flame chart of the Performance panel
   *@example {https://google.com} PH1
   */
  sellerWorkletS: 'Seller Worklet — {PH1}',

  /**
   *@description Title of an auction worklet with known URL in the timeline flame chart of the Performance panel
   *@example {https://google.com} PH1
   */
  unknownWorkletS: 'Auction Worklet — {PH1}',

  /**
   *@description Title of control thread of a service process for an auction worklet with known URL in the timeline flame chart of the Performance panel
   * @example {https://google.com} PH1
   */
  workletServiceS: 'Auction Worklet Service — {PH1}',
  /**
   *@description Text used to show an EventDispatch event which has a type associated with it
   *@example {click} PH1
   */
  eventDispatchS: 'Event: {PH1}',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/ThreadAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum ThreadType {
  MAIN_THREAD = 'MAIN_THREAD',
  WORKER = 'WORKER',
  RASTERIZER = 'RASTERIZER',
  AUCTION_WORKLET = 'AUCTION_WORKLET',
  OTHER = 'OTHER',
  CPU_PROFILE = 'CPU_PROFILE',
}

// This appender is only triggered when the Renderer handler is run. At
// the moment this only happens in the basic component server example.
// In the future, once this appender fully supports the behaviour of the
// old engine's thread/sync tracks we can always run it by enabling the
// Renderer and Samples handler by default.
export class ThreadAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'Thread';

  #colorGenerator: Common.Color.Generator;
  #compatibilityBuilder: CompatibilityTracksAppender;
  #traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData;

  #entries: TraceEngine.Types.TraceEvents.TraceEventData[] = [];
  #tree: TraceEngine.Helpers.TreeHelpers.TraceEntryTree;
  #processId: TraceEngine.Types.TraceEvents.ProcessID;
  #threadId: TraceEngine.Types.TraceEvents.ThreadID;
  #threadDefaultName: string;
  #flameChartData: PerfUI.FlameChart.FlameChartTimelineData;
  #expanded = false;
  // Raster threads are rendered together under a singler header, so
  // the header is added for the first raster thread and skipped
  // thereafter.
  #rasterIndex: number;
  #headerAppended: boolean = false;
  readonly threadType: ThreadType = ThreadType.MAIN_THREAD;
  readonly isOnMainFrame: boolean;
  #ignoreListingEnabled = Root.Runtime.experiments.isEnabled('ignoreListJSFramesOnTimeline');
  #showAllEventsEnabled = Root.Runtime.experiments.isEnabled('timelineShowAllEvents');
  // TODO(crbug.com/1428024) Clean up API so that we don't have to pass
  // a raster index to the appender (for instance, by querying the flame
  // chart data in the appender or by passing data about the flamechart
  // groups).
  constructor(
      compatibilityBuilder: CompatibilityTracksAppender, flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
      traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData,
      processId: TraceEngine.Types.TraceEvents.ProcessID, threadId: TraceEngine.Types.TraceEvents.ThreadID,
      threadName: string|null, type: ThreadType, rasterCount: number = 0) {
    this.#compatibilityBuilder = compatibilityBuilder;
    // TODO(crbug.com/1456706):
    // The values for this color generator have been taken from the old
    // engine to keep the colors the same after the migration. This
    // generator is used here to create colors for js frames (profile
    // calls) in the flamechart by hashing the script's url. We might
    // need to reconsider this generator when migrating to GM3 colors.
    this.#colorGenerator =
        new Common.Color.Generator({min: 30, max: 330, count: undefined}, {min: 50, max: 80, count: 3}, 85);
    // Add a default color for call frames with no url.
    this.#colorGenerator.setColorForID('', '#f2ecdc');
    this.#traceParsedData = traceParsedData;
    this.#processId = processId;
    this.#threadId = threadId;
    this.#rasterIndex = rasterCount;
    this.#flameChartData = flameChartData;

    // When loading a CPU profile, only CPU data will be available, thus
    // we get the data from the SamplesHandler.
    const entries = type === ThreadType.CPU_PROFILE ?
        this.#traceParsedData.Samples?.profilesInProcess.get(processId)?.get(threadId)?.profileCalls :
        this.#traceParsedData.Renderer?.processes.get(processId)?.threads?.get(threadId)?.entries;
    const tree = type === ThreadType.CPU_PROFILE ?
        this.#traceParsedData.Samples?.profilesInProcess.get(processId)?.get(threadId)?.profileTree :
        this.#traceParsedData.Renderer?.processes.get(processId)?.threads?.get(threadId)?.tree;
    if (!entries || !tree) {
      throw new Error(`Could not find data for thread with id ${threadId} in process with id ${processId}`);
    }
    this.#entries = entries;
    this.#tree = tree;
    this.#threadDefaultName = threadName || i18nString(UIStrings.threadS, {PH1: threadId});
    this.isOnMainFrame = Boolean(this.#traceParsedData.Renderer?.processes.get(processId)?.isOnMainFrame);
    this.threadType = type;
    // AuctionWorklets are threads, so we re-use this appender rather than
    // duplicate it, but we change the name because we want to render these
    // lower down than other threads.
    if (this.#traceParsedData.AuctionWorklets.worklets.has(processId)) {
      this.appenderName = 'Thread_AuctionWorklet';
    }
  }

  processId(): TraceEngine.Types.TraceEvents.ProcessID {
    return this.#processId;
  }

  threadId(): TraceEngine.Types.TraceEvents.ThreadID {
    return this.#threadId;
  }

  /**
   * Appends into the flame chart data the data corresponding to the
   * this thread.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded wether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel: number, expanded: boolean = false): number {
    if (this.#entries.length === 0) {
      return trackStartLevel;
    }
    this.#expanded = expanded;
    return this.#appendTreeAtLevel(trackStartLevel);
  }

  /**
   * Track header is appended only if there are events visible on it.
   * Otherwise we don't append any track. So, instead of preemptively
   * appending a track before appending its events, we only do so once
   * we have detected that the track contains an event that is visible.
   */
  #ensureTrackHeaderAppended(trackStartLevel: number): void {
    if (this.#headerAppended) {
      return;
    }
    this.#headerAppended = true;
    if (this.threadType === ThreadType.RASTERIZER) {
      this.#appendRasterHeaderAndTitle(trackStartLevel);
    } else {
      this.#appendTrackHeaderAtLevel(trackStartLevel);
    }
  }

  /**
   * Adds into the flame chart data the header corresponding to this
   * thread. A header is added in the shape of a group in the flame
   * chart data. A group has a predefined style and a reference to the
   * definition of the legacy track (which should be removed in the
   * future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   */
  #appendTrackHeaderAtLevel(currentLevel: number): void {
    const trackIsCollapsible = this.#entries.length > 0;
    const style = buildGroupStyle({shareHeaderLine: false, collapsible: trackIsCollapsible});
    const group = buildTrackHeader(
        currentLevel, this.trackName(), style, /* selectable= */ true, this.#expanded, /* track= */ null,
        /* showStackContextMenu= */ true);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }
  /**
   * Raster threads are rendered under a single header in the
   * flamechart. However, each thread has a unique title which needs to
   * be added to the flamechart data.
   */
  #appendRasterHeaderAndTitle(trackStartLevel: number): void {
    if (this.#rasterIndex === 1) {
      const trackIsCollapsible = this.#entries.length > 0;
      const headerStyle = buildGroupStyle({shareHeaderLine: false, collapsible: trackIsCollapsible});
      const headerGroup =
          buildTrackHeader(trackStartLevel, this.trackName(), headerStyle, /* selectable= */ false, this.#expanded);
      this.#flameChartData.groups.push(headerGroup);
    }
    // Nesting is set to 1 because the track is appended inside the
    // header for all raster threads.
    const titleStyle = buildGroupStyle({padding: 2, nestingLevel: 1, collapsible: false});
    const rasterizerTitle = i18nString(UIStrings.rasterizerThreadS, {PH1: this.#rasterIndex});
    const titleGroup =
        buildTrackHeader(trackStartLevel, rasterizerTitle, titleStyle, /* selectable= */ true, this.#expanded);
    this.#compatibilityBuilder.registerTrackForGroup(titleGroup, this);
  }

  trackName(): string {
    // This UI string doesn't yet use the i18n API because it is not
    // shown in production, only in the component server, reason being
    // it is not ready to be shipped.
    const url = this.#traceParsedData.Renderer?.processes.get(this.#processId)?.url || '';
    let threadTypeLabel: string|null = null;
    switch (this.threadType) {
      case ThreadType.MAIN_THREAD:
        threadTypeLabel =
            this.isOnMainFrame ? i18nString(UIStrings.mainS, {PH1: url}) : i18nString(UIStrings.frameS, {PH1: url});
        break;
      case ThreadType.CPU_PROFILE:
        threadTypeLabel = i18nString(UIStrings.main);
        break;
      case ThreadType.WORKER:
        threadTypeLabel = this.#buildNameForWorker();
        break;
      case ThreadType.RASTERIZER:
        threadTypeLabel = i18nString(UIStrings.raster);
        break;
      case ThreadType.OTHER:
        break;
      case ThreadType.AUCTION_WORKLET:
        threadTypeLabel = this.#buildNameForAuctionWorklet();
        break;
      default:
        return Platform.assertNever(this.threadType, `Unknown thread type: ${this.threadType}`);
    }
    return threadTypeLabel || this.#threadDefaultName;
  }

  #buildNameForAuctionWorklet(): string {
    const workletMetadataEvent = this.#traceParsedData.AuctionWorklets.worklets.get(this.#processId);
    // We should always have this event - if we do not, we were instantiated with invalid data.
    if (!workletMetadataEvent) {
      return i18nString(UIStrings.unknownWorklet);
    }

    // Host could be empty - in which case we do not want to add it.
    const host = workletMetadataEvent.host ? `https://${workletMetadataEvent.host}` : '';
    const shouldAddHost = host.length > 0;

    // For each Auction Worklet in a page there are two threads we care about on the same process.
    // 1. The "Worklet Service" which is a generic helper service. This thread
    // is always named "auction_worklet.CrUtilityMain".
    //
    // 2. The "Seller/Bidder" service. This thread is always named
    // "AuctionV8HelperThread". The AuctionWorkets handler does the job of
    // figuring this out for us - the metadata event it provides for each
    // worklet process will have a `type` already set.
    //
    // Therefore, for this given thread, which we know is part of
    // an AuctionWorklet process, we need to figure out if this thread is the
    // generic service, or a seller/bidder worklet.
    //
    // Note that the worklet could also have the "unknown" type - this is not
    // expected but implemented to prevent trace event changes causing DevTools
    // to break with unknown worklet types.
    const isUtilityThread = workletMetadataEvent.args.data.utilityThread.tid === this.#threadId;
    const isBidderOrSeller = workletMetadataEvent.args.data.v8HelperThread.tid === this.#threadId;

    if (isUtilityThread) {
      return shouldAddHost ? i18nString(UIStrings.workletServiceS, {PH1: host}) : i18nString(UIStrings.workletService);
    }

    if (isBidderOrSeller) {
      switch (workletMetadataEvent.type) {
        case TraceEngine.Types.TraceEvents.AuctionWorkletType.SELLER:
          return shouldAddHost ? i18nString(UIStrings.sellerWorkletS, {PH1: host}) :
                                 i18nString(UIStrings.sellerWorklet);
        case TraceEngine.Types.TraceEvents.AuctionWorkletType.BIDDER:
          return shouldAddHost ? i18nString(UIStrings.bidderWorkletS, {PH1: host}) :
                                 i18nString(UIStrings.bidderWorklet);
        case TraceEngine.Types.TraceEvents.AuctionWorkletType.UNKNOWN:
          return shouldAddHost ? i18nString(UIStrings.unknownWorkletS, {PH1: host}) :
                                 i18nString(UIStrings.unknownWorklet);
        default:
          Platform.assertNever(
              workletMetadataEvent.type, `Unexpected Auction Worklet Type ${workletMetadataEvent.type}`);
      }
    }
    // We should never reach here, but just in case!
    return shouldAddHost ? i18nString(UIStrings.unknownWorkletS, {PH1: host}) : i18nString(UIStrings.unknownWorklet);
  }

  #buildNameForWorker(): string {
    const url = this.#traceParsedData.Renderer?.processes.get(this.#processId)?.url || '';
    const workerId = this.#traceParsedData.Workers.workerIdByThread.get(this.#threadId);
    const workerURL = workerId ? this.#traceParsedData.Workers.workerURLById.get(workerId) : url;
    // Try to create a name using the worker url if present. If not, use a generic label.
    let workerName =
        workerURL ? i18nString(UIStrings.workerS, {PH1: workerURL}) : i18nString(UIStrings.dedicatedWorker);
    const workerTarget = workerId !== undefined && SDK.TargetManager.TargetManager.instance().targetById(workerId);
    if (workerTarget) {
      // Get the worker name from the target, which corresponds to the name
      // assigned to the worker when it was constructed.
      workerName = i18nString(UIStrings.workerSS, {PH1: workerTarget.name(), PH2: url});
    }
    return workerName;
  }

  /**
   * Adds into the flame chart data the entries of this thread, which
   * includes trace events and JS calls.
   * @param currentLevel the flame chart level from which entries will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * entries (the first available level to append more data).
   */
  #appendTreeAtLevel(trackStartLevel: number): number {
    // We can not used the tree maxDepth in the tree from the
    // RendererHandler because ignore listing and visibility of events
    // alter the final depth of the flame chart.
    return this.#appendNodesAtLevel(this.#tree.roots, trackStartLevel);
  }

  /**
   * Traverses the trees formed by the provided nodes in breadth first
   * fashion and appends each node's entry on each iteration. As each
   * entry is handled, a check for the its visibility or if it's ignore
   * listed is done before appending.
   */
  #appendNodesAtLevel(
      nodes: Iterable<TraceEngine.Helpers.TreeHelpers.TraceEntryNode>, startingLevel: number,
      parentIsIgnoredListed: boolean = false): number {
    let maxDepthInTree = startingLevel;
    for (const node of nodes) {
      let nextLevel = startingLevel;
      const entry = node.entry;
      const entryIsIgnoreListed = this.isIgnoreListedEntry(entry);
      // Events' visibility is determined from their predefined styles,
      // which is something that's not available in the engine data.
      // Thus it needs to be checked in the appenders, but preemptively
      // checking if there are visible events and returning early if not
      // is potentially expensive since, in theory, we would be adding
      // another traversal to the entries array (which could grow
      // large). To avoid the extra cost we  add the check in the
      // traversal we already need to append events.
      const entryIsVisible = this.#compatibilityBuilder.entryIsVisibleInTimeline(entry) || this.#showAllEventsEnabled;
      // For ignore listing support, these two conditions need to be met
      // to not append a profile call to the flame chart:
      // 1. It is ignore listed
      // 2. It is NOT the bottom-most call in an ignore listed stack (a
      //    set of chained profile calls that belong to ignore listed
      //    URLs).
      // This means that all of the ignore listed calls are ignored (not
      // appended), except if it is the bottom call of an ignored stack.
      // This is becaue to represent ignore listed stack frames, we add
      // a flame chart entry with the length and position of the bottom
      // frame, which is distictively marked to denote an ignored listed
      // stack.
      const skipEventDueToIgnoreListing = entryIsIgnoreListed && parentIsIgnoredListed;
      if (entryIsVisible && !skipEventDueToIgnoreListing) {
        this.#appendEntryAtLevel(entry, startingLevel);
        nextLevel++;
      }

      const depthInChildTree = this.#appendNodesAtLevel(node.children, nextLevel, entryIsIgnoreListed);
      maxDepthInTree = Math.max(depthInChildTree, maxDepthInTree);
    }
    return maxDepthInTree;
  }

  #appendEntryAtLevel(entry: TraceEngine.Types.TraceEvents.TraceEventData, level: number): void {
    this.#ensureTrackHeaderAppended(level);
    const index = this.#compatibilityBuilder.appendEventAtLevel(entry, level, this);
    this.#addDecorationsToEntry(entry, index);
  }

  #addDecorationsToEntry(entry: TraceEngine.Types.TraceEvents.TraceEventData, index: number): void {
    const warnings = this.#traceParsedData.Warnings.perEvent.get(entry);
    if (!warnings) {
      return;
    }
    addDecorationToEvent(this.#flameChartData, index, {type: 'WARNING_TRIANGLE'});
    if (!warnings.includes('LONG_TASK')) {
      return;
    }
    addDecorationToEvent(this.#flameChartData, index, {
      type: 'CANDY',
      startAtTime: TraceEngine.Handlers.ModelHandlers.Warnings.LONG_MAIN_THREAD_TASK_THRESHOLD,
    });
  }

  isIgnoreListedEntry(entry: TraceEngine.Types.TraceEvents.TraceEventData): boolean {
    if (!this.#ignoreListingEnabled) {
      return false;
    }

    if (!TraceEngine.Types.TraceEvents.isProfileCall(entry)) {
      return false;
    }
    const url = entry.callFrame.url as Platform.DevToolsPath.UrlString;
    return url && this.isIgnoreListedURL(url);
  }

  private isIgnoreListedURL(url: Platform.DevToolsPath.UrlString): boolean {
    return Bindings.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(url);
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
  colorForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    if (TraceEngine.Types.TraceEvents.isProfileCall(event)) {
      if (event.callFrame.functionName === '(idle)') {
        return getCategoryStyles().Idle.getComputedValue();
      }
      if (event.callFrame.scriptId === '0') {
        // If we can not match this frame to a script, return the
        // generic "scripting" color.
        return getCategoryStyles().Scripting.getComputedValue();
      }
      // Otherwise, return a color created based on its URL.
      return this.#colorGenerator.colorForID(event.callFrame.url);
    }
    const defaultColor =
        getEventStyle(event.name as TraceEngine.Types.TraceEvents.KnownEventName)?.category.getComputedValue();
    return defaultColor || getCategoryStyles().Other.getComputedValue();
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(entry: TraceEngine.Types.TraceEvents.TraceEventData): string {
    if (this.isIgnoreListedEntry(entry)) {
      return i18nString(UIStrings.onIgnoreList);
    }

    // If the event is a profile call, we need to look up its name based on its
    // ProfileNode in the CPUProfile for the trace we are working with.
    if (TraceEngine.Types.TraceEvents.isProfileCall(entry)) {
      // In the future traceParsedData.Samples will always be defined, but this
      // is not the case until the sync tracks migration is fully shipped,
      // hence this extra check.
      if (this.#traceParsedData.Samples) {
        const potentialCallName =
            TraceEngine.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(this.#traceParsedData.Samples, entry);
        // We need this extra check because the call name could be the empty
        // string. If it is, we want to fallback to the "(anonymous)" text.
        if (potentialCallName) {
          return potentialCallName;
        }
      }

      return entry.callFrame.functionName || i18nString(UIStrings.anonymous);
    }

    if (TraceEngine.Types.TraceEvents.isTraceEventDispatch(entry)) {
      // EventDispatch represent user actions such as clicks, so in this case
      // rather than show the event title (which is always just "Event"), we
      // add the type ("click") to help the user understand the event.
      return i18nString(UIStrings.eventDispatchS, {PH1: entry.args.data.type});
    }

    const defaultName = getEventStyle(entry.name as TraceEngine.Types.TraceEvents.KnownEventName)?.title;
    return defaultName || entry.name;
  }

  /**
   * Returns the info shown when an event added by this appender
   * is hovered in the timeline.
   */
  highlightedEntryInfo(event: TraceEngine.Types.TraceEvents.SyntheticEventWithSelfTime): HighlightedEntryInfo {
    let title = this.titleForEvent(event);
    if (TraceEngine.Types.TraceEvents.isTraceEventParseHTML(event)) {
      const startLine = event.args['beginData']['startLine'];
      const endLine = event.args['endData'] && event.args['endData']['endLine'];
      const eventURL = event.args['beginData']['url'] as Platform.DevToolsPath.UrlString;
      const url = Bindings.ResourceUtils.displayNameForURL(eventURL);
      const range = (endLine !== -1 || endLine === startLine) ? `${startLine}...${endLine}` : startLine;
      title += ` - ${url} [${range}]`;
    }
    const warningElements: HTMLSpanElement[] =
        TimelineComponents.DetailsView.buildWarningElementsForEvent(event, this.#traceParsedData);
    return {title, formattedTime: getFormattedTime(event.dur, event.selfTime), warningElements};
  }
}
