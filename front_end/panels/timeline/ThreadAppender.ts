// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TraceEngine from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import {addDecorationToEvent, buildGroupStyle, buildTrackHeader, getFormattedTime} from './AppenderUtils.js';
import {
  type CompatibilityTracksAppender,
  type HighlightedEntryInfo,
  type TrackAppender,
  type TrackAppenderName,
} from './CompatibilityTracksAppender.js';
import {DEFAULT_CATEGORY_STYLES_PALETTE, EventStyles} from './EventUICategory.js';

const UIStrings = {
  /**
   * @description Refers to the "Main frame", meaning the top level frame. See https://www.w3.org/TR/html401/present/frames.html
   * @example{example.com} PH1
   */
  mainS: 'Main — {PH1}',
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
   *@description Text in the Performance panel for a forced style and layout calculation of elements
   * in a page. See https://developer.mozilla.org/en-US/docs/Glossary/Reflow
   */
  forcedReflow: 'Forced reflow',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   *@example {Forced reflow} PH1
   */
  sIsALikelyPerformanceBottleneck: '{PH1} is a likely performance bottleneck.',
  /**
   *@description Text in the Performance panel for a function called during a time the browser was
   * idle (inactive), which to longer to execute than a predefined deadline.
   *@example {10ms} PH1
   */
  idleCallbackExecutionExtended: 'Idle callback execution extended beyond deadline by {PH1}',
  /**
   *@description Text in the Performance panel which describes how long a task took.
   *@example {task} PH1
   *@example {10ms} PH2
   */
  sTookS: '{PH1} took {PH2}.',
  /**
   *@description Text in the Performance panel for a task that took long. See
   * https://developer.mozilla.org/en-US/docs/Glossary/Long_task
   */
  longTask: 'Long task',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/ThreadAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum ThreadType {
  MAIN_THREAD = 'MAIN_THREAD',
  WORKER = 'WORKER',
  RASTERIZER = 'RASTERIZER',
  OTHER = 'OTHER',
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
  #processId: TraceEngine.Types.TraceEvents.ProcessID;
  #threadId: TraceEngine.Types.TraceEvents.ThreadID;
  #threadDefaultName: string;
  #flameChartData: PerfUI.FlameChart.FlameChartTimelineData;
  // Raster threads are rendered together under a singler header, so
  // the header is added for the first raster thread and skipped
  // thereafter.
  #rasterIndex: number;
  readonly threadType: ThreadType = ThreadType.MAIN_THREAD;
  readonly isOnMainFrame: boolean;

  // TODO(crbug.com/1428024) Clean up API so that we don't have to pass
  // a raster index to the appender (for instance, by querying the flame
  // chart data in the appender or by passing data about the flamechart
  // groups).
  constructor(
      compatibilityBuilder: CompatibilityTracksAppender, flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
      traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData,
      processId: TraceEngine.Types.TraceEvents.ProcessID, threadId: TraceEngine.Types.TraceEvents.ThreadID,
      threadName: string|null, type: ThreadType, rasterCount: number) {
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
    const entries = this.#traceParsedData.Renderer?.processes.get(processId)?.threads?.get(threadId)?.entries;
    if (!entries) {
      throw new Error(`Could not find data for thread with id ${threadId} in process with id ${processId}`);
    }
    this.#entries = entries;
    this.#threadDefaultName = threadName || i18nString(UIStrings.threadS, {PH1: threadId});
    this.isOnMainFrame = Boolean(this.#traceParsedData.Renderer?.processes.get(processId)?.isOnMainFrame);
    this.threadType = type;
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
  appendTrackAtLevel(trackStartLevel: number, expanded?: boolean): number {
    if (this.#entries.length === 0) {
      return trackStartLevel;
    }
    if (this.threadType === ThreadType.RASTERIZER) {
      this.#appendRasterHeaderAndTitle(trackStartLevel, expanded);
    } else {
      this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    }
    return this.#appendThreadEntriesAtLevel(trackStartLevel);
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
  #appendTrackHeaderAtLevel(currentLevel: number, expanded?: boolean): void {
    const trackIsCollapsible = this.#entries.length > 0;
    const style = buildGroupStyle({shareHeaderLine: false, collapsible: trackIsCollapsible});
    const group = buildTrackHeader(currentLevel, this.#buildNameForTrack(), style, /* selectable= */ true, expanded);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }
  /**
   * Raster threads are rendered under a single header in the
   * flamechart. However, each thread has a unique title which needs to
   * be added to the flamechart data.
   */
  #appendRasterHeaderAndTitle(trackStartLevel: number, expanded?: boolean): void {
    if (this.#rasterIndex === 1) {
      const trackIsCollapsible = this.#entries.length > 0;
      const headerStyle = buildGroupStyle({shareHeaderLine: false, collapsible: trackIsCollapsible});
      const headerGroup =
          buildTrackHeader(trackStartLevel, this.#buildNameForTrack(), headerStyle, /* selectable= */ false, expanded);
      this.#flameChartData.groups.push(headerGroup);
    }
    // Nesting is set to 1 because the track is appended inside the
    // header for all raster threads.
    const titleStyle = buildGroupStyle({padding: 2, nestingLevel: 1, collapsible: false});
    // TODO(crbug.com/1428024) Once the thread appenders are ready to
    // be shipped, use the i18n API.
    const rasterizerTitle = `[RPP] ${i18nString(UIStrings.rasterizerThreadS, {PH1: this.#rasterIndex})}`;
    const titleGroup = buildTrackHeader(trackStartLevel, rasterizerTitle, titleStyle, /* selectable= */ true, expanded);
    this.#compatibilityBuilder.registerTrackForGroup(titleGroup, this);
  }

  #buildNameForTrack(): string {
    // This UI string doesn't yet use the i18n API because it is not
    // shown in production, only in the component server, reason being
    // it is not ready to be shipped.
    // TODO(crbug.com/1428024) Once the thread appenders are ready to
    // be shipped, use the i18n API.
    const newEnginePrefix = '[RPP] ';
    let name = newEnginePrefix;
    const url = this.#traceParsedData.Renderer?.processes.get(this.#processId)?.url || '';

    let threadTypeLabel: string|null = null;
    switch (this.threadType) {
      case ThreadType.MAIN_THREAD:
        threadTypeLabel =
            this.isOnMainFrame ? i18nString(UIStrings.mainS, {PH1: url}) : i18nString(UIStrings.frameS, {PH1: url});
        break;
      case ThreadType.WORKER:
        threadTypeLabel = this.#buildNameForWorker();
        break;
      case ThreadType.RASTERIZER:
        threadTypeLabel = i18nString(UIStrings.raster);
        break;
      case ThreadType.OTHER:
        break;
      default:
        return Platform.assertNever(this.threadType, `Unknown thread type: ${this.threadType}`);
    }
    name += threadTypeLabel || this.#threadDefaultName;
    return name;
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
  #appendThreadEntriesAtLevel(trackStartLevel: number): number {
    const newLevel = this.#compatibilityBuilder.appendEventsAtLevel(this.#entries, trackStartLevel, this);
    this.#addDecorations();
    return newLevel;
  }
  #addDecorations(): void {
    for (const entry of this.#entries) {
      const index = this.#compatibilityBuilder.indexForEvent(entry);
      if (!index) {
        continue;
      }
      const warnings = this.#traceParsedData.Warnings.perEvent.get(entry);
      if (!warnings) {
        continue;
      }
      addDecorationToEvent(this.#flameChartData, index, {type: 'WARNING_TRIANGLE'});
      if (!warnings.includes('LONG_TASK')) {
        continue;
      }
      addDecorationToEvent(this.#flameChartData, index, {
        type: 'CANDY',
        startAtTime: TraceEngine.Handlers.ModelHandlers.Warnings.LONG_MAIN_THREAD_TASK_THRESHOLD,
      });
    }
  }

  #buildWarningElement(
      event: TraceEngine.Types.TraceEvents.TraceEventData,
      warning: TraceEngine.Handlers.ModelHandlers.Warnings.Warning): HTMLSpanElement|null {
    const duration =
        TraceEngine.Helpers.Timing.microSecondsToMilliseconds(TraceEngine.Types.Timing.MicroSeconds(event.dur || 0));
    const span = document.createElement('span');
    switch (warning) {
      case 'FORCED_STYLE':
      case 'FORCED_LAYOUT': {
        const forcedReflowLink = UI.XLink.XLink.create(
            'https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts',
            i18nString(UIStrings.forcedReflow));
        span.appendChild(i18n.i18n.getFormatLocalizedString(
            str_, UIStrings.sIsALikelyPerformanceBottleneck, {PH1: forcedReflowLink}));
        break;
      }

      case 'IDLE_CALLBACK_OVER_TIME': {
        if (!TraceEngine.Types.TraceEvents.isTraceEventFireIdleCallback(event)) {
          break;
        }
        const exceededMs =
            i18n.TimeUtilities.millisToString((duration || 0) - event.args.data['allottedMilliseconds'], true);
        span.textContent = i18nString(UIStrings.idleCallbackExecutionExtended, {PH1: exceededMs});
        break;
      }

      case 'LONG_TASK': {
        const longTaskLink =
            UI.XLink.XLink.create('https://web.dev/optimize-long-tasks/', i18nString(UIStrings.longTask));
        span.appendChild(i18n.i18n.getFormatLocalizedString(
            str_, UIStrings.sTookS,
            {PH1: longTaskLink, PH2: i18n.TimeUtilities.millisToString((duration || 0), true)}));
        break;
      }
      default: {
        return null;
      }
    }
    return span;
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
      if (event.callFrame.scriptId === '0') {
        // If we can not match this frame to a script, return the
        // generic "scripting" color.
        return DEFAULT_CATEGORY_STYLES_PALETTE.Scripting.color;
      }
      // Otherwise, return a color created based on its URL.
      return this.#colorGenerator.colorForID(event.callFrame.url);
    }
    const idForColorGeneration = this.titleForEvent(event);
    const defaultColor =
        EventStyles.get(event.name as TraceEngine.Types.TraceEvents.KnownEventName)?.categoryStyle.color;
    return defaultColor || this.#colorGenerator.colorForID(idForColorGeneration);
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): string {
    if (TraceEngine.Types.TraceEvents.isProfileCall(event)) {
      return event.callFrame.functionName || i18nString(UIStrings.anonymous);
    }
    const defaultName = EventStyles.get(event.name as TraceEngine.Types.TraceEvents.KnownEventName)?.label();
    return defaultName || event.name;
  }

  /**
   * Returns the info shown when an event added by this appender
   * is hovered in the timeline.
   */
  highlightedEntryInfo(event: TraceEngine.Types.TraceEvents.SyntheticEventWithSelfTime): HighlightedEntryInfo {
    let title = this.titleForEvent(event);
    const warnings = this.#traceParsedData.Warnings.perEvent.get(event);

    if (TraceEngine.Types.TraceEvents.isTraceEventParseHTML(event)) {
      const startLine = event.args['beginData']['startLine'];
      const endLine = event.args['endData'] && event.args['endData']['endLine'];
      const eventURL = event.args['beginData']['url'] as Platform.DevToolsPath.UrlString;
      const url = Bindings.ResourceUtils.displayNameForURL(eventURL);
      const range = (endLine !== -1 || endLine === startLine) ? `${startLine}...${endLine}` : startLine;
      title += ` - ${url} [${range}]`;
    }
    const warningElements: HTMLSpanElement[] = [];
    if (warnings) {
      for (const warning of warnings) {
        const warningElement = this.#buildWarningElement(event, warning);
        if (!warningElement) {
          continue;
        }
        warningElements.push(warningElement);
      }
    }
    return {title, formattedTime: getFormattedTime(event.dur, event.selfTime), warningElements};
  }
}
