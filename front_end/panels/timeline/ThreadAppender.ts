// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';

import {
  addDecorationToEvent,
  buildGroupStyle,
  buildTrackHeader,
  getFormattedTime,
} from './AppenderUtils.js';
import {
  type CompatibilityTracksAppender,
  entryIsVisibleInTimeline,
  type HighlightedEntryInfo,
  type TrackAppender,
  type TrackAppenderName,
  VisualLoggingTrackName,
} from './CompatibilityTracksAppender.js';
import * as Components from './components/components.js';
import * as ModificationsManager from './ModificationsManager.js';
import * as Utils from './utils/utils.js';

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
   *@description Threads used for background tasks.
   */
  threadPool: 'Thread pool',
  /**
   *@description Name for a thread that rasterizes graphics in a website.
   *@example {2} PH1
   */
  rasterizerThreadS: 'Rasterizer thread {PH1}',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   *@example {2} PH1
   */
  threadPoolThreadS: 'Thread pool worker {PH1}',
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
  workletService: 'Auction Worklet service',

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
  workletServiceS: 'Auction Worklet service — {PH1}',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/ThreadAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// This appender is only triggered when the Renderer handler is run. At
// the moment this only happens in the basic component server example.
// In the future, once this appender fully supports the behaviour of the
// old engine's thread/sync tracks we can always run it by enabling the
// Renderer and Samples handler by default.
export class ThreadAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'Thread';

  #colorGenerator: Common.Color.Generator;
  #compatibilityBuilder: CompatibilityTracksAppender;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace;

  #entries: Trace.Types.Events.Event[] = [];
  #tree: Trace.Helpers.TreeHelpers.TraceEntryTree;
  #processId: Trace.Types.Events.ProcessID;
  #threadId: Trace.Types.Events.ThreadID;
  #threadDefaultName: string;
  #expanded = false;
  #headerAppended: boolean = false;
  readonly threadType: Trace.Handlers.Threads.ThreadType = Trace.Handlers.Threads.ThreadType.MAIN_THREAD;
  readonly isOnMainFrame: boolean;
  #showAllEventsEnabled = Root.Runtime.experiments.isEnabled('timeline-show-all-events');
  #url: string = '';
  #headerNestingLevel: number|null = null;
  constructor(
      compatibilityBuilder: CompatibilityTracksAppender, parsedTrace: Trace.Handlers.Types.ParsedTrace,
      processId: Trace.Types.Events.ProcessID, threadId: Trace.Types.Events.ThreadID, threadName: string|null,
      type: Trace.Handlers.Threads.ThreadType) {
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
    this.#parsedTrace = parsedTrace;
    this.#processId = processId;
    this.#threadId = threadId;

    // When loading a CPU profile, only CPU data will be available, thus
    // we get the data from the SamplesHandler.
    const entries = type === Trace.Handlers.Threads.ThreadType.CPU_PROFILE ?
        this.#parsedTrace.Samples?.profilesInProcess.get(processId)?.get(threadId)?.profileCalls :
        this.#parsedTrace.Renderer?.processes.get(processId)?.threads?.get(threadId)?.entries;
    const tree = type === Trace.Handlers.Threads.ThreadType.CPU_PROFILE ?
        this.#parsedTrace.Samples?.profilesInProcess.get(processId)?.get(threadId)?.profileTree :
        this.#parsedTrace.Renderer?.processes.get(processId)?.threads?.get(threadId)?.tree;
    if (!entries || !tree) {
      throw new Error(`Could not find data for thread with id ${threadId} in process with id ${processId}`);
    }
    this.#entries = entries;
    this.#tree = tree;
    this.#threadDefaultName = threadName || i18nString(UIStrings.threadS, {PH1: threadId});
    this.isOnMainFrame = Boolean(this.#parsedTrace.Renderer?.processes.get(processId)?.isOnMainFrame);
    this.threadType = type;
    // AuctionWorklets are threads, so we re-use this appender rather than
    // duplicate it, but we change the name because we want to render these
    // lower down than other threads.
    if (this.#parsedTrace.AuctionWorklets.worklets.has(processId)) {
      this.appenderName = 'Thread_AuctionWorklet';
    }
    this.#url = this.#parsedTrace.Renderer?.processes.get(this.#processId)?.url || '';
  }

  processId(): Trace.Types.Events.ProcessID {
    return this.#processId;
  }

  threadId(): Trace.Types.Events.ThreadID {
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

  setHeaderNestingLevel(level: number): void {
    this.#headerNestingLevel = level;
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
    if (this.threadType === Trace.Handlers.Threads.ThreadType.RASTERIZER ||
        this.threadType === Trace.Handlers.Threads.ThreadType.THREAD_POOL) {
      this.#appendGroupedTrackHeaderAndTitle(trackStartLevel, this.threadType);
    } else {
      this.#appendTrackHeaderAtLevel(trackStartLevel);
    }
    this.#headerAppended = true;
  }

  setHeaderAppended(headerAppended: boolean): void {
    this.#headerAppended = headerAppended;
  }

  headerAppended(): boolean {
    return this.#headerAppended;
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
    if (this.#headerNestingLevel !== null) {
      style.nestingLevel = this.#headerNestingLevel;
    }
    const visualLoggingName = this.#visualLoggingNameForThread();
    const group = buildTrackHeader(
        visualLoggingName, currentLevel, this.trackName(), style, /* selectable= */ true, this.#expanded,
        /* showStackContextMenu= */ true);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }

  #visualLoggingNameForThread(): VisualLoggingTrackName|null {
    switch (this.threadType) {
      case Trace.Handlers.Threads.ThreadType.MAIN_THREAD:
        return this.isOnMainFrame ? VisualLoggingTrackName.THREAD_MAIN : VisualLoggingTrackName.THREAD_FRAME;
      case Trace.Handlers.Threads.ThreadType.WORKER:
        return VisualLoggingTrackName.THREAD_WORKER;
      case Trace.Handlers.Threads.ThreadType.RASTERIZER:
        return VisualLoggingTrackName.THREAD_RASTERIZER;
      case Trace.Handlers.Threads.ThreadType.AUCTION_WORKLET:
        return VisualLoggingTrackName.THREAD_AUCTION_WORKLET;
      case Trace.Handlers.Threads.ThreadType.OTHER:
        return VisualLoggingTrackName.THREAD_OTHER;
      case Trace.Handlers.Threads.ThreadType.CPU_PROFILE:
        return VisualLoggingTrackName.THREAD_CPU_PROFILE;
      case Trace.Handlers.Threads.ThreadType.THREAD_POOL:
        return VisualLoggingTrackName.THREAD_POOL;
      default:
        return null;
    }
  }
  /**
   * Raster threads are rendered under a single header in the
   * flamechart. However, each thread has a unique title which needs to
   * be added to the flamechart data.
   */
  #appendGroupedTrackHeaderAndTitle(
      trackStartLevel: number,
      threadType: Trace.Handlers.Threads.ThreadType.RASTERIZER|Trace.Handlers.Threads.ThreadType.THREAD_POOL): void {
    const currentTrackCount = this.#compatibilityBuilder.getCurrentTrackCountForThreadType(threadType);
    if (currentTrackCount === 0) {
      const trackIsCollapsible = this.#entries.length > 0;
      const headerStyle = buildGroupStyle({shareHeaderLine: false, collapsible: trackIsCollapsible});

      // Don't set any jslogcontext (first argument) because this is a shared
      // header group. Each child will have its context set.
      const headerGroup = buildTrackHeader(
          null, trackStartLevel, this.trackName(), headerStyle, /* selectable= */ false, this.#expanded);
      this.#compatibilityBuilder.getFlameChartTimelineData().groups.push(headerGroup);
    }

    // Nesting is set to 1 because the track is appended inside the
    // header for all raster threads.
    const titleStyle = buildGroupStyle({padding: 2, nestingLevel: 1, collapsible: false});
    const rasterizerTitle = this.threadType === Trace.Handlers.Threads.ThreadType.RASTERIZER ?
        i18nString(UIStrings.rasterizerThreadS, {PH1: currentTrackCount + 1}) :
        i18nString(UIStrings.threadPoolThreadS, {PH1: currentTrackCount + 1});

    const visualLoggingName = this.#visualLoggingNameForThread();
    const titleGroup = buildTrackHeader(
        visualLoggingName, trackStartLevel, rasterizerTitle, titleStyle, /* selectable= */ true, this.#expanded);
    this.#compatibilityBuilder.registerTrackForGroup(titleGroup, this);
  }

  trackName(): string {
    let threadTypeLabel: string|null = null;
    switch (this.threadType) {
      case Trace.Handlers.Threads.ThreadType.MAIN_THREAD:
        threadTypeLabel = this.isOnMainFrame ? i18nString(UIStrings.mainS, {PH1: this.#url}) :
                                               i18nString(UIStrings.frameS, {PH1: this.#url});
        break;
      case Trace.Handlers.Threads.ThreadType.CPU_PROFILE:
        threadTypeLabel = i18nString(UIStrings.main);
        break;
      case Trace.Handlers.Threads.ThreadType.WORKER:
        threadTypeLabel = this.#buildNameForWorker();
        break;
      case Trace.Handlers.Threads.ThreadType.RASTERIZER:
        threadTypeLabel = i18nString(UIStrings.raster);
        break;
      case Trace.Handlers.Threads.ThreadType.THREAD_POOL:
        threadTypeLabel = i18nString(UIStrings.threadPool);
        break;
      case Trace.Handlers.Threads.ThreadType.OTHER:
        break;
      case Trace.Handlers.Threads.ThreadType.AUCTION_WORKLET:
        threadTypeLabel = this.#buildNameForAuctionWorklet();
        break;
      default:
        return Platform.assertNever(this.threadType, `Unknown thread type: ${this.threadType}`);
    }
    let suffix = '';
    if (this.#parsedTrace.Meta.traceIsGeneric) {
      suffix = suffix + ` (${this.threadId()})`;
    }
    return (threadTypeLabel || this.#threadDefaultName) + suffix;
  }

  getUrl(): string {
    return this.#url;
  }

  getEntries(): Trace.Types.Events.Event[] {
    return this.#entries;
  }

  #buildNameForAuctionWorklet(): string {
    const workletMetadataEvent = this.#parsedTrace.AuctionWorklets.worklets.get(this.#processId);
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
        case Trace.Types.Events.AuctionWorkletType.SELLER:
          return shouldAddHost ? i18nString(UIStrings.sellerWorkletS, {PH1: host}) :
                                 i18nString(UIStrings.sellerWorklet);
        case Trace.Types.Events.AuctionWorkletType.BIDDER:
          return shouldAddHost ? i18nString(UIStrings.bidderWorkletS, {PH1: host}) :
                                 i18nString(UIStrings.bidderWorklet);
        case Trace.Types.Events.AuctionWorkletType.UNKNOWN:
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
    const url = this.#parsedTrace.Renderer?.processes.get(this.#processId)?.url || '';
    const workerId = this.#parsedTrace.Workers.workerIdByThread.get(this.#threadId);
    const workerURL = workerId ? this.#parsedTrace.Workers.workerURLById.get(workerId) : url;
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
      nodes: Iterable<Trace.Helpers.TreeHelpers.TraceEntryNode>, startingLevel: number,
      parentIsIgnoredListed: boolean = false): number {
    const invisibleEntries =
        ModificationsManager.ModificationsManager.activeManager()?.getEntriesFilter().invisibleEntries() ?? [];
    let maxDepthInTree = startingLevel;
    for (const node of nodes) {
      let nextLevel = startingLevel;
      const entry = node.entry;
      const entryIsIgnoreListed = Utils.IgnoreList.isIgnoreListedEntry(entry);
      // Events' visibility is determined from their predefined styles,
      // which is something that's not available in the engine data.
      // Thus it needs to be checked in the appenders, but preemptively
      // checking if there are visible events and returning early if not
      // is potentially expensive since, in theory, we would be adding
      // another traversal to the entries array (which could grow
      // large). To avoid the extra cost we  add the check in the
      // traversal we already need to append events.
      const entryIsVisible = !invisibleEntries.includes(entry) &&
          (entryIsVisibleInTimeline(entry, this.#parsedTrace) || this.#showAllEventsEnabled);
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

  #appendEntryAtLevel(entry: Trace.Types.Events.Event, level: number): void {
    this.#ensureTrackHeaderAppended(level);
    const index = this.#compatibilityBuilder.appendEventAtLevel(entry, level, this);
    this.#addDecorationsToEntry(entry, index);
  }

  #addDecorationsToEntry(entry: Trace.Types.Events.Event, index: number): void {
    const flameChartData = this.#compatibilityBuilder.getFlameChartTimelineData();
    if (ModificationsManager.ModificationsManager.activeManager()?.getEntriesFilter().isEntryExpandable(entry)) {
      addDecorationToEvent(
          flameChartData, index, {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW});
    }
    const warnings = this.#parsedTrace.Warnings.perEvent.get(entry);
    if (!warnings) {
      return;
    }
    addDecorationToEvent(flameChartData, index, {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE});
    if (!warnings.includes('LONG_TASK')) {
      return;
    }
    addDecorationToEvent(flameChartData, index, {
      type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
      startAtTime: Trace.Handlers.ModelHandlers.Warnings.LONG_MAIN_THREAD_TASK_THRESHOLD,
    });
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
    if (this.#parsedTrace.Meta.traceIsGeneric) {
      return event.name ? `hsl(${Platform.StringUtilities.hashCode(event.name) % 300 + 30}, 40%, 70%)` : '#ccc';
    }

    if (Trace.Types.Events.isProfileCall(event)) {
      if (event.callFrame.functionName === '(idle)') {
        return Components.EntryStyles.getCategoryStyles().idle.getComputedColorValue();
      }
      if (event.callFrame.scriptId === '0') {
        // If we can not match this frame to a script, return the
        // generic "scripting" color.
        return Components.EntryStyles.getCategoryStyles().scripting.getComputedColorValue();
      }
      // Otherwise, return a color created based on its URL.
      return this.#colorGenerator.colorForID(event.callFrame.url);
    }
    const defaultColor =
        Components.EntryStyles.getEventStyle(event.name as Trace.Types.Events.Name)?.category.getComputedColorValue();
    return defaultColor || Components.EntryStyles.getCategoryStyles().other.getComputedColorValue();
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(entry: Trace.Types.Events.Event): string {
    if (Utils.IgnoreList.isIgnoreListedEntry(entry)) {
      return i18nString(UIStrings.onIgnoreList);
    }
    return Components.EntryName.nameForEntry(entry, this.#parsedTrace);
  }

  /**
   * Returns the info shown when an event added by this appender
   * is hovered in the timeline.
   */
  highlightedEntryInfo(event: Trace.Types.Events.Event): HighlightedEntryInfo {
    let title = this.titleForEvent(event);
    if (Trace.Types.Events.isParseHTML(event)) {
      const startLine = event.args['beginData']['startLine'];
      const endLine = event.args['endData'] && event.args['endData']['endLine'];
      const eventURL = event.args['beginData']['url'] as Platform.DevToolsPath.UrlString;
      const url = Bindings.ResourceUtils.displayNameForURL(eventURL);
      const range = (endLine !== -1 || endLine === startLine) ? `${startLine}...${endLine}` : startLine;
      title += ` - ${url} [${range}]`;
    }
    const selfTime = this.#parsedTrace.Renderer.entryToNode.get(event)?.selfTime;
    return {title, formattedTime: getFormattedTime(event.dur, selfTime)};
  }
}
