// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 * Copyright (C) 2012 Intel Inc. All rights reserved.
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
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
// eslint-disable-next-line rulesdir/es_modules_import
import codeHighlighterStyles from '../../ui/components/code_highlighter/codeHighlighter.css.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
// eslint-disable-next-line rulesdir/es_modules_import
import imagePreviewStyles from '../../ui/legacy/components/utils/imagePreview.css.js';
import * as LegacyComponents from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import {CLSRect} from './CLSLinkifier.js';
import * as TimelineComponents from './components/components.js';
import * as Extensions from './extensions/extensions.js';
import {Tracker} from './FreshRecording.js';
import {ModificationsManager} from './ModificationsManager.js';
import {targetForEvent} from './TargetForEvent.js';
import {TimelinePanel} from './TimelinePanel.js';
import {selectionFromEvent} from './TimelineSelection.js';
import * as Utils from './utils/utils.js';

const UIStrings = {
  /**
   *@description Text that only contain a placeholder
   *@example {100ms (at 200ms)} PH1
   */
  emptyPlaceholder: '{PH1}',  // eslint-disable-line rulesdir/l10n_no_locked_or_placeholder_only_phrase
  /**
   *@description Text for timestamps of items
   */
  timestamp: 'Timestamp',
  /**
   *@description Text shown next to the interaction event's ID in the detail view.
   */
  interactionID: 'ID',
  /**
   *@description Text shown next to the interaction event's input delay time in the detail view.
   */
  inputDelay: 'Input delay',
  /**
   *@description Text shown next to the interaction event's thread processing duration in the detail view.
   */
  processingDuration: 'Processing duration',
  /**
   *@description Text shown next to the interaction event's presentation delay time in the detail view.
   */
  presentationDelay: 'Presentation delay',
  /**
   *@description Text shown when the user has selected an event that represents script compiliation.
   */
  compile: 'Compile',
  /**
   *@description Text shown when the user selects an event that represents script parsing.
   */
  parse: 'Parse',
  /**
   *@description Text with two placeholders separated by a colon
   *@example {Node removed} PH1
   *@example {div#id1} PH2
   */
  sS: '{PH1}: {PH2}',
  /**
   *@description Details text used to show the amount of data collected.
   *@example {30 MB} PH1
   */
  sCollected: '{PH1} collected',
  /**
   *@description Text used to show a URL to a script and the relevant line numbers.
   *@example {https://example.com/foo.js} PH1
   *@example {2} PH2
   *@example {4} PH3
   */
  sSs: '{PH1} [{PH2}…{PH3}]',
  /**
   *@description Text used to show a URL to a script and the starting line
   *             number - used when there is no end line number available.
   *@example {https://example.com/foo.js} PH1
   *@example {2} PH2
   */
  sSSquareBrackets: '{PH1} [{PH2}…]',
  /**
   *@description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
  /**
   *@description Text referring to the status of the browser's compilation cache.
   */
  compilationCacheStatus: 'Compilation cache status',
  /**
   *@description Text referring to the size of the browser's compiliation cache.
   */
  compilationCacheSize: 'Compilation cache size',
  /**
   *@description Text in Timeline UIUtils of the Performance panel. "Compilation
   * cache" refers to the code cache described at
   * https://v8.dev/blog/code-caching-for-devs . This label is followed by the
   * type of code cache data used, either "normal" or "full" as described in the
   * linked article.
   */
  compilationCacheKind: 'Compilation cache kind',
  /**
   *@description Text used to inform the user that the script they are looking
   *             at was loaded from the browser's cache.
   */
  scriptLoadedFromCache: 'script loaded from cache',
  /**
   *@description Text to inform the user that the script they are looking at
   *             was unable to be loaded from the browser's cache.
   */
  failedToLoadScriptFromCache: 'failed to load script from cache',
  /**
   *@description Text to inform the user that the script they are looking at was not eligible to be loaded from the browser's cache.
   */
  scriptNotEligibleToBeLoadedFromCache: 'script not eligible',
  /**
   *@description Text for the total time of something
   */
  totalTime: 'Total time',
  /**
   *@description Time of a single activity, as opposed to the total time
   */
  selfTime: 'Self time',
  /**
   *@description Label in the summary view in the Performance panel for a number which indicates how much managed memory has been reclaimed by performing Garbage Collection
   */
  collected: 'Collected',
  /**
   *@description Text for a programming function
   */
  function: 'Function',
  /**
   *@description Text for referring to the ID of a timer.
   */
  timerId: 'Timer ID',
  /**
   *@description Text for referring to a timer that has timed-out and therefore is being removed.
   */
  timeout: 'Timeout',
  /**
   *@description Text used to indicate that a timer is repeating (e.g. every X seconds) rather than a one off.
   */
  repeats: 'Repeats',
  /**
   *@description Text for referring to the ID of a callback function installed by an event.
   */
  callbackId: 'Callback ID',
  /**
   *@description Text for a module, the programming concept
   */
  module: 'Module',
  /**
   *@description Label for a group of JavaScript files
   */
  script: 'Script',
  /**
   *@description Text used to tell a user that a compilation trace event was streamed.
   */
  streamed: 'Streamed',
  /**
   *@description Text to indicate if a compilation event was eager.
   */
  eagerCompile: 'Compiling all functions eagerly',
  /**
   *@description Text to refer to the URL associated with a given event.
   */
  url: 'Url',
  /**
   *@description Text to indicate to the user the size of the cache (as a filesize - e.g. 5mb).
   */
  producedCacheSize: 'Produced cache size',
  /**
   *@description Text to indicate to the user the amount of the cache (as a filesize - e.g. 5mb) that has been used.
   */
  consumedCacheSize: 'Consumed cache size',
  /**
   *@description Title for a group of cities
   */
  location: 'Location',
  /**
   *@description Text used to show a coordinate pair (e.g. (3, 2)).
   *@example {2} PH1
   *@example {2} PH2
   */
  sSCurlyBrackets: '({PH1}, {PH2})',
  /**
   *@description Text used to indicate to the user they are looking at the physical dimensions of a shape that was drawn by the browser.
   */
  dimensions: 'Dimensions',
  /**
   *@description Text used to show the user the dimensions of a shape and indicate its area (e.g. 3x2).
   *@example {2} PH1
   *@example {2} PH2
   */
  sSDimensions: '{PH1} × {PH2}',
  /**
   *@description Related node label in Timeline UIUtils of the Performance panel
   */
  layerRoot: 'Layer root',
  /**
   *@description Related node label in Timeline UIUtils of the Performance panel
   */
  ownerElement: 'Owner element',
  /**
   *@description Text used to show the user the URL of the image they are viewing.
   */
  imageUrl: 'Image URL',
  /**
   *@description Text used to show the user that the URL they are viewing is loading a CSS stylesheet.
   */
  stylesheetUrl: 'Stylesheet URL',
  /**
   *@description Text used next to a number to show the user how many elements were affected.
   */
  elementsAffected: 'Elements affected',
  /**
   *@description Text used next to a number to show the user how many nodes required the browser to update and re-layout the page.
   */
  nodesThatNeedLayout: 'Nodes that need layout',
  /**
   *@description Text used to show the amount in a subset - e.g. "2 of 10".
   *@example {2} PH1
   *@example {10} PH2
   */
  sOfS: '{PH1} of {PH2}',
  /**
   *@description Related node label in Timeline UIUtils of the Performance panel
   */
  layoutRoot: 'Layout root',
  /**
   *@description Text used when viewing an event that can have a custom message attached.
   */
  message: 'Message',
  /**
   *@description Text used to tell the user they are viewing an event that has a function embedded in it, which is referred to as the "callback function".
   */
  callbackFunction: 'Callback function',
  /**
   *@description Text used to show the relevant range of a file - e.g. "lines 2-10".
   */
  range: 'Range',
  /**
   *@description Text used to refer to the amount of time some event or code was given to complete within.
   */
  allottedTime: 'Allotted time',
  /**
   *@description Text used to tell a user that a particular event or function was automatically run by a timeout.
   */
  invokedByTimeout: 'Invoked by timeout',
  /**
   *@description Text that refers to some types
   */
  type: 'Type',
  /**
   *@description Text for the size of something
   */
  size: 'Size',
  /**
   *@description Text for the details of something
   */
  details: 'Details',
  /**
   *@description Title in Timeline for Cumulative Layout Shifts
   */
  cumulativeLayoutShifts: 'Cumulative Layout Shifts',
  /**
   *@description Text for the link to the evolved CLS website
   */
  evolvedClsLink: 'evolved',
  /**
   *@description Warning in Timeline that CLS can cause a poor user experience. It contains a link to inform developers about the recent changes to how CLS is measured. The new CLS metric is said to have evolved from the previous version.
   *@example {Link to web.dev/metrics} PH1
   *@example {Link to web.dev/evolving-cls which will always have the text 'evolved'} PH2
   */
  sCLSInformation: '{PH1} can result in poor user experiences. It has recently {PH2}.',
  /**
   *@description Text to indicate an item is a warning
   */
  warning: 'Warning',
  /**
   *@description Title for the Timeline CLS Score
   */
  score: 'Score',
  /**
   *@description Text in Timeline for the cumulative CLS score
   */
  cumulativeScore: 'Cumulative score',
  /**
   *@description Text in Timeline for the current CLS score
   */
  currentClusterScore: 'Current cluster score',
  /**
   *@description Text in Timeline for the current CLS cluster
   */
  currentClusterId: 'Current cluster ID',
  /**
   *@description Text in Timeline for whether input happened recently
   */
  hadRecentInput: 'Had recent input',
  /**
   *@description Text in Timeline indicating that input has happened recently
   */
  yes: 'Yes',
  /**
   *@description Text in Timeline indicating that input has not happened recently
   */
  no: 'No',
  /**
   *@description Label for Cumulative Layout records, indicating where they moved from
   */
  movedFrom: 'Moved from',
  /**
   *@description Label for Cumulative Layout records, indicating where they moved to
   */
  movedTo: 'Moved to',
  /**
   *@description Text that indicates a particular HTML element or node is related to what the user is viewing.
   */
  relatedNode: 'Related node',
  /**
   *@description Text for previewing items
   */
  preview: 'Preview',
  /**
   *@description Text used to refer to the total time summed up across multiple events.
   */
  aggregatedTime: 'Aggregated time',
  /**
   *@description Text for the duration of something
   */
  duration: 'Duration',
  /**
   *@description Text for the stack trace of the initiator of something. The Initiator is the event or factor that directly triggered or precipitated a subsequent action.
   */
  initiatorStackTrace: 'Initiator stack trace',
  /**
   *@description Text for the event initiated by another one
   */
  initiatedBy: 'Initiated by',
  /**
   *@description Text for the event that is an initiator for another one
   */
  initiatorFor: 'Initiator for',
  /**
   *@description Text for the underlying data behing a specific flamechart selection. Trace events are the browser instrumentation that are emitted as JSON objects.
   */
  traceEvent: 'Trace event',
  /**
   *@description Call site stack label in Timeline UIUtils of the Performance panel
   */
  timerInstalled: 'Timer installed',
  /**
   *@description Call site stack label in Timeline UIUtils of the Performance panel
   */
  animationFrameRequested: 'Animation frame requested',
  /**
   *@description Call site stack label in Timeline UIUtils of the Performance panel
   */
  idleCallbackRequested: 'Idle callback requested',
  /**
   *@description Stack label in Timeline UIUtils of the Performance panel
   */
  recalculationForced: 'Recalculation forced',
  /**
   *@description Call site stack label in Timeline UIUtils of the Performance panel
   */
  firstLayoutInvalidation: 'First layout invalidation',
  /**
   *@description Stack label in Timeline UIUtils of the Performance panel
   */
  layoutForced: 'Layout forced',
  /**
   *@description Label in front of CSS property (eg `opacity`) being animated or a CSS animation name (eg `layer-4-fade-in-out`)
   */
  animating: 'Animating',
  /**
   *@description Label in front of reasons why a CSS animation wasn't composited (aka hardware accelerated)
   */
  compositingFailed: 'Compositing failed',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to accelerated animations being disabled. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedAcceleratedAnimationsDisabled: 'Accelerated animations disabled',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to DevTools suppressing the effect. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedEffectSuppressedByDevtools: 'Effect suppressed by DevTools ',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the animation or effect being invalid. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedInvalidAnimationOrEffect: 'Invalid animation or effect',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to an effect having unsupported timing parameters. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedEffectHasUnsupportedTimingParams: 'Effect has unsupported timing parameters',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to an effect having a composite mode which is not `replace`. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedEffectHasNonReplaceCompositeMode: 'Effect has composite mode other than "replace"',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the target being in an invalid compositing state. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTargetHasInvalidCompositingState: 'Target has invalid compositing state',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to another animation on the same target being incompatible. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTargetHasIncompatibleAnimations: 'Target has another animation which is incompatible',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the target having a CSS offset. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTargetHasCSSOffset: 'Target has CSS offset',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the animation affecting non-CSS properties. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedAnimationAffectsNonCSSProperties: 'Animation affects non-CSS properties',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the transform-related property not being able to be animated on the target. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTransformRelatedPropertyCannotBeAcceleratedOnTarget:
      'Transform-related property cannot be accelerated on target',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to a `transform` property being dependent on the size of the element itself. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTransformDependsBoxSize: 'Transform-related property depends on box size',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to a `filter` property possibly moving pixels. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedFilterRelatedPropertyMayMovePixels: 'Filter-related property may move pixels',
  /**
   * @description [ICU Syntax] Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the animated CSS property not being supported on the compositor. Shown in a table with a list of other potential failure reasons.
   * @example {height, width} properties
   */
  compositingFailedUnsupportedCSSProperty: `{propertyCount, plural,
    =1 {Unsupported CSS property: {properties}}
    other {Unsupported CSS properties: {properties}}
  }`,
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to mixing keyframe value types. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedMixedKeyframeValueTypes: 'Mixed keyframe value types',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the timeline source being in an invalid compositing state. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedTimelineSourceHasInvalidCompositingState: 'Timeline source has invalid compositing state',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the animation having no visible change. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedAnimationHasNoVisibleChange: 'Animation has no visible change',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to an effect affecting an important property. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedAffectsImportantProperty: 'Effect affects a property with !important',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to the SVG target having an independent transfrom property. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedSVGTargetHasIndependentTransformProperty: 'SVG target has independent transform property',
  /** Descriptive reason for why a user-provided animation failed to be optimized by the browser due to an unknown reason. Shown in a table with a list of other potential failure reasons.  */
  compositingFailedUnknownReason: 'Unknown Reason',

  /**
   *@description Text for the execution stack trace
   */
  stackTrace: 'Stack trace',
  /**
   *@description Text used to show any invalidations for a particular event that caused the browser to have to do more work to update the page.
   * @example {2} PH1
   */
  invalidations: 'Invalidations ({PH1} total)',
  /**
   * @description Text in Timeline UIUtils of the Performance panel. Phrase is followed by a number of milliseconds.
   * Some events or tasks might have been only started, but have not ended yet. Such events or tasks are considered
   * "pending".
   */
  pendingFor: 'Pending for',
  /**
   *@description Noun label for a stack trace which indicates the first time some condition was invalidated.
   */
  firstInvalidated: 'First invalidated',
  /**
   *@description Title of the paint profiler, old name of the performance pane
   */
  paintProfiler: 'Paint profiler',
  /**
   *@description Text in Timeline Flame Chart View of the Performance panel
   *@example {Frame} PH1
   *@example {10ms} PH2
   */
  sAtS: '{PH1} at {PH2}',
  /**
   *@description Text used next to a time to indicate that the particular event took that much time itself. In context this might look like "3ms blink.console (self)"
   *@example {blink.console} PH1
   */
  sSelf: '{PH1} (self)',
  /**
   *@description Text used next to a time to indicate that the event's children took that much time. In context this might look like "3ms blink.console (children)"
   *@example {blink.console} PH1
   */
  sChildren: '{PH1} (children)',
  /**
   *@description Text used to show the user how much time the browser spent on rendering (drawing the page onto the screen).
   */
  timeSpentInRendering: 'Time spent in rendering',
  /**
   *@description Text for a rendering frame
   */
  frame: 'Frame',
  /**
   *@description Text used to refer to the duration of an event at a given offset - e.g. "2ms at 10ms" which can be read as "2ms starting after 10ms".
   *@example {10ms} PH1
   *@example {10ms} PH2
   */
  sAtSParentheses: '{PH1} (at {PH2})',
  /**
   *@description Text of a DOM element in Timeline UIUtils of the Performance panel
   */
  UnknownNode: '[ unknown node ]',
  /**
   *@description Text used to refer to a particular element and the file it was referred to in.
   *@example {node} PH1
   *@example {app.js} PH2
   */
  invalidationWithCallFrame: '{PH1} at {PH2}',
  /**
   *@description Text indicating that something is outside of the Performace Panel Timeline Minimap range
   */
  outsideBreadcrumbRange: '(outside of the breadcrumb range)',
  /**
   *@description Text indicating that something is hidden from the Performace Panel Timeline
   */
  entryIsHidden: '(entry is hidden)',
  /**
   * @description Title of a row in the details view for a `Recalculate Styles` event that contains more info about selector stats tracing.
   */
  selectorStatsTitle: 'Selector stats',
  /**
   * @description Info text that explains to the user how to enable selector stats tracing.
   * @example {Setting Name} PH1
   */
  sSelectorStatsInfo: 'Select "{PH1}" to collect detailed CSS selector matching statistics.',
  /**
   * @description Label for a description text of a metric.
   */
  description: 'Description',
  /**
   * @description Label for a numeric value that was how long to wait before a function was run.
   */
  delay: 'Delay',
  /**
   * @description Label for a string that describes the priority at which a task was scheduled, like 'background' for low-priority tasks, and 'user-blocking' for high priority.
   */
  priority: 'Priority',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineUIUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let eventDispatchDesciptors: EventDispatchTypeDescriptor[];

let colorGenerator: Common.Color.Generator;

type LinkifyLocationOptions = {
  scriptId: Protocol.Runtime.ScriptId|null,
  url: string,
  lineNumber: number,
  target: SDK.Target.Target|null,
  linkifier: LegacyComponents.Linkifier.Linkifier,
  isFreshRecording?: boolean,
  columnNumber?: number,
};

export class TimelineUIUtils {
  static frameDisplayName(frame: Protocol.Runtime.CallFrame): string {
    if (!Trace.Extras.TimelineJSProfile.TimelineJSProfileProcessor.isNativeRuntimeFrame(frame)) {
      return UI.UIUtils.beautifyFunctionName(frame.functionName);
    }
    const nativeGroup = Trace.Extras.TimelineJSProfile.TimelineJSProfileProcessor.nativeGroup(frame.functionName);
    switch (nativeGroup) {
      case Trace.Extras.TimelineJSProfile.TimelineJSProfileProcessor.NativeGroups.COMPILE:
        return i18nString(UIStrings.compile);
      case Trace.Extras.TimelineJSProfile.TimelineJSProfileProcessor.NativeGroups.PARSE:
        return i18nString(UIStrings.parse);
    }
    return frame.functionName;
  }

  static testContentMatching(
      traceEvent: Trace.Types.Events.Event, regExp: RegExp, parsedTrace?: Trace.Handlers.Types.ParsedTrace): boolean {
    const title = TimelineUIUtils.eventStyle(traceEvent).title;
    const tokens = [title];

    if (Trace.Types.Events.isProfileCall(traceEvent)) {
      // In the future this case will not be possible - wherever we call this
      // function we will be able to pass in the data from the new engine. But
      // currently this is called in a variety of places including from the
      // legacy model which does not have a reference to the new engine's data.
      // So if we are missing the data, we just fallback to the name from the
      // callFrame.
      if (!parsedTrace || !parsedTrace.Samples) {
        tokens.push(traceEvent.callFrame.functionName);
      } else {
        tokens.push(Trace.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(parsedTrace.Samples, traceEvent));
      }
    }
    if (parsedTrace) {
      const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, traceEvent);
      if (url) {
        tokens.push(url);
      }
    }
    // This works for both legacy and new engine events.
    appendObjectProperties(traceEvent.args as ContentObject, 2);
    const result = tokens.join('|').match(regExp);
    return result ? result.length > 0 : false;

    interface ContentObject {
      [x: string]: number|string|ContentObject;
    }
    function appendObjectProperties(object: ContentObject, depth: number): void {
      if (!depth) {
        return;
      }
      for (const key in object) {
        const value = object[key];
        if (typeof value === 'string') {
          tokens.push(value);
        } else if (typeof value === 'number') {
          tokens.push(String(value));
        } else if (typeof value === 'object' && value !== null) {
          appendObjectProperties(value, depth - 1);
        }
      }
    }
  }

  static eventStyle(event: Trace.Types.Events.Event): Utils.EntryStyles.TimelineRecordStyle {
    if (Trace.Types.Events.isProfileCall(event) && event.callFrame.functionName === '(idle)') {
      return new Utils.EntryStyles.TimelineRecordStyle(event.name, Utils.EntryStyles.getCategoryStyles().idle);
    }

    if (event.cat === Trace.Types.Events.Categories.Console || event.cat === Trace.Types.Events.Categories.UserTiming) {
      return new Utils.EntryStyles.TimelineRecordStyle(event.name, Utils.EntryStyles.getCategoryStyles()['scripting']);
    }

    return Utils.EntryStyles.getEventStyle(event.name as Trace.Types.Events.Name) ??
        new Utils.EntryStyles.TimelineRecordStyle(event.name, Utils.EntryStyles.getCategoryStyles().other);
  }

  static eventColor(event: Trace.Types.Events.Event): string {
    if (Trace.Types.Events.isProfileCall(event)) {
      const frame = event.callFrame;
      if (TimelineUIUtils.isUserFrame(frame)) {
        // TODO(andoli): This should use the resolved (sourcemapped) URL
        return TimelineUIUtils.colorForId(frame.url);
      }
    }
    if (Trace.Types.Extensions.isSyntheticExtensionEntry(event)) {
      return Extensions.ExtensionUI.extensionEntryColor(event);
    }
    let parsedColor = TimelineUIUtils.eventStyle(event).category.getComputedColorValue();
    // This event is considered idle time but still rendered as a scripting event here
    // to connect the StreamingCompileScriptParsing events it belongs to.
    if (event.name === Trace.Types.Events.Name.STREAMING_COMPILE_SCRIPT_WAITING) {
      parsedColor = Utils.EntryStyles.getCategoryStyles().scripting.getComputedColorValue();
      if (!parsedColor) {
        throw new Error('Unable to parse color from getCategoryStyles().scripting.color');
      }
    }
    return parsedColor;
  }

  static eventTitle(event: Trace.Types.Events.Event): string {
    // Profile call events do not have a args.data property, thus, we
    // need to check for profile calls in the beginning of this
    // function.
    if (Trace.Types.Events.isProfileCall(event)) {
      const maybeResolvedData = Utils.SourceMapsResolver.SourceMapsResolver.resolvedCodeLocationForEntry(event);
      const displayName = maybeResolvedData?.name || TimelineUIUtils.frameDisplayName(event.callFrame);
      return displayName;
    }
    if (event.name === 'EventTiming' && Trace.Types.Events.isSyntheticInteraction(event)) {
      // TODO(crbug.com/365047728): replace this entire method with this call.
      return Utils.EntryName.nameForEntry(event);
    }
    const title = TimelineUIUtils.eventStyle(event).title;
    if (Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.Console)) {
      return title;
    }
    if (Trace.Types.Events.isTimeStamp(event)) {
      return i18nString(UIStrings.sS, {PH1: title, PH2: event.args.data.message});
    }
    if (Trace.Types.Events.isAnimation(event) && event.args.data.name) {
      return i18nString(UIStrings.sS, {PH1: title, PH2: event.args.data.name});
    }
    if (Trace.Types.Events.isDispatch(event)) {
      return i18nString(UIStrings.sS, {PH1: title, PH2: event.args.data.type});
    }
    return title;
  }

  static isUserFrame(frame: Protocol.Runtime.CallFrame): boolean {
    return frame.scriptId !== '0' && !(frame.url && frame.url.startsWith('native '));
  }

  static async buildDetailsTextForTraceEvent(
      event: Trace.Types.Events.Event, parsedTrace: Trace.Handlers.Types.ParsedTrace): Promise<string|null> {
    let detailsText;

    // TODO(40287735): update this code with type-safe data checks.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsafeEventArgs = event.args as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsafeEventData = event.args?.data as Record<string, any>;

    switch (event.name) {
      case Trace.Types.Events.Name.GC:
      case Trace.Types.Events.Name.MAJOR_GC:
      case Trace.Types.Events.Name.MINOR_GC: {
        const delta = unsafeEventArgs['usedHeapSizeBefore'] - unsafeEventArgs['usedHeapSizeAfter'];
        detailsText = i18nString(UIStrings.sCollected, {PH1: i18n.ByteUtilities.bytesToString(delta)});
        break;
      }
      case Trace.Types.Events.Name.FUNCTION_CALL: {
        const {lineNumber, columnNumber} = Trace.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
        if (lineNumber !== undefined && columnNumber !== undefined) {
          detailsText = unsafeEventData.url + ':' + (lineNumber + 1) + ':' + (columnNumber + 1);
        }
        break;
      }
      case Trace.Types.Events.Name.EVENT_DISPATCH:
        detailsText = unsafeEventData ? unsafeEventData['type'] : null;
        break;
      case Trace.Types.Events.Name.PAINT: {
        const width = TimelineUIUtils.quadWidth(unsafeEventData.clip);
        const height = TimelineUIUtils.quadHeight(unsafeEventData.clip);
        if (width && height) {
          detailsText = i18nString(UIStrings.sSDimensions, {PH1: width, PH2: height});
        }
        break;
      }
      case Trace.Types.Events.Name.PARSE_HTML: {
        const startLine = unsafeEventArgs['beginData']['startLine'];
        const endLine = unsafeEventArgs['endData'] && unsafeEventArgs['endData']['endLine'];
        const url = Bindings.ResourceUtils.displayNameForURL(unsafeEventArgs['beginData']['url']);
        if (endLine >= 0) {
          detailsText = i18nString(UIStrings.sSs, {PH1: url, PH2: startLine + 1, PH3: endLine + 1});
        } else {
          detailsText = i18nString(UIStrings.sSSquareBrackets, {PH1: url, PH2: startLine + 1});
        }
        break;
      }
      case Trace.Types.Events.Name.COMPILE_MODULE:
      case Trace.Types.Events.Name.CACHE_MODULE:
        detailsText = Bindings.ResourceUtils.displayNameForURL(unsafeEventArgs['fileName']);
        break;
      case Trace.Types.Events.Name.COMPILE_SCRIPT:
      case Trace.Types.Events.Name.CACHE_SCRIPT:
      case Trace.Types.Events.Name.EVALUATE_SCRIPT: {
        const {lineNumber} = Trace.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
        const url = unsafeEventData && unsafeEventData['url'];
        if (url) {
          detailsText = Bindings.ResourceUtils.displayNameForURL(url) + ':' + ((lineNumber || 0) + 1);
        }
        break;
      }
      case Trace.Types.Events.Name.WASM_COMPILED_MODULE:
      case Trace.Types.Events.Name.WASM_MODULE_CACHE_HIT: {
        const url = unsafeEventArgs['url'];
        if (url) {
          detailsText = Bindings.ResourceUtils.displayNameForURL(url);
        }
        break;
      }

      case Trace.Types.Events.Name.STREAMING_COMPILE_SCRIPT:
      case Trace.Types.Events.Name.BACKGROUND_DESERIALIZE:
      case Trace.Types.Events.Name.XHR_READY_STATE_CHANGED:
      case Trace.Types.Events.Name.XHR_LOAD: {
        const url = unsafeEventData['url'];
        if (url) {
          detailsText = Bindings.ResourceUtils.displayNameForURL(url);
        }
        break;
      }
      case Trace.Types.Events.Name.TIME_STAMP:
        detailsText = unsafeEventData['message'];
        break;

      case Trace.Types.Events.Name.WEB_SOCKET_CREATE:
      case Trace.Types.Events.Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST:
      case Trace.Types.Events.Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST:
      case Trace.Types.Events.Name.WEB_SOCKET_SEND:
      case Trace.Types.Events.Name.WEB_SOCKET_RECEIVE:
      case Trace.Types.Events.Name.WEB_SOCKET_DESTROY:
      case Trace.Types.Events.Name.RESOURCE_WILL_SEND_REQUEST:
      case Trace.Types.Events.Name.RESOURCE_SEND_REQUEST:
      case Trace.Types.Events.Name.RESOURCE_RECEIVE_DATA:
      case Trace.Types.Events.Name.RESOURCE_RECEIVE_RESPONSE:
      case Trace.Types.Events.Name.RESOURCE_FINISH:
      case Trace.Types.Events.Name.PAINT_IMAGE:
      case Trace.Types.Events.Name.DECODE_IMAGE:
      case Trace.Types.Events.Name.DECODE_LAZY_PIXEL_REF: {
        const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, event);
        if (url) {
          detailsText = Bindings.ResourceUtils.displayNameForURL(url);
        }
        break;
      }

      case Trace.Types.Events.Name.EMBEDDER_CALLBACK:
        detailsText = unsafeEventData['callbackName'];
        break;

      case Trace.Types.Events.Name.ASYNC_TASK:
        detailsText = unsafeEventData ? unsafeEventData['name'] : null;
        break;

      default:
        if (Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.Console)) {
          detailsText = null;
        } else {
          detailsText = linkifyTopCallFrameAsText();
        }
        break;
    }

    return detailsText;

    function linkifyTopCallFrameAsText(): string|null {
      const frame = Trace.Helpers.Trace.getZeroIndexedStackTraceForEvent(event)?.at(0) ?? null;
      if (!frame) {
        return null;
      }

      return frame.url + ':' + (frame.lineNumber + 1) + ':' + (frame.columnNumber + 1);
    }
  }

  static async buildDetailsNodeForTraceEvent(
      event: Trace.Types.Events.Event, target: SDK.Target.Target|null, linkifier: LegacyComponents.Linkifier.Linkifier,
      isFreshRecording = false, parsedTrace: Trace.Handlers.Types.ParsedTrace): Promise<Node|null> {
    let details: HTMLElement|HTMLSpanElement|(Element | null)|Text|null = null;
    let detailsText;
    // TODO(40287735): update this code with type-safe data checks.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsafeEventArgs = event.args as Record<string, any>;
    // TODO(40287735): update this code with type-safe data checks.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsafeEventData = event.args?.data as Record<string, any>;

    switch (event.name) {
      case Trace.Types.Events.Name.GC:
      case Trace.Types.Events.Name.MAJOR_GC:
      case Trace.Types.Events.Name.MINOR_GC:
      case Trace.Types.Events.Name.EVENT_DISPATCH:
      case Trace.Types.Events.Name.PAINT:
      case Trace.Types.Events.Name.ANIMATION:
      case Trace.Types.Events.Name.EMBEDDER_CALLBACK:
      case Trace.Types.Events.Name.PARSE_HTML:
      case Trace.Types.Events.Name.WASM_STREAM_FROM_RESPONSE_CALLBACK:
      case Trace.Types.Events.Name.WASM_COMPILED_MODULE:
      case Trace.Types.Events.Name.WASM_MODULE_CACHE_HIT:
      case Trace.Types.Events.Name.WASM_CACHED_MODULE:
      case Trace.Types.Events.Name.WASM_MODULE_CACHE_INVALID:
      case Trace.Types.Events.Name.WEB_SOCKET_CREATE:
      case Trace.Types.Events.Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST:
      case Trace.Types.Events.Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST:
      case Trace.Types.Events.Name.WEB_SOCKET_SEND:
      case Trace.Types.Events.Name.WEB_SOCKET_RECEIVE:
      case Trace.Types.Events.Name.WEB_SOCKET_DESTROY: {
        detailsText = await TimelineUIUtils.buildDetailsTextForTraceEvent(event, parsedTrace);
        break;
      }

      case Trace.Types.Events.Name.PAINT_IMAGE:
      case Trace.Types.Events.Name.DECODE_IMAGE:
      case Trace.Types.Events.Name.DECODE_LAZY_PIXEL_REF:
      case Trace.Types.Events.Name.XHR_READY_STATE_CHANGED:
      case Trace.Types.Events.Name.XHR_LOAD:
      case Trace.Types.Events.Name.RESOURCE_WILL_SEND_REQUEST:
      case Trace.Types.Events.Name.RESOURCE_SEND_REQUEST:
      case Trace.Types.Events.Name.RESOURCE_RECEIVE_DATA:
      case Trace.Types.Events.Name.RESOURCE_RECEIVE_RESPONSE:
      case Trace.Types.Events.Name.RESOURCE_FINISH: {
        const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, event);
        if (url) {
          const options = {
            tabStop: true,
            showColumnNumber: false,
            inlineFrameIndex: 0,
          };
          details = LegacyComponents.Linkifier.Linkifier.linkifyURL(url, options);
        }
        break;
      }

      case Trace.Types.Events.Name.FUNCTION_CALL: {
        details = document.createElement('span');

        // FunctionCall events have an args.data that could be a CallFrame, if all the details are present, so we check for that.
        if (Trace.Types.Events.isFunctionCall(event) && event.args.data &&
            Trace.Types.Events.objectIsCallFrame(event.args.data)) {
          UI.UIUtils.createTextChild(
              details,
              TimelineUIUtils.frameDisplayName(
                  {...event.args.data, scriptId: String(event.args.data.scriptId) as Protocol.Runtime.ScriptId}));
        }
        const {lineNumber, columnNumber} = Trace.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
        const location = this.linkifyLocation({
          scriptId: unsafeEventData['scriptId'],
          url: unsafeEventData['url'],
          lineNumber: lineNumber || 0,
          columnNumber,
          target,
          isFreshRecording,
          linkifier,
        });
        if (location) {
          UI.UIUtils.createTextChild(details, ' @ ');
          details.appendChild(location);
        }
        break;
      }

      case Trace.Types.Events.Name.COMPILE_MODULE:
      case Trace.Types.Events.Name.CACHE_MODULE: {
        details = this.linkifyLocation({
          scriptId: null,
          url: unsafeEventArgs['fileName'],
          lineNumber: 0,
          columnNumber: 0,
          target,
          isFreshRecording,
          linkifier,
        });
        break;
      }

      case Trace.Types.Events.Name.COMPILE_SCRIPT:
      case Trace.Types.Events.Name.CACHE_SCRIPT:
      case Trace.Types.Events.Name.EVALUATE_SCRIPT: {
        const url = unsafeEventData['url'];
        if (url) {
          const {lineNumber} = Trace.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
          details = this.linkifyLocation({
            scriptId: null,
            url,
            lineNumber: lineNumber || 0,
            columnNumber: 0,
            target,
            isFreshRecording,
            linkifier,
          });
        }
        break;
      }

      case Trace.Types.Events.Name.BACKGROUND_DESERIALIZE:
      case Trace.Types.Events.Name.STREAMING_COMPILE_SCRIPT: {
        const url = unsafeEventData['url'];
        if (url) {
          details = this.linkifyLocation(
              {scriptId: null, url, lineNumber: 0, columnNumber: 0, target, isFreshRecording, linkifier});
        }
        break;
      }
      case Trace.Types.Events.Name.PROFILE_CALL: {
        details = document.createElement('span');
        // This check is only added for convenience with the type checker.
        if (!Trace.Types.Events.isProfileCall(event)) {
          break;
        }
        const maybeResolvedData = Utils.SourceMapsResolver.SourceMapsResolver.resolvedCodeLocationForEntry(event);
        const functionName = maybeResolvedData?.name || TimelineUIUtils.frameDisplayName(event.callFrame);
        UI.UIUtils.createTextChild(details, functionName);
        const location = this.linkifyLocation({
          scriptId: event.callFrame['scriptId'],
          url: event.callFrame['url'],
          lineNumber: event.callFrame['lineNumber'],
          columnNumber: event.callFrame['columnNumber'],
          target,
          isFreshRecording,
          linkifier,
        });
        if (location) {
          UI.UIUtils.createTextChild(details, ' @ ');
          details.appendChild(location);
        }
        break;
      }

      default: {
        /**
         * Some events have a stack trace which is extracted by default at @see TimelineUIUtils.generateCauses
         * thus, we prevent extracting the stack trace again here.
         */
        if (Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.Console) ||
            Trace.Types.Events.isUserTiming(event) || Trace.Types.Extensions.isSyntheticExtensionEntry(event)) {
          detailsText = null;
        } else {
          details = this.linkifyTopCallFrame(event, target, linkifier, isFreshRecording) ?? null;
        }
        break;
      }
    }

    if (!details && detailsText) {
      details = document.createTextNode(detailsText);
    }
    return details;
  }

  static linkifyLocation(linkifyOptions: LinkifyLocationOptions): Element|null {
    const {scriptId, url, lineNumber, columnNumber, isFreshRecording, linkifier, target} = linkifyOptions;
    const options = {
      lineNumber,
      columnNumber,
      showColumnNumber: true,
      inlineFrameIndex: 0,
      className: 'timeline-details',
      tabStop: true,
    };
    if (isFreshRecording) {
      return linkifier.linkifyScriptLocation(
          target, scriptId, url as Platform.DevToolsPath.UrlString, lineNumber, options);
    }
    return LegacyComponents.Linkifier.Linkifier.linkifyURL(url as Platform.DevToolsPath.UrlString, options);
  }

  static linkifyTopCallFrame(
      event: Trace.Types.Events.Event, target: SDK.Target.Target|null, linkifier: LegacyComponents.Linkifier.Linkifier,
      isFreshRecording = false): Element|null {
    let frame = Trace.Helpers.Trace.getZeroIndexedStackTraceForEvent(event)?.[0];
    if (Trace.Types.Events.isProfileCall(event)) {
      frame = event.callFrame;
    }
    if (!frame) {
      return null;
    }
    const options = {
      className: 'timeline-details',
      tabStop: true,
      inlineFrameIndex: 0,
      showColumnNumber: true,
      columnNumber: frame.columnNumber,
      lineNumber: frame.lineNumber,
    };
    if (isFreshRecording) {
      return linkifier.maybeLinkifyConsoleCallFrame(target, frame, {showColumnNumber: true, inlineFrameIndex: 0});
    }
    return LegacyComponents.Linkifier.Linkifier.linkifyURL(frame.url as Platform.DevToolsPath.UrlString, options);
  }

  static buildDetailsNodeForMarkerEvents(event: Trace.Types.Events.MarkerEvent): HTMLElement {
    let link = 'https://web.dev/user-centric-performance-metrics/';
    let name = 'page performance metrics';
    switch (event.name) {
      case Trace.Types.Events.Name.MARK_LCP_CANDIDATE:
        link = 'https://web.dev/lcp/';
        name = 'largest contentful paint';
        break;
      case Trace.Types.Events.Name.MARK_FCP:
        link = 'https://web.dev/first-contentful-paint/';
        name = 'first contentful paint';
        break;
      default:
        break;
    }

    const html = UI.Fragment.html`<div>${
        UI.XLink.XLink.create(
            link, i18nString(UIStrings.learnMore), undefined, undefined, 'learn-more')} about ${name}.</div>`;
    return html as HTMLElement;
  }

  static buildConsumeCacheDetails(
      eventData: {
        consumedCacheSize?: number,
        cacheRejected?: boolean,
        cacheKind?: string,
      },
      contentHelper: TimelineDetailsContentHelper): void {
    if (typeof eventData.consumedCacheSize === 'number') {
      contentHelper.appendTextRow(
          i18nString(UIStrings.compilationCacheStatus), i18nString(UIStrings.scriptLoadedFromCache));
      contentHelper.appendTextRow(
          i18nString(UIStrings.compilationCacheSize), i18n.ByteUtilities.bytesToString(eventData.consumedCacheSize));
      const cacheKind = eventData.cacheKind;
      if (cacheKind) {
        contentHelper.appendTextRow(i18nString(UIStrings.compilationCacheKind), cacheKind);
      }
    } else if ('cacheRejected' in eventData && eventData['cacheRejected']) {
      // Version mismatch or similar.
      contentHelper.appendTextRow(
          i18nString(UIStrings.compilationCacheStatus), i18nString(UIStrings.failedToLoadScriptFromCache));
    } else {
      contentHelper.appendTextRow(
          i18nString(UIStrings.compilationCacheStatus), i18nString(UIStrings.scriptNotEligibleToBeLoadedFromCache));
    }
  }

  static async buildTraceEventDetails(
      parsedTrace: Trace.Handlers.Types.ParsedTrace,
      event: Trace.Types.Events.Event,
      linkifier: LegacyComponents.Linkifier.Linkifier,
      detailed: boolean,
      ): Promise<DocumentFragment> {
    const maybeTarget = targetForEvent(parsedTrace, event);
    const {duration} = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
    const selfTime = getEventSelfTime(event, parsedTrace);
    const relatedNodesMap = await Trace.Extras.FetchNodes.extractRelatedDOMNodesFromEvent(
        parsedTrace,
        event,
    );

    if (maybeTarget) {
      // @ts-ignore TODO(crbug.com/1011811): Remove symbol usage.
      if (typeof event[previewElementSymbol] === 'undefined') {
        let previewElement: (Element|null)|null = null;
        const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, event);
        if (url) {
          previewElement = await LegacyComponents.ImagePreview.ImagePreview.build(maybeTarget, url, false, {
            imageAltText: LegacyComponents.ImagePreview.ImagePreview.defaultAltTextForImageURL(url),
            precomputedFeatures: undefined,
            align: LegacyComponents.ImagePreview.Align.START,
          });
        } else if (Trace.Types.Events.isPaint(event)) {
          previewElement = await TimelineUIUtils.buildPicturePreviewContent(parsedTrace, event, maybeTarget);
        }
        // @ts-ignore TODO(crbug.com/1011811): Remove symbol usage.
        event[previewElementSymbol] = previewElement;
      }
    }

    if (Trace.Types.Events.isSyntheticLayoutShift(event)) {
      // Ensure that there are no pie charts or extended info for layout shifts.
      detailed = false;
    }

    // This message may vary per event.name;
    let relatedNodeLabel;

    const contentHelper = new TimelineDetailsContentHelper(targetForEvent(parsedTrace, event), linkifier);

    const defaultColorForEvent = this.eventColor(event);
    const isMarker = parsedTrace && isMarkerEvent(parsedTrace, event);
    const color = isMarker ? TimelineUIUtils.markerStyleForEvent(event).color : defaultColorForEvent;

    contentHelper.addSection(TimelineUIUtils.eventTitle(event), color);

    // TODO: as part of the removal of the old engine, produce a typesafe way
    // to look up args and data for events.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsafeEventArgs = event.args as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsafeEventData = event.args?.data as Record<string, any>;
    const initiator = parsedTrace.Initiators.eventToInitiator.get(event) ?? null;
    const initiatorFor = parsedTrace.Initiators.initiatorToEvents.get(event) ?? null;

    let url: Platform.DevToolsPath.UrlString|null = null;

    if (parsedTrace) {
      const warnings = TimelineComponents.DetailsView.buildWarningElementsForEvent(event, parsedTrace);
      for (const warning of warnings) {
        contentHelper.appendElementRow(i18nString(UIStrings.warning), warning, true);
      }
    }

    // Add timestamp to user timings.
    if (Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.UserTiming)) {
      const adjustedEventTimeStamp = timeStampForEventAdjustedForClosestNavigationIfPossible(
          event,
          parsedTrace,
      );
      contentHelper.appendTextRow(
          i18nString(UIStrings.timestamp), i18n.TimeUtilities.preciseMillisToString(adjustedEventTimeStamp, 1));
    }

    // Only show total time and self time for events with non-zero durations.
    if (detailed && !Number.isNaN(duration || 0) && duration !== 0) {
      contentHelper.appendTextRow(
          i18nString(UIStrings.totalTime), i18n.TimeUtilities.millisToString(duration || 0, true));
      contentHelper.appendTextRow(i18nString(UIStrings.selfTime), i18n.TimeUtilities.millisToString(selfTime, true));
    }

    if (Trace.Types.Events.isPerformanceMark(event) && event.args.data?.detail) {
      const detailContainer = TimelineUIUtils.renderObjectJson(JSON.parse(event.args.data?.detail));
      contentHelper.appendElementRow(i18nString(UIStrings.details), detailContainer);
    }
    if (Trace.Types.Events.isSyntheticUserTiming(event) && event.args?.data?.beginEvent.args.detail) {
      const detailContainer = TimelineUIUtils.renderObjectJson(JSON.parse(event.args?.data?.beginEvent.args.detail));
      contentHelper.appendElementRow(i18nString(UIStrings.details), detailContainer);
    }

    if (parsedTrace.Meta.traceIsGeneric) {
      TimelineUIUtils.renderEventJson(event, contentHelper);
      return contentHelper.fragment;
    }

    if (Trace.Types.Events.isV8Compile(event)) {
      url = event.args.data?.url as Platform.DevToolsPath.UrlString;
      if (url) {
        const {lineNumber, columnNumber} = Trace.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
        contentHelper.appendLocationRow(i18nString(UIStrings.script), url, lineNumber || 0, columnNumber);
      }
      const isEager = Boolean(event.args.data?.eager);
      if (isEager) {
        contentHelper.appendTextRow(i18nString(UIStrings.eagerCompile), true);
      }

      const isStreamed = Boolean(event.args.data?.streamed);
      contentHelper.appendTextRow(
          i18nString(UIStrings.streamed),
          isStreamed + (isStreamed ? '' : `: ${event.args.data?.notStreamedReason || ''}`));
      if (event.args.data) {
        TimelineUIUtils.buildConsumeCacheDetails(event.args.data, contentHelper);
      }
    }

    if (Trace.Types.Extensions.isSyntheticExtensionEntry(event)) {
      for (const [key, value] of event.args.properties || []) {
        contentHelper.appendTextRow(key, value);
      }
    }

    if (Trace.Types.Events.isSyntheticServerTiming(event) && event.args.data.desc) {
      contentHelper.appendTextRow(i18nString(UIStrings.description), event.args.data.desc);
    }

    const isFreshRecording = Boolean(parsedTrace && Tracker.instance().recordingIsFresh(parsedTrace));

    switch (event.name) {
      case Trace.Types.Events.Name.GC:
      case Trace.Types.Events.Name.MAJOR_GC:
      case Trace.Types.Events.Name.MINOR_GC: {
        const delta = unsafeEventArgs['usedHeapSizeBefore'] - unsafeEventArgs['usedHeapSizeAfter'];
        contentHelper.appendTextRow(i18nString(UIStrings.collected), i18n.ByteUtilities.bytesToString(delta));
        break;
      }

      case Trace.Types.Events.Name.PROFILE_CALL:
      case Trace.Types.Events.Name.FUNCTION_CALL: {
        const detailsNode = await TimelineUIUtils.buildDetailsNodeForTraceEvent(
            event, targetForEvent(parsedTrace, event), linkifier, isFreshRecording, parsedTrace);
        if (detailsNode) {
          contentHelper.appendElementRow(i18nString(UIStrings.function), detailsNode);
        }
        break;
      }

      case Trace.Types.Events.Name.TIMER_FIRE:
      case Trace.Types.Events.Name.TIMER_INSTALL:
      case Trace.Types.Events.Name.TIMER_REMOVE: {
        contentHelper.appendTextRow(i18nString(UIStrings.timerId), unsafeEventData.timerId);

        if (event.name === Trace.Types.Events.Name.TIMER_INSTALL) {
          contentHelper.appendTextRow(
              i18nString(UIStrings.timeout), i18n.TimeUtilities.millisToString(unsafeEventData['timeout']));
          contentHelper.appendTextRow(i18nString(UIStrings.repeats), !unsafeEventData['singleShot']);
        }
        break;
      }

      case Trace.Types.Events.Name.SCHEDULE_POST_TASK_CALLBACK:
      case Trace.Types.Events.Name.RUN_POST_TASK_CALLBACK: {
        contentHelper.appendTextRow(
            i18nString(UIStrings.delay), i18n.TimeUtilities.millisToString(unsafeEventData['delay']));
        contentHelper.appendTextRow(i18nString(UIStrings.priority), unsafeEventData['priority']);
        break;
      }

      case Trace.Types.Events.Name.FIRE_ANIMATION_FRAME: {
        contentHelper.appendTextRow(i18nString(UIStrings.callbackId), unsafeEventData['id']);
        break;
      }

      case Trace.Types.Events.Name.COMPILE_MODULE: {
        contentHelper.appendLocationRow(i18nString(UIStrings.module), unsafeEventArgs['fileName'], 0);
        break;
      }
      case Trace.Types.Events.Name.COMPILE_SCRIPT: {
        // This case is handled above
        break;
      }

      case Trace.Types.Events.Name.CACHE_MODULE: {
        url = unsafeEventData && unsafeEventData['url'] as Platform.DevToolsPath.UrlString;
        contentHelper.appendTextRow(
            i18nString(UIStrings.compilationCacheSize),
            i18n.ByteUtilities.bytesToString(unsafeEventData['producedCacheSize']));
        break;
      }

      case Trace.Types.Events.Name.CACHE_SCRIPT: {
        url = unsafeEventData && unsafeEventData['url'] as Platform.DevToolsPath.UrlString;
        if (url) {
          const {lineNumber, columnNumber} = Trace.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
          contentHelper.appendLocationRow(i18nString(UIStrings.script), url, lineNumber || 0, columnNumber);
        }
        contentHelper.appendTextRow(
            i18nString(UIStrings.compilationCacheSize),
            i18n.ByteUtilities.bytesToString(unsafeEventData['producedCacheSize']));
        break;
      }

      case Trace.Types.Events.Name.EVALUATE_SCRIPT: {
        url = unsafeEventData && unsafeEventData['url'] as Platform.DevToolsPath.UrlString;
        if (url) {
          const {lineNumber, columnNumber} = Trace.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
          contentHelper.appendLocationRow(i18nString(UIStrings.script), url, lineNumber || 0, columnNumber);
        }
        break;
      }

      case Trace.Types.Events.Name.WASM_STREAM_FROM_RESPONSE_CALLBACK:
      case Trace.Types.Events.Name.WASM_COMPILED_MODULE:
      case Trace.Types.Events.Name.WASM_CACHED_MODULE:
      case Trace.Types.Events.Name.WASM_MODULE_CACHE_HIT:
      case Trace.Types.Events.Name.WASM_MODULE_CACHE_INVALID: {
        if (unsafeEventData) {
          url = unsafeEventArgs['url'] as Platform.DevToolsPath.UrlString;
          if (url) {
            contentHelper.appendTextRow(i18nString(UIStrings.url), url);
          }
          const producedCachedSize = unsafeEventArgs['producedCachedSize'];
          if (producedCachedSize) {
            contentHelper.appendTextRow(i18nString(UIStrings.producedCacheSize), producedCachedSize);
          }
          const consumedCachedSize = unsafeEventArgs['consumedCachedSize'];
          if (consumedCachedSize) {
            contentHelper.appendTextRow(i18nString(UIStrings.consumedCacheSize), consumedCachedSize);
          }
        }
        break;
      }

      // @ts-ignore Fall-through intended.
      case Trace.Types.Events.Name.PAINT: {
        const clip = unsafeEventData['clip'];
        contentHelper.appendTextRow(
            i18nString(UIStrings.location), i18nString(UIStrings.sSCurlyBrackets, {PH1: clip[0], PH2: clip[1]}));
        const clipWidth = TimelineUIUtils.quadWidth(clip);
        const clipHeight = TimelineUIUtils.quadHeight(clip);
        contentHelper.appendTextRow(
            i18nString(UIStrings.dimensions), i18nString(UIStrings.sSDimensions, {PH1: clipWidth, PH2: clipHeight}));
      }

      case Trace.Types.Events.Name.PAINT_SETUP:
      case Trace.Types.Events.Name.RASTERIZE:
      case Trace.Types.Events.Name.SCROLL_LAYER: {
        relatedNodeLabel = i18nString(UIStrings.layerRoot);
        break;
      }

      case Trace.Types.Events.Name.PAINT_IMAGE:
      case Trace.Types.Events.Name.DECODE_LAZY_PIXEL_REF:
      case Trace.Types.Events.Name.DECODE_IMAGE:
      case Trace.Types.Events.Name.DRAW_LAZY_PIXEL_REF: {
        relatedNodeLabel = i18nString(UIStrings.ownerElement);
        url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, event);
        if (url) {
          const options = {
            tabStop: true,
            showColumnNumber: false,
            inlineFrameIndex: 0,
          };
          contentHelper.appendElementRow(
              i18nString(UIStrings.imageUrl), LegacyComponents.Linkifier.Linkifier.linkifyURL(url, options));
        }
        break;
      }

      case Trace.Types.Events.Name.PARSE_AUTHOR_STYLE_SHEET: {
        url = unsafeEventData['styleSheetUrl'] as Platform.DevToolsPath.UrlString;
        if (url) {
          const options = {
            tabStop: true,
            showColumnNumber: false,
            inlineFrameIndex: 0,
          };
          contentHelper.appendElementRow(
              i18nString(UIStrings.stylesheetUrl), LegacyComponents.Linkifier.Linkifier.linkifyURL(url, options));
        }
        break;
      }

      case Trace.Types.Events.Name.UPDATE_LAYOUT_TREE: {
        contentHelper.appendTextRow(i18nString(UIStrings.elementsAffected), unsafeEventArgs['elementCount']);

        const selectorStatsSetting =
            Common.Settings.Settings.instance().createSetting('timeline-capture-selector-stats', false);
        if (!selectorStatsSetting.get()) {
          const note = document.createElement('span');
          note.textContent = i18nString(UIStrings.sSelectorStatsInfo, {PH1: selectorStatsSetting.title()});
          contentHelper.appendElementRow(i18nString(UIStrings.selectorStatsTitle), note);
        }

        break;
      }

      case Trace.Types.Events.Name.LAYOUT: {
        const beginData = unsafeEventArgs['beginData'];
        contentHelper.appendTextRow(
            i18nString(UIStrings.nodesThatNeedLayout),
            i18nString(UIStrings.sOfS, {PH1: beginData['dirtyObjects'], PH2: beginData['totalObjects']}));
        relatedNodeLabel = i18nString(UIStrings.layoutRoot);
        break;
      }

      case Trace.Types.Events.Name.CONSOLE_TIME: {
        contentHelper.appendTextRow(i18nString(UIStrings.message), event.name);
        break;
      }

      case Trace.Types.Events.Name.WEB_SOCKET_CREATE:
      case Trace.Types.Events.Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST:
      case Trace.Types.Events.Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST:
      case Trace.Types.Events.Name.WEB_SOCKET_SEND:
      case Trace.Types.Events.Name.WEB_SOCKET_RECEIVE:
      case Trace.Types.Events.Name.WEB_SOCKET_DESTROY: {
        if (Trace.Types.Events.isWebSocketTraceEvent(event)) {
          const rows = TimelineComponents.DetailsView.buildRowsForWebSocketEvent(event, parsedTrace);
          for (const {key, value} of rows) {
            contentHelper.appendTextRow(key, value);
          }
        }
        break;
      }

      case Trace.Types.Events.Name.EMBEDDER_CALLBACK: {
        contentHelper.appendTextRow(i18nString(UIStrings.callbackFunction), unsafeEventData['callbackName']);
        break;
      }

      case Trace.Types.Events.Name.ANIMATION: {
        if (!Trace.Types.Events.isSyntheticAnimation(event)) {
          break;
        }
        const {displayName, nodeName} = event.args.data.beginEvent.args.data;
        displayName && contentHelper.appendTextRow(i18nString(UIStrings.animating), displayName);
        // If relatedNodes is empty (maybe saved trace), then print the text description of the DOM node.
        if (!relatedNodesMap?.size && nodeName) {
          contentHelper.appendTextRow(i18nString(UIStrings.relatedNode), nodeName);
        }

        const CLSInsight = Trace.Insights.Models.CLSCulprits;
        const failures = CLSInsight.getNonCompositedFailure(event);
        if (!failures.length) {
          break;
        }

        const failureReasons = new Set(failures.map(f => f.failureReasons).flat().filter(Boolean));
        const unsupportedProperties =
            new Set(failures.map(f => f.unsupportedProperties).flat().filter(Boolean)) as Set<string>;

        // The failureReasons can be empty when Blink added a new failure reason that is
        // not supported by DevTools yet
        if (failureReasons.size === 0) {
          contentHelper.appendElementRow(
              i18nString(UIStrings.compositingFailed), i18nString(UIStrings.compositingFailedUnknownReason), true);
        } else {
          for (const reason of failureReasons) {
            let str;
            switch (reason) {
              case CLSInsight.AnimationFailureReasons.ACCELERATED_ANIMATIONS_DISABLED:
                str = i18nString(UIStrings.compositingFailedAcceleratedAnimationsDisabled);
                break;
              case CLSInsight.AnimationFailureReasons.EFFECT_SUPPRESSED_BY_DEVTOOLS:
                str = i18nString(UIStrings.compositingFailedEffectSuppressedByDevtools);
                break;
              case CLSInsight.AnimationFailureReasons.INVALID_ANIMATION_OR_EFFECT:
                str = i18nString(UIStrings.compositingFailedInvalidAnimationOrEffect);
                break;
              case CLSInsight.AnimationFailureReasons.EFFECT_HAS_UNSUPPORTED_TIMING_PARAMS:
                str = i18nString(UIStrings.compositingFailedEffectHasUnsupportedTimingParams);
                break;
              case CLSInsight.AnimationFailureReasons.EFFECT_HAS_NON_REPLACE_COMPOSITE_MODE:
                str = i18nString(UIStrings.compositingFailedEffectHasNonReplaceCompositeMode);
                break;
              case CLSInsight.AnimationFailureReasons.TARGET_HAS_INVALID_COMPOSITING_STATE:
                str = i18nString(UIStrings.compositingFailedTargetHasInvalidCompositingState);
                break;
              case CLSInsight.AnimationFailureReasons.TARGET_HAS_INCOMPATIBLE_ANIMATIONS:
                str = i18nString(UIStrings.compositingFailedTargetHasIncompatibleAnimations);
                break;
              case CLSInsight.AnimationFailureReasons.TARGET_HAS_CSS_OFFSET:
                str = i18nString(UIStrings.compositingFailedTargetHasCSSOffset);
                break;
              case CLSInsight.AnimationFailureReasons.ANIMATION_AFFECTS_NON_CSS_PROPERTIES:
                str = i18nString(UIStrings.compositingFailedAnimationAffectsNonCSSProperties);
                break;
              case CLSInsight.AnimationFailureReasons.TRANSFORM_RELATED_PROPERTY_CANNOT_BE_ACCELERATED_ON_TARGET:
                str = i18nString(UIStrings.compositingFailedTransformRelatedPropertyCannotBeAcceleratedOnTarget);
                break;
              case CLSInsight.AnimationFailureReasons.TRANSFROM_BOX_SIZE_DEPENDENT:
                str = i18nString(UIStrings.compositingFailedTransformDependsBoxSize);
                break;
              case CLSInsight.AnimationFailureReasons.FILTER_RELATED_PROPERTY_MAY_MOVE_PIXELS:
                str = i18nString(UIStrings.compositingFailedFilterRelatedPropertyMayMovePixels);
                break;
              case CLSInsight.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY:
                str = i18nString(UIStrings.compositingFailedUnsupportedCSSProperty, {
                  propertyCount: unsupportedProperties.size,
                  properties: new Intl.ListFormat(undefined, {style: 'short', type: 'conjunction'})
                                  .format(unsupportedProperties),
                });
                break;
              case CLSInsight.AnimationFailureReasons.MIXED_KEYFRAME_VALUE_TYPES:
                str = i18nString(UIStrings.compositingFailedMixedKeyframeValueTypes);
                break;
              case CLSInsight.AnimationFailureReasons.TIMELINE_SOURCE_HAS_INVALID_COMPOSITING_STATE:
                str = i18nString(UIStrings.compositingFailedTimelineSourceHasInvalidCompositingState);
                break;
              case CLSInsight.AnimationFailureReasons.ANIMATION_HAS_NO_VISIBLE_CHANGE:
                str = i18nString(UIStrings.compositingFailedAnimationHasNoVisibleChange);
                break;
              case CLSInsight.AnimationFailureReasons.AFFECTS_IMPORTANT_PROPERTY:
                str = i18nString(UIStrings.compositingFailedAffectsImportantProperty);
                break;
              case CLSInsight.AnimationFailureReasons.SVG_TARGET_HAS_INDEPENDENT_TRANSFORM_PROPERTY:
                str = i18nString(UIStrings.compositingFailedSVGTargetHasIndependentTransformProperty);
                break;
              default:
                // We should never actually end up here, as adding a new AnimationFailureReason
                // should also require adding a UIString that describes it
                str = i18nString(UIStrings.compositingFailedUnknownReason);
                break;
            }
            str && contentHelper.appendElementRow(i18nString(UIStrings.compositingFailed), str, true);
          }
        }

        break;
      }

      case Trace.Types.Events.Name.PARSE_HTML: {
        const beginData = unsafeEventArgs['beginData'];
        const startLine = beginData['startLine'] - 1;
        const endLine = unsafeEventArgs['endData'] ? unsafeEventArgs['endData']['endLine'] - 1 : undefined;
        url = beginData['url'];
        if (url) {
          contentHelper.appendLocationRange(i18nString(UIStrings.range), url, startLine, endLine);
        }
        break;
      }

      // @ts-ignore Fall-through intended.
      case Trace.Types.Events.Name.FIRE_IDLE_CALLBACK: {
        contentHelper.appendTextRow(
            i18nString(UIStrings.allottedTime),
            i18n.TimeUtilities.millisToString(unsafeEventData['allottedMilliseconds']));
        contentHelper.appendTextRow(i18nString(UIStrings.invokedByTimeout), unsafeEventData['timedOut']);
      }

      case Trace.Types.Events.Name.REQUEST_IDLE_CALLBACK:
      case Trace.Types.Events.Name.CANCEL_IDLE_CALLBACK: {
        contentHelper.appendTextRow(i18nString(UIStrings.callbackId), unsafeEventData['id']);
        break;
      }

      case Trace.Types.Events.Name.EVENT_DISPATCH: {
        contentHelper.appendTextRow(i18nString(UIStrings.type), unsafeEventData['type']);
        break;
      }

      // @ts-ignore Fall-through intended.
      case Trace.Types.Events.Name.MARK_LCP_CANDIDATE: {
        contentHelper.appendTextRow(i18nString(UIStrings.type), String(unsafeEventData['type']));
        contentHelper.appendTextRow(i18nString(UIStrings.size), String(unsafeEventData['size']));
      }

      case Trace.Types.Events.Name.MARK_FIRST_PAINT:
      case Trace.Types.Events.Name.MARK_FCP:
      case Trace.Types.Events.Name.MARK_LOAD:
      case Trace.Types.Events.Name.MARK_DOM_CONTENT: {
        const adjustedEventTimeStamp = timeStampForEventAdjustedForClosestNavigationIfPossible(
            event,
            parsedTrace,
        );

        contentHelper.appendTextRow(
            i18nString(UIStrings.timestamp), i18n.TimeUtilities.preciseMillisToString(adjustedEventTimeStamp, 1));

        if (Trace.Types.Events.isMarkerEvent(event)) {
          contentHelper.appendElementRow(
              i18nString(UIStrings.details), TimelineUIUtils.buildDetailsNodeForMarkerEvents(event));
        }

        break;
      }

      case Trace.Types.Events.Name.EVENT_TIMING: {
        const detailsNode = await TimelineUIUtils.buildDetailsNodeForTraceEvent(
            event, targetForEvent(parsedTrace, event), linkifier, isFreshRecording, parsedTrace);
        if (detailsNode) {
          contentHelper.appendElementRow(i18nString(UIStrings.details), detailsNode);
        }
        if (Trace.Types.Events.isSyntheticInteraction(event)) {
          const inputDelay = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(event.inputDelay);
          const mainThreadTime = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(event.mainThreadHandling);
          const presentationDelay = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(event.presentationDelay);
          contentHelper.appendTextRow(i18nString(UIStrings.interactionID), event.interactionId);
          contentHelper.appendTextRow(i18nString(UIStrings.inputDelay), inputDelay);
          contentHelper.appendTextRow(i18nString(UIStrings.processingDuration), mainThreadTime);
          contentHelper.appendTextRow(i18nString(UIStrings.presentationDelay), presentationDelay);
        }
        break;
      }

      case Trace.Types.Events.Name.LAYOUT_SHIFT: {
        if (!Trace.Types.Events.isSyntheticLayoutShift(event)) {
          console.error('Unexpected type for LayoutShift event');
          break;
        }
        const layoutShift = event as Trace.Types.Events.SyntheticLayoutShift;
        const layoutShiftEventData = layoutShift.args.data;
        const warning = document.createElement('span');
        const clsLink = UI.XLink.XLink.create(
            'https://web.dev/cls/', i18nString(UIStrings.cumulativeLayoutShifts), undefined, undefined,
            'cumulative-layout-shifts');
        const evolvedClsLink = UI.XLink.XLink.create(
            'https://web.dev/evolving-cls/', i18nString(UIStrings.evolvedClsLink), undefined, undefined, 'evolved-cls');

        warning.appendChild(
            i18n.i18n.getFormatLocalizedString(str_, UIStrings.sCLSInformation, {PH1: clsLink, PH2: evolvedClsLink}));
        contentHelper.appendElementRow(i18nString(UIStrings.warning), warning, true);
        if (!layoutShiftEventData) {
          break;
        }
        contentHelper.appendTextRow(
            i18nString(UIStrings.score), layoutShiftEventData.weighted_score_delta.toPrecision(4));
        contentHelper.appendTextRow(
            i18nString(UIStrings.cumulativeScore), layoutShiftEventData['cumulative_score'].toPrecision(4));
        contentHelper.appendTextRow(
            i18nString(UIStrings.currentClusterId), layoutShift.parsedData.sessionWindowData.id);
        contentHelper.appendTextRow(
            i18nString(UIStrings.currentClusterScore),
            layoutShift.parsedData.sessionWindowData.cumulativeWindowScore.toPrecision(4));
        contentHelper.appendTextRow(
            i18nString(UIStrings.hadRecentInput),
            unsafeEventData['had_recent_input'] ? i18nString(UIStrings.yes) : i18nString(UIStrings.no));

        for (const impactedNode of unsafeEventData['impacted_nodes']) {
          const oldRect = new CLSRect(impactedNode['old_rect']);
          const newRect = new CLSRect(impactedNode['new_rect']);

          const linkedOldRect = await Common.Linkifier.Linkifier.linkify(oldRect);
          const linkedNewRect = await Common.Linkifier.Linkifier.linkify(newRect);

          contentHelper.appendElementRow(i18nString(UIStrings.movedFrom), linkedOldRect);
          contentHelper.appendElementRow(i18nString(UIStrings.movedTo), linkedNewRect);
        }

        break;
      }

      default: {
        const detailsNode = await TimelineUIUtils.buildDetailsNodeForTraceEvent(
            event, targetForEvent(parsedTrace, event), linkifier, isFreshRecording, parsedTrace);
        if (detailsNode) {
          contentHelper.appendElementRow(i18nString(UIStrings.details), detailsNode);
        }
        break;
      }
    }
    const relatedNodes = relatedNodesMap?.values() || [];
    for (const relatedNode of relatedNodes) {
      if (relatedNode) {
        const nodeSpan = await Common.Linkifier.Linkifier.linkify(relatedNode);
        contentHelper.appendElementRow(relatedNodeLabel || i18nString(UIStrings.relatedNode), nodeSpan);
      }
    }

    // @ts-ignore TODO(crbug.com/1011811): Remove symbol usage.
    if (event[previewElementSymbol]) {
      contentHelper.addSection(i18nString(UIStrings.preview));
      // @ts-ignore TODO(crbug.com/1011811): Remove symbol usage.
      contentHelper.appendElementRow('', event[previewElementSymbol]);
    }

    const stackTrace = Trace.Helpers.Trace.getZeroIndexedStackTraceForEvent(event);
    if (initiator || initiatorFor || stackTrace || parsedTrace?.Invalidations.invalidationsForEvent.get(event)) {
      await TimelineUIUtils.generateCauses(event, contentHelper, parsedTrace);
    }

    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_DEBUG_MODE)) {
      TimelineUIUtils.renderEventJson(event, contentHelper);
    }

    const stats: {
      [x: string]: number,
    } = {};
    const showPieChart =
        detailed && parsedTrace && TimelineUIUtils.aggregatedStatsForTraceEvent(stats, parsedTrace, event);
    if (showPieChart) {
      contentHelper.addSection(i18nString(UIStrings.aggregatedTime));
      const pieChart = TimelineUIUtils.generatePieChart(stats, TimelineUIUtils.eventStyle(event).category, selfTime);
      contentHelper.appendElementRow('', pieChart);
    }

    return contentHelper.fragment;
  }

  static statsForTimeRange(
      events: Trace.Types.Events.Event[], startTime: Trace.Types.Timing.MilliSeconds,
      endTime: Trace.Types.Timing.MilliSeconds): {
    [x: string]: number,
  } {
    if (!events.length) {
      return {idle: endTime - startTime};
    }

    buildRangeStatsCacheIfNeeded(events);
    const aggregatedStats = subtractStats(aggregatedStatsAtTime(endTime), aggregatedStatsAtTime(startTime));
    const aggregatedTotal = Object.values(aggregatedStats).reduce((a, b) => a + b, 0);
    aggregatedStats['idle'] = Math.max(0, endTime - startTime - aggregatedTotal);
    return aggregatedStats;

    function aggregatedStatsAtTime(time: number): {
      [x: string]: number,
    } {
      const stats: {
        [x: string]: number,
      } = {};
      // @ts-ignore TODO(crbug.com/1011811): Remove symbol usage.
      const cache = events[categoryBreakdownCacheSymbol];
      for (const category in cache) {
        const categoryCache = cache[category];
        const index =
            Platform.ArrayUtilities.upperBound(categoryCache.time, time, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
        let value;
        if (index === 0) {
          value = 0;
        } else if (index === categoryCache.time.length) {
          value = categoryCache.value[categoryCache.value.length - 1];
        } else {
          const t0 = categoryCache.time[index - 1];
          const t1 = categoryCache.time[index];
          const v0 = categoryCache.value[index - 1];
          const v1 = categoryCache.value[index];
          value = v0 + (v1 - v0) * (time - t0) / (t1 - t0);
        }
        stats[category] = value;
      }
      return stats;
    }

    function subtractStats(
        a: {
          [x: string]: number,
        },
        b: {
          [x: string]: number,
        }): {
      [x: string]: number,
    } {
      const result = Object.assign({}, a);
      for (const key in b) {
        result[key] -= b[key];
      }
      return result;
    }

    function buildRangeStatsCacheIfNeeded(events: Trace.Types.Events.Event[]): void {
      // @ts-ignore TODO(crbug.com/1011811): Remove symbol usage.
      if (events[categoryBreakdownCacheSymbol]) {
        return;
      }

      // aggeregatedStats is a map by categories. For each category there's an array
      // containing sorted time points which records accumulated value of the category.
      const aggregatedStats: {
        [x: string]: {
          time: number[],
          value: number[],
        },
      } = {};
      const categoryStack: string[] = [];
      let lastTime = 0;
      Trace.Helpers.Trace.forEachEvent(events, {
        onStartEvent,
        onEndEvent,
      });

      function updateCategory(category: string, time: number): void {
        let statsArrays: {
          time: number[],
          value: number[],
        } = aggregatedStats[category];
        if (!statsArrays) {
          statsArrays = {time: [], value: []};
          aggregatedStats[category] = statsArrays;
        }
        if (statsArrays.time.length && statsArrays.time[statsArrays.time.length - 1] === time || lastTime > time) {
          return;
        }
        const lastValue = statsArrays.value.length > 0 ? statsArrays.value[statsArrays.value.length - 1] : 0;
        statsArrays.value.push(lastValue + time - lastTime);
        statsArrays.time.push(time);
      }

      function categoryChange(from: string|null, to: string|null, time: number): void {
        if (from) {
          updateCategory(from, time);
        }
        lastTime = time;
        if (to) {
          updateCategory(to, time);
        }
      }

      function onStartEvent(e: Trace.Types.Events.Event): void {
        const {startTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(e);
        const category = Utils.EntryStyles.getEventStyle(e.name as Trace.Types.Events.Name)?.category.name ||
            Utils.EntryStyles.getCategoryStyles().other.name;
        const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null;
        if (category !== parentCategory) {
          categoryChange(parentCategory || null, category, startTime);
        }
        categoryStack.push(category);
      }

      function onEndEvent(e: Trace.Types.Events.Event): void {
        const {endTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(e);
        const category = categoryStack.pop();
        const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null;
        if (category !== parentCategory) {
          categoryChange(category || null, parentCategory || null, endTime || 0);
        }
      }

      const obj = (events as Object);
      // @ts-ignore TODO(crbug.com/1011811): Remove symbol usage.
      obj[categoryBreakdownCacheSymbol] = aggregatedStats;
    }
  }

  private static renderEventJson(event: Trace.Types.Events.Event, contentHelper: TimelineDetailsContentHelper): void {
    contentHelper.addSection(i18nString(UIStrings.traceEvent));

    const eventWithArgsFirst = {
      ...{args: event.args},
      ...event,
    };
    const highlightContainer = TimelineUIUtils.renderObjectJson(eventWithArgsFirst);
    contentHelper.appendElementRow('', highlightContainer);
  }

  private static renderObjectJson(obj: Object): HTMLDivElement {
    const indentLength = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get().length;
    // Elide if the data is huge. Then remove the initial new-line for a denser UI
    const eventStr = JSON.stringify(obj, null, indentLength).slice(0, 10_000).replace(/{\n  /, '{ ');

    // Use CodeHighlighter for syntax highlighting.
    const highlightContainer = document.createElement('div');
    const shadowRoot =
        UI.UIUtils.createShadowRootWithCoreStyles(highlightContainer, {cssFile: [codeHighlighterStyles]});
    const elem = shadowRoot.createChild('div');
    elem.classList.add('monospace', 'source-code');
    elem.textContent = eventStr;
    void CodeHighlighter.CodeHighlighter.highlightNode(elem, 'text/javascript');
    return highlightContainer;
  }

  static stackTraceFromCallFrames(callFrames: Protocol.Runtime.CallFrame[]|
                                  Trace.Types.Events.CallFrame[]): Protocol.Runtime.StackTrace {
    return {callFrames} as Protocol.Runtime.StackTrace;
  }

  private static async generateCauses(
      event: Trace.Types.Events.Event, contentHelper: TimelineDetailsContentHelper,
      parsedTrace: Trace.Handlers.Types.ParsedTrace): Promise<void> {
    const {startTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
    let initiatorStackLabel = i18nString(UIStrings.initiatorStackTrace);
    let stackLabel = i18nString(UIStrings.stackTrace);

    switch (event.name) {
      case Trace.Types.Events.Name.TIMER_FIRE:
        initiatorStackLabel = i18nString(UIStrings.timerInstalled);
        break;
      case Trace.Types.Events.Name.FIRE_ANIMATION_FRAME:
        initiatorStackLabel = i18nString(UIStrings.animationFrameRequested);
        break;
      case Trace.Types.Events.Name.FIRE_IDLE_CALLBACK:
        initiatorStackLabel = i18nString(UIStrings.idleCallbackRequested);
        break;
      case Trace.Types.Events.Name.UPDATE_LAYOUT_TREE:
        initiatorStackLabel = i18nString(UIStrings.firstInvalidated);
        stackLabel = i18nString(UIStrings.recalculationForced);
        break;
      case Trace.Types.Events.Name.LAYOUT:
        initiatorStackLabel = i18nString(UIStrings.firstLayoutInvalidation);
        stackLabel = i18nString(UIStrings.layoutForced);
        break;
    }

    const stackTrace = Trace.Helpers.Trace.getZeroIndexedStackTraceForEvent(event);
    if (stackTrace && stackTrace.length) {
      contentHelper.addSection(stackLabel);
      contentHelper.createChildStackTraceElement(TimelineUIUtils.stackTraceFromCallFrames(stackTrace));
    }

    const initiator = parsedTrace.Initiators.eventToInitiator.get(event);
    const initiatorFor = parsedTrace.Initiators.initiatorToEvents.get(event);
    const invalidations = parsedTrace.Invalidations.invalidationsForEvent.get(event);

    if (initiator) {
      // If we have an initiator for the event, we can show its stack trace, a link to reveal the initiator,
      // and the time since the initiator (Pending For).
      const stackTrace = Trace.Helpers.Trace.getZeroIndexedStackTraceForEvent(initiator);
      if (stackTrace) {
        contentHelper.addSection(initiatorStackLabel);
        contentHelper.createChildStackTraceElement(TimelineUIUtils.stackTraceFromCallFrames(stackTrace.map(frame => {
          return {
            ...frame,
            scriptId: String(frame.scriptId) as Protocol.Runtime.ScriptId,
          };
        })));
      }

      const link = this.createEntryLink(initiator);
      contentHelper.appendElementRow(i18nString(UIStrings.initiatedBy), link);

      const {startTime: initiatorStartTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(initiator);
      const delay = startTime - initiatorStartTime;
      contentHelper.appendTextRow(i18nString(UIStrings.pendingFor), i18n.TimeUtilities.preciseMillisToString(delay, 1));
    }

    if (initiatorFor) {
      // If the event is an initiator for some entries, add links to reveal them.
      const links = document.createElement('div');
      initiatorFor.map((initiator, i) => {
        links.appendChild(this.createEntryLink(initiator));
        // Add space between each link if it's not last
        if (i < initiatorFor.length - 1) {
          links.append(' ');
        }
      });
      contentHelper.appendElementRow(UIStrings.initiatorFor, links);
    }

    if (invalidations && invalidations.length) {
      const totalInvalidations = parsedTrace.Invalidations.invalidationCountForEvent.get(event) ??
          0;  // Won't be 0, but saves us dealing with undefined.
      contentHelper.addSection(i18nString(UIStrings.invalidations, {PH1: totalInvalidations}));
      await TimelineUIUtils.generateInvalidationsList(invalidations, contentHelper);
    }
  }

  private static createEntryLink(entry: Trace.Types.Events.Event): HTMLElement {
    const link = document.createElement('span');

    const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();

    if (!traceBoundsState) {
      console.error('Tried to link to an entry without any traceBoundsState. This should never happen.');
      return link;
    }

    // Check is the entry is outside of the current breadcrumb. If it is, don't create a link to navigate to it because there is no way to navigate outside breadcrumb without removing it. Instead, just display the name and "outside breadcrumb" text
    // Consider entry outside breadcrumb only if it is fully outside. If a part of it is visible, we can still select it.
    const isEntryOutsideBreadcrumb = traceBoundsState.micro.minimapTraceBounds.min > entry.ts + (entry.dur || 0) ||
        traceBoundsState.micro.minimapTraceBounds.max < entry.ts;

    // Check if it is in the hidden array
    const isEntryHidden = ModificationsManager.activeManager()?.getEntriesFilter().entryIsInvisible(entry);

    if (!isEntryOutsideBreadcrumb) {
      link.classList.add('timeline-link');
      UI.ARIAUtils.markAsLink(link);
      link.tabIndex = 0;
      link.addEventListener('click', () => {
        TimelinePanel.instance().select(selectionFromEvent(entry));
      });

      link.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          TimelinePanel.instance().select(selectionFromEvent(entry));
          event.consume(true);
        }
      });
    }

    if (isEntryHidden) {
      link.textContent = this.eventTitle(entry) + ' ' + i18nString(UIStrings.entryIsHidden);
    } else if (isEntryOutsideBreadcrumb) {
      link.textContent = this.eventTitle(entry) + ' ' + i18nString(UIStrings.outsideBreadcrumbRange);
    } else {
      link.textContent = this.eventTitle(entry);
    }

    return link;
  }

  private static async generateInvalidationsList(
      invalidations: Trace.Types.Events.InvalidationTrackingEvent[],
      contentHelper: TimelineDetailsContentHelper): Promise<void> {
    const {groupedByReason, backendNodeIds} = TimelineComponents.DetailsView.generateInvalidationsList(invalidations);

    let relatedNodesMap: Map<number, SDK.DOMModel.DOMNode|null>|null = null;
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const domModel = target?.model(SDK.DOMModel.DOMModel);
    if (domModel) {
      relatedNodesMap = await domModel.pushNodesByBackendIdsToFrontend(backendNodeIds);
    }

    Object.keys(groupedByReason).forEach(reason => {
      TimelineUIUtils.generateInvalidationsForReason(reason, groupedByReason[reason], relatedNodesMap, contentHelper);
    });
  }

  private static generateInvalidationsForReason(
      reason: string, invalidations: Trace.Types.Events.InvalidationTrackingEvent[],
      relatedNodesMap: Map<number, SDK.DOMModel.DOMNode|null>|null, contentHelper: TimelineDetailsContentHelper): void {
    function createLinkForInvalidationNode(invalidation: Trace.Types.Events.InvalidationTrackingEvent):
        HTMLSpanElement {
      const node = (invalidation.args.data.nodeId && relatedNodesMap) ?
          relatedNodesMap.get(invalidation.args.data.nodeId) :
          null;
      if (node) {
        const nodeSpan = document.createElement('span');
        void Common.Linkifier.Linkifier.linkify(node).then(link => nodeSpan.appendChild(link));
        return nodeSpan;
      }
      if (invalidation.args.data.nodeName) {
        const nodeSpan = document.createElement('span');
        nodeSpan.textContent = invalidation.args.data.nodeName;
        return nodeSpan;
      }
      const nodeSpan = document.createElement('span');
      UI.UIUtils.createTextChild(nodeSpan, i18nString(UIStrings.UnknownNode));
      return nodeSpan;
    }

    const generatedItems = new Set<string>();

    for (const invalidation of invalidations) {
      const stackTrace = Trace.Helpers.Trace.getZeroIndexedStackTraceForEvent(invalidation);
      let scriptLink: HTMLElement|null = null;
      const callFrame = stackTrace?.at(0);
      if (callFrame) {
        scriptLink = contentHelper.linkifier()?.maybeLinkifyScriptLocation(
                         SDK.TargetManager.TargetManager.instance().rootTarget(),
                         callFrame.scriptId as Protocol.Runtime.ScriptId,
                         callFrame.url as Platform.DevToolsPath.UrlString,
                         callFrame.lineNumber,
                         ) ||
            null;
      }

      const niceNodeLink = createLinkForInvalidationNode(invalidation);

      const text = scriptLink ?
          i18n.i18n.getFormatLocalizedString(
              str_, UIStrings.invalidationWithCallFrame, {PH1: niceNodeLink, PH2: scriptLink}) as HTMLElement :
          niceNodeLink;

      // Sometimes we can get different Invalidation events which cause
      // the same text for the same element for the same reason to be
      // generated. Rather than show the user duplicates, if we have
      // generated text that looks identical to this before, we will
      // bail.
      const generatedText: string = (typeof text === 'string' ? text : text.innerText);
      if (generatedItems.has(generatedText)) {
        continue;
      }

      generatedItems.add(generatedText);
      contentHelper.appendElementRow(reason, text);
    }
  }

  private static aggregatedStatsForTraceEvent(
      total: {
        [x: string]: number,
      },
      parsedTrace: Trace.Handlers.Types.ParsedTrace, event: Trace.Types.Events.Event): boolean {
    const events = parsedTrace.Renderer?.allTraceEntries || [];
    const {startTime, endTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
    function eventComparator(startTime: number, e: Trace.Types.Events.Event): number {
      const {startTime: eventStartTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(e);
      return startTime - eventStartTime;
    }

    const index = Platform.ArrayUtilities.binaryIndexOf(events, startTime, eventComparator);
    // Not a main thread event?
    if (index < 0) {
      return false;
    }
    let hasChildren = false;
    if (endTime) {
      for (let i = index; i < events.length; i++) {
        const nextEvent = events[i];
        const {startTime: nextEventStartTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(nextEvent);
        if (nextEventStartTime >= endTime) {
          break;
        }
        const nextEventSelfTime = getEventSelfTime(nextEvent, parsedTrace);
        if (!nextEventSelfTime) {
          continue;
        }
        if (nextEvent.tid !== event.tid) {
          continue;
        }
        if (i > index) {
          hasChildren = true;
        }
        const categoryName = TimelineUIUtils.eventStyle(nextEvent).category.name;
        total[categoryName] = (total[categoryName] || 0) + nextEventSelfTime;
      }
    }
    if (Trace.Types.Events.isPhaseAsync(event.ph)) {
      if (endTime) {
        let aggregatedTotal = 0;
        for (const categoryName in total) {
          aggregatedTotal += total[categoryName];
        }
        total['idle'] = Math.max(0, endTime - startTime - aggregatedTotal);
      }
      return false;
    }
    return hasChildren;
  }

  static async buildPicturePreviewContent(
      parsedTrace: Trace.Handlers.Types.ParsedTrace, event: Trace.Types.Events.Paint,
      target: SDK.Target.Target): Promise<Element|null> {
    const snapshotEvent = parsedTrace.LayerTree.paintsToSnapshots.get(event);
    if (!snapshotEvent) {
      return null;
    }

    const paintProfilerModel = target.model(SDK.PaintProfiler.PaintProfilerModel);
    if (!paintProfilerModel) {
      return null;
    }
    const snapshot = await paintProfilerModel.loadSnapshot(snapshotEvent.args.snapshot.skp64);
    if (!snapshot) {
      return null;
    }

    const snapshotWithRect = {
      snapshot,
      rect: snapshotEvent.args.snapshot.params?.layer_rect,
    };

    if (!snapshotWithRect) {
      return null;
    }
    const imageURLPromise = snapshotWithRect.snapshot.replay();
    snapshotWithRect.snapshot.release();
    const imageURL = await imageURLPromise as Platform.DevToolsPath.UrlString;
    if (!imageURL) {
      return null;
    }
    const stylesContainer = document.createElement('div');
    const shadowRoot = stylesContainer.attachShadow({mode: 'open'});
    shadowRoot.adoptedStyleSheets = [imagePreviewStyles];
    const container = shadowRoot.createChild('div') as HTMLDivElement;
    container.classList.add('image-preview-container', 'vbox', 'link');
    const img = (container.createChild('img') as HTMLImageElement);
    img.src = imageURL;
    img.alt = LegacyComponents.ImagePreview.ImagePreview.defaultAltTextForImageURL(imageURL);
    const paintProfilerButton = container.createChild('a');
    paintProfilerButton.textContent = i18nString(UIStrings.paintProfiler);
    UI.ARIAUtils.markAsLink(container);
    container.tabIndex = 0;
    container.addEventListener('click', () => TimelinePanel.instance().select(selectionFromEvent(event)), false);
    container.addEventListener('keydown', keyEvent => {
      if (keyEvent.key === 'Enter') {
        TimelinePanel.instance().select(selectionFromEvent(event));
        keyEvent.consume(true);
      }
    });
    return stylesContainer;
  }

  static createEventDivider(event: Trace.Types.Events.Event, zeroTime: number): Element {
    const eventDivider = document.createElement('div');
    eventDivider.classList.add('resources-event-divider');
    const {startTime: eventStartTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);

    const startTime = i18n.TimeUtilities.millisToString(eventStartTime - zeroTime);
    UI.Tooltip.Tooltip.install(
        eventDivider, i18nString(UIStrings.sAtS, {PH1: TimelineUIUtils.eventTitle(event), PH2: startTime}));
    const style = TimelineUIUtils.markerStyleForEvent(event);
    if (style.tall) {
      eventDivider.style.backgroundColor = style.color;
    }
    return eventDivider;
  }

  static visibleEventsFilter(): Trace.Extras.TraceFilter.TraceFilter {
    return new Trace.Extras.TraceFilter.VisibleEventsFilter(Utils.EntryStyles.visibleTypes());
  }

  // Included only for layout tests.
  // TODO(crbug.com/1386091): Fix/port layout tests and remove.
  static categories(): Utils.EntryStyles.CategoryPalette {
    return Utils.EntryStyles.getCategoryStyles();
  }

  static generatePieChart(
      aggregatedStats: {
        [x: string]: number,
      },
      selfCategory?: Utils.EntryStyles.TimelineCategory, selfTime?: number): Element {
    let total = 0;
    for (const categoryName in aggregatedStats) {
      total += aggregatedStats[categoryName];
    }

    const element = document.createElement('div');
    element.classList.add('timeline-details-view-pie-chart-wrapper');
    element.classList.add('hbox');

    const pieChart = new PerfUI.PieChart.PieChart();
    const slices: {
      value: number,
      color: string,
      title: string,
    }[] = [];

    function appendLegendRow(name: string, title: string, value: number, color: string): void {
      if (!value) {
        return;
      }
      slices.push({value, color, title});
    }

    // In case of self time, first add self, then children of the same category.
    if (selfCategory) {
      if (selfTime) {
        appendLegendRow(
            selfCategory.name, i18nString(UIStrings.sSelf, {PH1: selfCategory.title}), selfTime,
            selfCategory.getCSSValue());
      }
      // Children of the same category.
      const categoryTime = aggregatedStats[selfCategory.name];
      const value = categoryTime - (selfTime || 0);
      if (value > 0) {
        appendLegendRow(
            selfCategory.name, i18nString(UIStrings.sChildren, {PH1: selfCategory.title}), value,
            selfCategory.getCSSValue());
      }
    }

    // Add other categories.
    for (const categoryName in Utils.EntryStyles.getCategoryStyles()) {
      const category = Utils.EntryStyles.getCategoryStyles()[categoryName as keyof Utils.EntryStyles.CategoryPalette];
      if (categoryName === selfCategory?.name) {
        // Do not add an entry for this event's self category because 2
        // entries for it where added just before this for loop (for
        // self and children times).
        continue;
      }
      appendLegendRow(category.name, category.title, aggregatedStats[category.name], category.getCSSValue());
    }

    pieChart.data = {
      chartName: i18nString(UIStrings.timeSpentInRendering),
      size: 110,
      formatter: (value: number) => i18n.TimeUtilities.preciseMillisToString(value),
      showLegend: true,
      total,
      slices,
    };
    const pieChartContainer = element.createChild('div', 'vbox');
    pieChartContainer.appendChild(pieChart);

    return element;
  }

  static generateDetailsContentForFrame(
      frame: Trace.Types.Events.LegacyTimelineFrame, filmStrip: Trace.Extras.FilmStrip.Data|null,
      filmStripFrame: Trace.Extras.FilmStrip.Frame|null): DocumentFragment {
    const contentHelper = new TimelineDetailsContentHelper(null, null);
    contentHelper.addSection(i18nString(UIStrings.frame));

    const duration = TimelineUIUtils.frameDuration(frame);
    contentHelper.appendElementRow(i18nString(UIStrings.duration), duration);
    if (filmStrip && filmStripFrame) {
      const filmStripPreview = document.createElement('div');
      filmStripPreview.classList.add('timeline-filmstrip-preview');
      // TODO(paulirish): Adopt Util.ImageCache
      void UI.UIUtils.loadImage(filmStripFrame.screenshotEvent.args.dataUri)
          .then(image => image && filmStripPreview.appendChild(image));
      contentHelper.appendElementRow('', filmStripPreview);
      filmStripPreview.addEventListener('click', frameClicked.bind(null, filmStrip, filmStripFrame), false);
    }

    function frameClicked(filmStrip: Trace.Extras.FilmStrip.Data, filmStripFrame: Trace.Extras.FilmStrip.Frame): void {
      PerfUI.FilmStripView.Dialog.fromFilmStrip(filmStrip, filmStripFrame.index);
    }

    return contentHelper.fragment;
  }

  static frameDuration(frame: Trace.Types.Events.LegacyTimelineFrame): Element {
    const offsetMilli = Trace.Helpers.Timing.microSecondsToMilliseconds(frame.startTimeOffset);
    const durationMilli = Trace.Helpers.Timing.microSecondsToMilliseconds(
        Trace.Types.Timing.MicroSeconds(frame.endTime - frame.startTime));

    const durationText = i18nString(UIStrings.sAtSParentheses, {
      PH1: i18n.TimeUtilities.millisToString(durationMilli, true),
      PH2: i18n.TimeUtilities.millisToString(offsetMilli, true),
    });
    return i18n.i18n.getFormatLocalizedString(str_, UIStrings.emptyPlaceholder, {PH1: durationText});
  }

  static quadWidth(quad: number[]): number {
    return Math.round(Math.sqrt(Math.pow(quad[0] - quad[2], 2) + Math.pow(quad[1] - quad[3], 2)));
  }

  static quadHeight(quad: number[]): number {
    return Math.round(Math.sqrt(Math.pow(quad[0] - quad[6], 2) + Math.pow(quad[1] - quad[7], 2)));
  }

  static eventDispatchDesciptors(): EventDispatchTypeDescriptor[] {
    if (eventDispatchDesciptors) {
      return eventDispatchDesciptors;
    }
    const lightOrange = 'hsl(40,100%,80%)';
    const orange = 'hsl(40,100%,50%)';
    const green = 'hsl(90,100%,40%)';
    const purple = 'hsl(256,100%,75%)';
    eventDispatchDesciptors = [
      new EventDispatchTypeDescriptor(
          1, lightOrange, ['mousemove', 'mouseenter', 'mouseleave', 'mouseout', 'mouseover']),
      new EventDispatchTypeDescriptor(
          1, lightOrange, ['pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'pointermove']),
      new EventDispatchTypeDescriptor(2, green, ['wheel']),
      new EventDispatchTypeDescriptor(3, orange, ['click', 'mousedown', 'mouseup']),
      new EventDispatchTypeDescriptor(3, orange, ['touchstart', 'touchend', 'touchmove', 'touchcancel']),
      new EventDispatchTypeDescriptor(
          3, orange, ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture']),
      new EventDispatchTypeDescriptor(3, purple, ['keydown', 'keyup', 'keypress']),
    ];
    return eventDispatchDesciptors;
  }

  static markerStyleForEvent(event: Trace.Types.Events.Event): TimelineMarkerStyle {
    const tallMarkerDashStyle = [6, 4];
    const title = TimelineUIUtils.eventTitle(event);

    if (event.name !== Trace.Types.Events.Name.NAVIGATION_START &&
            Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.Console) ||
        Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.UserTiming)) {
      return {
        title,
        dashStyle: tallMarkerDashStyle,
        lineWidth: 0.5,
        color: Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.Console) ? 'purple' : 'orange',
        tall: false,
        lowPriority: false,
      };
    }
    let tall = false;
    let color = 'grey';
    switch (event.name) {
      case Trace.Types.Events.Name.NAVIGATION_START:
        color = '#FF9800';
        tall = true;
        break;
      case Trace.Types.Events.Name.FRAME_STARTED_LOADING:
        color = 'green';
        tall = true;
        break;
      case Trace.Types.Events.Name.MARK_DOM_CONTENT:
        color = '#0867CB';
        tall = true;
        break;
      case Trace.Types.Events.Name.MARK_LOAD:
        color = '#B31412';
        tall = true;
        break;
      case Trace.Types.Events.Name.MARK_FIRST_PAINT:
        color = '#228847';
        tall = true;
        break;
      case Trace.Types.Events.Name.MARK_FCP:
        color = '#1A6937';
        tall = true;
        break;
      case Trace.Types.Events.Name.MARK_LCP_CANDIDATE:
        color = '#1A3422';
        tall = true;
        break;
      case Trace.Types.Events.Name.TIME_STAMP:
        color = 'orange';
        break;
    }
    return {
      title,
      dashStyle: tallMarkerDashStyle,
      lineWidth: 0.5,
      color,
      tall,
      lowPriority: false,
    };
  }

  static colorForId(id: string): string {
    if (!colorGenerator) {
      colorGenerator =
          new Common.Color.Generator({min: 30, max: 330, count: undefined}, {min: 50, max: 80, count: 3}, 85);
      colorGenerator.setColorForID('', '#f2ecdc');
    }
    return colorGenerator.colorForID(id);
  }

  static displayNameForFrame(frame: Trace.Types.Events.TraceFrame, trimAt: number = 80): string {
    const url = frame.url as Platform.DevToolsPath.UrlString;
    return Common.ParsedURL.schemeIs(url, 'about:') ? `"${Platform.StringUtilities.trimMiddle(frame.name, trimAt)}"` :
                                                      frame.url.slice(0, trimAt);
  }
}

export const aggregatedStatsKey = Symbol('aggregatedStats');

export const previewElementSymbol = Symbol('previewElement');

export class EventDispatchTypeDescriptor {
  priority: number;
  color: string;
  eventTypes: string[];

  constructor(priority: number, color: string, eventTypes: string[]) {
    this.priority = priority;
    this.color = color;
    this.eventTypes = eventTypes;
  }
}

export class TimelineDetailsContentHelper {
  fragment: DocumentFragment;
  private linkifierInternal: LegacyComponents.Linkifier.Linkifier|null;
  private target: SDK.Target.Target|null;
  element: HTMLDivElement;
  private tableElement: HTMLElement;

  constructor(target: SDK.Target.Target|null, linkifier: LegacyComponents.Linkifier.Linkifier|null) {
    this.fragment = document.createDocumentFragment();

    this.linkifierInternal = linkifier;
    this.target = target;

    this.element = document.createElement('div');
    this.element.classList.add('timeline-details-view-block');
    this.tableElement = this.element.createChild('div', 'vbox timeline-details-chip-body');
    this.fragment.appendChild(this.element);
  }

  addSection(title: string, swatchColor?: string): void {
    if (!this.tableElement.hasChildNodes()) {
      this.element.removeChildren();
    } else {
      this.element = document.createElement('div');
      this.element.classList.add('timeline-details-view-block');
      this.fragment.appendChild(this.element);
    }

    if (title) {
      const titleElement = this.element.createChild('div', 'timeline-details-chip-title');
      if (swatchColor) {
        titleElement.createChild('div').style.backgroundColor = swatchColor;
      }
      UI.UIUtils.createTextChild(titleElement, title);
    }

    this.tableElement = this.element.createChild('div', 'vbox timeline-details-chip-body');
    this.fragment.appendChild(this.element);
  }

  linkifier(): LegacyComponents.Linkifier.Linkifier|null {
    return this.linkifierInternal;
  }

  appendTextRow(title: string, value: string|number|boolean): void {
    const rowElement = this.tableElement.createChild('div', 'timeline-details-view-row');
    rowElement.createChild('div', 'timeline-details-view-row-title').textContent = title;
    rowElement.createChild('div', 'timeline-details-view-row-value').textContent = value.toString();
  }

  appendElementRow(title: string, content: string|Node, isWarning?: boolean, isStacked?: boolean): void {
    const rowElement = this.tableElement.createChild('div', 'timeline-details-view-row');
    rowElement.setAttribute('data-row-title', title);
    if (isWarning) {
      rowElement.classList.add('timeline-details-warning');
    }
    if (isStacked) {
      rowElement.classList.add('timeline-details-stack-values');
    }
    const titleElement = rowElement.createChild('div', 'timeline-details-view-row-title');
    titleElement.textContent = title;
    const valueElement = rowElement.createChild('div', 'timeline-details-view-row-value');
    if (content instanceof Node) {
      valueElement.appendChild(content);
    } else {
      UI.UIUtils.createTextChild(valueElement, content || '');
    }
  }

  appendLocationRow(title: string, url: string, startLine: number, startColumn?: number): void {
    if (!this.linkifierInternal) {
      return;
    }

    const options = {
      tabStop: true,
      columnNumber: startColumn,
      showColumnNumber: true,
      inlineFrameIndex: 0,
    };
    const link = this.linkifierInternal.maybeLinkifyScriptLocation(
        this.target, null, url as Platform.DevToolsPath.UrlString, startLine, options);
    if (!link) {
      return;
    }
    this.appendElementRow(title, link);
  }

  appendLocationRange(title: string, url: Platform.DevToolsPath.UrlString, startLine: number, endLine?: number): void {
    if (!this.linkifierInternal || !this.target) {
      return;
    }
    const locationContent = document.createElement('span');
    const link = this.linkifierInternal.maybeLinkifyScriptLocation(
        this.target, null, url, startLine, {tabStop: true, inlineFrameIndex: 0});
    if (!link) {
      return;
    }
    locationContent.appendChild(link);
    UI.UIUtils.createTextChild(
        locationContent, Platform.StringUtilities.sprintf(' [%s…%s]', startLine + 1, (endLine || 0) + 1 || ''));
    this.appendElementRow(title, locationContent);
  }

  createChildStackTraceElement(stackTrace: Protocol.Runtime.StackTrace): void {
    if (!this.linkifierInternal) {
      return;
    }

    const stackTraceElement =
        this.tableElement.createChild('div', 'timeline-details-view-row timeline-details-stack-values');
    const callFrameContents = LegacyComponents.JSPresentationUtils.buildStackTracePreviewContents(
        this.target, this.linkifierInternal, {stackTrace, tabStops: true, showColumnNumber: true});
    stackTraceElement.appendChild(callFrameContents.element);
  }
}

export const categoryBreakdownCacheSymbol = Symbol('categoryBreakdownCache');
export interface TimelineMarkerStyle {
  title: string;
  color: string;
  lineWidth: number;
  dashStyle: number[];
  tall: boolean;
  lowPriority: boolean;
}

/**
 * Given a particular event, this method can adjust its timestamp by
 * substracting the timestamp of the previous navigation. This helps in cases
 * where the user has navigated multiple times in the trace, so that we can show
 * the LCP (for example) relative to the last navigation.
 **/
export function timeStampForEventAdjustedForClosestNavigationIfPossible(
    event: Trace.Types.Events.Event,
    parsedTrace: Trace.Handlers.Types.ParsedTrace|null): Trace.Types.Timing.MilliSeconds {
  if (!parsedTrace) {
    const {startTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
    return startTime;
  }

  const time = Trace.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(
      event,
      parsedTrace.Meta.traceBounds,
      parsedTrace.Meta.navigationsByNavigationId,
      parsedTrace.Meta.navigationsByFrameId,
  );
  return Trace.Helpers.Timing.microSecondsToMilliseconds(time);
}

/**
 * Determines if an event is potentially a marker event. A marker event here
 * is a single moment in time that we want to highlight on the timeline, such as
 * the LCP time. This method does not filter out events: for example, it treats
 * every LCP Candidate event as a potential marker event.
 **/
export function isMarkerEvent(parsedTrace: Trace.Handlers.Types.ParsedTrace, event: Trace.Types.Events.Event): boolean {
  const {Name} = Trace.Types.Events;

  if (event.name === Name.TIME_STAMP) {
    return true;
  }

  if (Trace.Types.Events.isFirstContentfulPaint(event) || Trace.Types.Events.isFirstPaint(event)) {
    return event.args.frame === parsedTrace.Meta.mainFrameId;
  }

  if (Trace.Types.Events.isMarkDOMContent(event) || Trace.Types.Events.isMarkLoad(event) ||
      Trace.Types.Events.isLargestContentfulPaintCandidate(event)) {
    // isOutermostMainFrame was added in 2022, so we fallback to isMainFrame
    // for older traces.
    if (!event.args.data) {
      return false;
    }
    const {isOutermostMainFrame, isMainFrame} = event.args.data;
    if (typeof isOutermostMainFrame !== 'undefined') {
      // If isOutermostMainFrame is defined we want to use that and not
      // fallback to isMainFrame, even if isOutermostMainFrame is false. Hence
      // this check.
      return isOutermostMainFrame;
    }
    return Boolean(isMainFrame);
  }

  return false;
}

function getEventSelfTime(
    event: Trace.Types.Events.Event, parsedTrace: Trace.Handlers.Types.ParsedTrace): Trace.Types.Timing.MilliSeconds {
  const mapToUse = Trace.Types.Extensions.isSyntheticExtensionEntry(event) ?
      parsedTrace.ExtensionTraceData.entryToNode :
      parsedTrace.Renderer.entryToNode;
  const selfTime = mapToUse.get(event)?.selfTime;
  return selfTime ? Trace.Helpers.Timing.microSecondsToMilliseconds(selfTime) : Trace.Types.Timing.MilliSeconds(0);
}
