// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
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
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Trace from '../../models/trace/trace.js';
import * as SourceMapsResolver from '../../models/trace_source_maps_resolver/trace_source_maps_resolver.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as Tracing from '../../services/tracing/tracing.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
// eslint-disable-next-line @devtools/es-modules-import
import codeHighlighterStyles from '../../ui/components/code_highlighter/codeHighlighter.css.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
// eslint-disable-next-line @devtools/es-modules-import
import imagePreviewStyles from '../../ui/legacy/components/utils/imagePreview.css.js';
import * as LegacyComponents from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import * as PanelsCommon from '../common/common.js';
import { getDurationString } from './AppenderUtils.js';
import * as TimelineComponents from './components/components.js';
import * as Extensions from './extensions/extensions.js';
import { ModificationsManager } from './ModificationsManager.js';
import { targetForEvent } from './TargetForEvent.js';
import * as ThirdPartyTreeView from './ThirdPartyTreeView.js';
import { TimelinePanel } from './TimelinePanel.js';
import { selectionFromEvent } from './TimelineSelection.js';
import * as Utils from './utils/utils.js';
const UIStrings = {
    /**
     * @description Text that only contain a placeholder
     * @example {100ms (at 200ms)} PH1
     */
    emptyPlaceholder: '{PH1}', // eslint-disable-line @devtools/l10n-no-locked-or-placeholder-only-phrase
    /**
     * @description Text for timestamps of items
     */
    timestamp: 'Timestamp',
    /**
     * @description Text shown next to the interaction event's ID in the detail view.
     */
    interactionID: 'ID',
    /**
     * @description Text shown next to the interaction event's input delay time in the detail view.
     */
    inputDelay: 'Input delay',
    /**
     * @description Text shown next to the interaction event's thread processing duration in the detail view.
     */
    processingDuration: 'Processing duration',
    /**
     * @description Text shown next to the interaction event's presentation delay time in the detail view.
     */
    presentationDelay: 'Presentation delay',
    /**
     * @description Text shown when the user has selected an event that represents script compiliation.
     */
    compile: 'Compile',
    /**
     * @description Text shown when the user selects an event that represents script parsing.
     */
    parse: 'Parse',
    /**
     * @description Text with two placeholders separated by a colon
     * @example {Node removed} PH1
     * @example {div#id1} PH2
     */
    sS: '{PH1}: {PH2}',
    /**
     * @description Text that is usually a hyperlink to more documentation
     */
    learnMore: 'Learn more',
    /**
     * @description Text referring to the status of the browser's compilation cache.
     */
    compilationCacheStatus: 'Compilation cache status',
    /**
     * @description Text referring to the size of the browser's compiliation cache.
     */
    compilationCacheSize: 'Compilation cache size',
    /**
     * @description Text in Timeline UIUtils of the Performance panel. "Compilation
     * cache" refers to the code cache described at
     * https://v8.dev/blog/code-caching-for-devs . This label is followed by the
     * type of code cache data used, either "normal" or "full" as described in the
     * linked article.
     */
    compilationCacheKind: 'Compilation cache kind',
    /**
     * @description Text used to inform the user that the script they are looking
     *             at was loaded from the browser's cache.
     */
    scriptLoadedFromCache: 'script loaded from cache',
    /**
     * @description Text to inform the user that the script they are looking at
     *             was unable to be loaded from the browser's cache.
     */
    failedToLoadScriptFromCache: 'failed to load script from cache',
    /**
     * @description Text to inform the user that the script they are looking at was not eligible to be loaded from the browser's cache.
     */
    scriptNotEligibleToBeLoadedFromCache: 'script not eligible',
    /**
     * @description Label in the summary view in the Performance panel for a number which indicates how much managed memory has been reclaimed by performing Garbage Collection
     */
    collected: 'Collected',
    /**
     * @description Text for a programming function
     */
    function: 'Function',
    /**
     * @description Text for referring to the ID of a timer.
     */
    timerId: 'Timer ID',
    /**
     * @description Text for referring to a timer that has timed-out and therefore is being removed.
     */
    timeout: 'Timeout',
    /**
     * @description Text used to refer to a positive timeout value that schedules the idle callback once elapsed, even if no idle time is available.
     */
    requestIdleCallbackTimeout: 'Timeout',
    /**
     * @description Text used to indicate that a timer is repeating (e.g. every X seconds) rather than a one off.
     */
    repeats: 'Repeats',
    /**
     * @description Text for referring to the ID of a callback function installed by an event.
     */
    callbackId: 'Callback ID',
    /**
     * @description Text for a module, the programming concept
     */
    module: 'Module',
    /**
     * @description Label for a group of JavaScript files
     */
    script: 'Script',
    /**
     * @description Text used to tell a user that a compilation trace event was streamed.
     */
    streamed: 'Streamed',
    /**
     * @description Text to indicate if a compilation event was eager.
     */
    eagerCompile: 'Compiling all functions eagerly',
    /**
     * @description Text to refer to the URL associated with a given event.
     */
    url: 'Url',
    /**
     * @description Text to indicate to the user the size of the cache (as a filesize - e.g. 5mb).
     */
    producedCacheSize: 'Produced cache size',
    /**
     * @description Text to indicate to the user the amount of the cache (as a filesize - e.g. 5mb) that has been used.
     */
    consumedCacheSize: 'Consumed cache size',
    /**
     * @description Related node label in Timeline UIUtils of the Performance panel
     */
    layerRoot: 'Layer root',
    /**
     * @description Related node label in Timeline UIUtils of the Performance panel
     */
    ownerElement: 'Owner element',
    /**
     * @description Text used to show the user the URL of the image they are viewing.
     */
    imageUrl: 'Image URL',
    /**
     * @description Text used to show the user that the URL they are viewing is loading a CSS stylesheet.
     */
    stylesheetUrl: 'Stylesheet URL',
    /**
     * @description Text used next to a number to show the user how many elements were affected.
     */
    elementsAffected: 'Elements affected',
    /**
     * @description Text used next to a number to show the user how many nodes required the browser to update and re-layout the page.
     */
    nodesThatNeedLayout: 'Nodes that need layout',
    /**
     * @description Text used to show the amount in a subset - e.g. "2 of 10".
     * @example {2} PH1
     * @example {10} PH2
     */
    sOfS: '{PH1} of {PH2}',
    /**
     * @description Related node label in Timeline UIUtils of the Performance panel
     */
    layoutRoot: 'Layout root',
    /**
     * @description Text used when viewing an event that can have a custom message attached.
     */
    message: 'Message',
    /**
     * @description Text used to tell the user they are viewing an event that has a function embedded in it, which is referred to as the "callback function".
     */
    callbackFunction: 'Callback function',
    /**
     * @description Text used to show the relevant range of a file - e.g. "lines 2-10".
     */
    range: 'Range',
    /**
     * @description Text used to refer to the amount of time some event or code was given to complete within.
     */
    allottedTime: 'Allotted time',
    /**
     * @description Text used to tell a user that a particular event or function was automatically run by a timeout.
     */
    invokedByTimeout: 'Invoked by timeout',
    /**
     * @description Text that refers to some types
     */
    type: 'Type',
    /**
     * @description Text for the size of something
     */
    size: 'Size',
    /**
     * @description Text for the details of something
     */
    details: 'Details',
    /**
     * @description Text to indicate an item is a warning
     */
    warning: 'Warning',
    /**
     * @description Text that indicates a particular HTML element or node is related to what the user is viewing.
     */
    relatedNode: 'Related node',
    /**
     * @description Text for previewing items
     */
    preview: 'Preview',
    /**
     * @description Text used to refer to the total time summed up across multiple events.
     */
    aggregatedTime: 'Aggregated time',
    /**
     * @description Text for the duration of something
     */
    duration: 'Duration',
    /**
     * @description Text for the stack trace of the initiator of something. The Initiator is the event or factor that directly triggered or precipitated a subsequent action.
     */
    initiatorStackTrace: 'Initiator stack trace',
    /**
     * @description Text for the event initiated by another one
     */
    initiatedBy: 'Initiated by',
    /**
     * @description Text for the event that is an initiator for another one
     */
    initiatorFor: 'Initiator for',
    /**
     * @description Text for the underlying data behing a specific flamechart selection. Trace events are the browser instrumentation that are emitted as JSON objects.
     */
    traceEvent: 'Trace event',
    /**
     * @description Call site stack label in Timeline UIUtils of the Performance panel
     */
    timerInstalled: 'Timer installed',
    /**
     * @description Call site stack label in Timeline UIUtils of the Performance panel
     */
    animationFrameRequested: 'Animation frame requested',
    /**
     * @description Call site stack label in Timeline UIUtils of the Performance panel
     */
    idleCallbackRequested: 'Idle callback requested',
    /**
     * @description Stack label in Timeline UIUtils of the Performance panel
     */
    recalculationForced: 'Recalculation forced',
    /**
     * @description Call site stack label in Timeline UIUtils of the Performance panel
     */
    firstLayoutInvalidation: 'First layout invalidation',
    /**
     * @description Stack label in Timeline UIUtils of the Performance panel
     */
    layoutForced: 'Layout forced',
    /**
     * @description Label in front of CSS property (eg `opacity`) being animated or a CSS animation name (eg `layer-4-fade-in-out`)
     */
    animating: 'Animating',
    /**
     * @description Label in front of reasons why a CSS animation wasn't composited (aka hardware accelerated)
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
    compositingFailedTransformRelatedPropertyCannotBeAcceleratedOnTarget: 'Transform-related property cannot be accelerated on target',
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
     * @description Text for the execution "stack trace". It is not technically a stack trace, because it points to the beginning of each function
     * and not to each call site, so we call it a function stack instead to avoid confusion.
     */
    functionStack: 'Function stack',
    /**
     * @description Text used to show any invalidations for a particular event that caused the browser to have to do more work to update the page.
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
     * @description Noun label for a stack trace which indicates the first time some condition was invalidated.
     */
    firstInvalidated: 'First invalidated',
    /**
     * @description Title of the paint profiler, old name of the performance pane
     */
    paintProfiler: 'Paint profiler',
    /**
     * @description Text in Timeline Flame Chart View of the Performance panel
     * @example {Frame} PH1
     * @example {10ms} PH2
     */
    sAtS: '{PH1} at {PH2}',
    /**
     * @description Text used next to a time to indicate that the particular event took that much time itself. In context this might look like "3ms blink.console (self)"
     * @example {blink.console} PH1
     */
    sSelf: '{PH1} (self)',
    /**
     * @description Text used next to a time to indicate that the event's children took that much time. In context this might look like "3ms blink.console (children)"
     * @example {blink.console} PH1
     */
    sChildren: '{PH1} (children)',
    /**
     * @description Text used to show the user how much time the browser spent on rendering (drawing the page onto the screen).
     */
    timeSpentInRendering: 'Time spent in rendering',
    /**
     * @description Text for a rendering frame
     */
    frame: 'Frame',
    /**
     * @description Text used to refer to the duration of an event at a given offset - e.g. "2ms at 10ms" which can be read as "2ms starting after 10ms".
     * @example {10ms} PH1
     * @example {10ms} PH2
     */
    sAtSParentheses: '{PH1} (at {PH2})',
    /**
     * @description Text of a DOM element in Timeline UIUtils of the Performance panel
     */
    UnknownNode: '[ unknown node ]',
    /**
     * @description Text used to refer to a particular element and the file it was referred to in.
     * @example {node} PH1
     * @example {app.js} PH2
     */
    invalidationWithCallFrame: '{PH1} at {PH2}',
    /**
     * @description Text indicating that something is outside of the Performace Panel Timeline Minimap range
     */
    outsideBreadcrumbRange: '(outside of the breadcrumb range)',
    /**
     * @description Text indicating that something is hidden from the Performace Panel Timeline
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
     * @description Label for a numeric value that was how long to wait before a function was run.
     */
    delay: 'Delay',
    /**
     * @description Label for a string that describes the priority at which a task was scheduled, like 'background' for low-priority tasks, and 'user-blocking' for high priority.
     */
    priority: 'Priority',
    /**
     * @description Label for third party table.
     */
    thirdPartyTable: '1st / 3rd party table',
    /**
     * @description Label for the a source URL.
     */
    source: 'Source',
    /**
     * @description Label for a URL origin.
     */
    origin: 'Origin',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineUIUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/** Look for scheme:// plus text and exclude any punctuation at the end. **/
export const URL_REGEX = /(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\/\/)[^\s"]{2,}[^\s"'\)\}\],:;.!?]/u;
let eventDispatchDesciptors;
let colorGenerator;
const { SamplesIntegrator } = Trace.Helpers.SamplesIntegrator;
export class TimelineUIUtils {
    /**
     * use getGetDebugModeEnabled() to query this variable.
     */
    static debugModeEnabled = undefined;
    static getGetDebugModeEnabled() {
        if (TimelineUIUtils.debugModeEnabled === undefined) {
            TimelineUIUtils.debugModeEnabled =
                Root.Runtime.experiments.isEnabled("timeline-debug-mode" /* Root.Runtime.ExperimentName.TIMELINE_DEBUG_MODE */);
        }
        return TimelineUIUtils.debugModeEnabled;
    }
    static frameDisplayName(frame) {
        const maybeResolvedData = SourceMapsResolver.SourceMapsResolver.resolvedCodeLocationForCallFrame(frame);
        const functionName = maybeResolvedData?.name || frame.functionName;
        if (!SamplesIntegrator.isNativeRuntimeFrame(frame)) {
            return UI.UIUtils.beautifyFunctionName(functionName);
        }
        const nativeGroup = SamplesIntegrator.nativeGroup(functionName);
        switch (nativeGroup) {
            case "Compile" /* SamplesIntegrator.NativeGroups.COMPILE */:
                return i18nString(UIStrings.compile);
            case "Parse" /* SamplesIntegrator.NativeGroups.PARSE */:
                return i18nString(UIStrings.parse);
        }
        return functionName;
    }
    static testContentMatching(traceEvent, regExp, handlerData) {
        const title = TimelineUIUtils.eventStyle(traceEvent).title;
        const tokens = [title];
        if (Trace.Types.Events.isProfileCall(traceEvent)) {
            // In the future this case will not be possible - wherever we call this
            // function we will be able to pass in the data from the new engine. But
            // currently this is called in a variety of places including from the
            // legacy model which does not have a reference to the new engine's data.
            // So if we are missing the data, we just fallback to the name from the
            // callFrame.
            if (!handlerData?.Samples) {
                tokens.push(traceEvent.callFrame.functionName);
            }
            else {
                tokens.push(Trace.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(handlerData.Samples, traceEvent));
            }
        }
        if (handlerData) {
            const url = Trace.Handlers.Helpers.getNonResolvedURL(traceEvent, handlerData);
            if (url) {
                tokens.push(url);
            }
        }
        if (TimelineUIUtils.getGetDebugModeEnabled()) {
            // When in debug mode append top level properties (like timestamp)
            // and deeply nested properties.
            appendObjectProperties(traceEvent, 4);
        }
        else {
            appendObjectProperties(traceEvent.args, 2);
        }
        const result = tokens.join('|').match(regExp);
        return result ? result.length > 0 : false;
        function appendObjectProperties(object, depth) {
            if (!depth) {
                return;
            }
            for (const key in object) {
                const value = object[key];
                if (typeof value === 'string') {
                    tokens.push(value);
                }
                else if (typeof value === 'number') {
                    tokens.push(String(value));
                }
                else if (typeof value === 'object' && value !== null) {
                    appendObjectProperties(value, depth - 1);
                }
            }
        }
    }
    static eventStyle(event) {
        if (Trace.Types.Events.isProfileCall(event) && event.callFrame.functionName === '(idle)') {
            return new Trace.Styles.TimelineRecordStyle(event.name, Trace.Styles.getCategoryStyles().idle);
        }
        if (event.cat === Trace.Types.Events.Categories.Console || event.cat === Trace.Types.Events.Categories.UserTiming) {
            return new Trace.Styles.TimelineRecordStyle(event.name, Trace.Styles.getCategoryStyles()['scripting']);
        }
        return Trace.Styles.getEventStyle(event.name) ??
            new Trace.Styles.TimelineRecordStyle(event.name, Trace.Styles.getCategoryStyles().other);
    }
    static eventColor(event) {
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
        const themeSupport = ThemeSupport.ThemeSupport.instance();
        let parsedColor = themeSupport.getComputedValue(TimelineUIUtils.eventStyle(event).category.cssVariable);
        // This event is considered idle time but still rendered as a scripting event here
        // to connect the StreamingCompileScriptParsing events it belongs to.
        if (event.name === "v8.parseOnBackgroundWaiting" /* Trace.Types.Events.Name.STREAMING_COMPILE_SCRIPT_WAITING */) {
            parsedColor = themeSupport.getComputedValue(Trace.Styles.getCategoryStyles().scripting.cssVariable);
            if (!parsedColor) {
                throw new Error('Unable to parse color from getCategoryStyles().scripting.color');
            }
        }
        return parsedColor;
    }
    static eventTitle(event) {
        // Profile call events do not have a args.data property, thus, we
        // need to check for profile calls in the beginning of this
        // function.
        if (Trace.Types.Events.isProfileCall(event)) {
            const maybeResolvedData = SourceMapsResolver.SourceMapsResolver.resolvedCodeLocationForEntry(event);
            const displayName = maybeResolvedData?.name || TimelineUIUtils.frameDisplayName(event.callFrame);
            return displayName;
        }
        if (event.name === 'EventTiming' && Trace.Types.Events.isSyntheticInteraction(event)) {
            // TODO(crbug.com/365047728): replace this entire method with this call.
            return Trace.Name.forEntry(event);
        }
        const title = TimelineUIUtils.eventStyle(event).title;
        if (Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.Console)) {
            return title;
        }
        if (Trace.Types.Events.isConsoleTimeStamp(event) && event.args.data) {
            return i18nString(UIStrings.sS, { PH1: title, PH2: event.args.data.name ?? event.args.data.message });
        }
        if (Trace.Types.Events.isAnimation(event) && event.args.data.name) {
            return i18nString(UIStrings.sS, { PH1: title, PH2: event.args.data.name });
        }
        if (Trace.Types.Events.isDispatch(event)) {
            return i18nString(UIStrings.sS, { PH1: title, PH2: event.args.data.type });
        }
        return title;
    }
    static isUserFrame(frame) {
        return frame.scriptId !== '0' && !(frame.url?.startsWith('native '));
    }
    static async buildDetailsNodeForTraceEvent(event, target, linkifier, isFreshOrEnhanced = false, parsedTrace) {
        let details = null;
        let detailsText;
        // TODO(40287735): update this code with type-safe data checks.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsafeEventArgs = event.args;
        // TODO(40287735): update this code with type-safe data checks.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsafeEventData = event.args?.data;
        switch (event.name) {
            case "PaintImage" /* Trace.Types.Events.Name.PAINT_IMAGE */:
            case "Decode Image" /* Trace.Types.Events.Name.DECODE_IMAGE */:
            case "Decode LazyPixelRef" /* Trace.Types.Events.Name.DECODE_LAZY_PIXEL_REF */:
            case "XHRReadyStateChange" /* Trace.Types.Events.Name.XHR_READY_STATE_CHANGED */:
            case "XHRLoad" /* Trace.Types.Events.Name.XHR_LOAD */:
            case "ResourceWillSendRequest" /* Trace.Types.Events.Name.RESOURCE_WILL_SEND_REQUEST */:
            case "ResourceSendRequest" /* Trace.Types.Events.Name.RESOURCE_SEND_REQUEST */:
            case "ResourceReceivedData" /* Trace.Types.Events.Name.RESOURCE_RECEIVE_DATA */:
            case "ResourceReceiveResponse" /* Trace.Types.Events.Name.RESOURCE_RECEIVE_RESPONSE */:
            case "ResourceFinish" /* Trace.Types.Events.Name.RESOURCE_FINISH */: {
                const url = Trace.Handlers.Helpers.getNonResolvedURL(event, parsedTrace.data);
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
            case "FunctionCall" /* Trace.Types.Events.Name.FUNCTION_CALL */: {
                details = document.createElement('span');
                // FunctionCall events have an args.data that could be a CallFrame, if all the details are present, so we check for that.
                const callFrame = Trace.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event)?.at(0);
                if (Trace.Types.Events.isFunctionCall(event) && callFrame) {
                    UI.UIUtils.createTextChild(details, TimelineUIUtils.frameDisplayName({ ...callFrame, scriptId: String(callFrame.scriptId) }));
                }
                const location = this.linkifyLocation({
                    scriptId: unsafeEventData['scriptId'],
                    url: unsafeEventData['url'],
                    lineNumber: callFrame?.lineNumber || 0,
                    columnNumber: callFrame?.columnNumber,
                    target,
                    isFreshOrEnhanced,
                    linkifier,
                    omitOrigin: true,
                });
                if (location) {
                    UI.UIUtils.createTextChild(details, ' @ ');
                    details.appendChild(location);
                }
                break;
            }
            case "V8.CompileModule" /* Trace.Types.Events.Name.COMPILE_MODULE */:
            case "v8.produceModuleCache" /* Trace.Types.Events.Name.CACHE_MODULE */: {
                details = this.linkifyLocation({
                    scriptId: null,
                    url: unsafeEventArgs['fileName'],
                    lineNumber: 0,
                    columnNumber: 0,
                    target,
                    isFreshOrEnhanced,
                    linkifier,
                });
                break;
            }
            case "v8.deserializeOnBackground" /* Trace.Types.Events.Name.BACKGROUND_DESERIALIZE */:
            case "v8.parseOnBackground" /* Trace.Types.Events.Name.STREAMING_COMPILE_SCRIPT */: {
                const url = unsafeEventData['url'];
                if (url) {
                    details = this.linkifyLocation({
                        scriptId: null,
                        url,
                        lineNumber: 0,
                        columnNumber: 0,
                        target,
                        isFreshOrEnhanced,
                        linkifier,
                        omitOrigin: true,
                    });
                }
                break;
            }
            default: {
                /**
                 * Some events have a stack trace which is extracted by default at @see TimelineUIUtils.generateCauses
                 * thus, we prevent extracting the stack trace again here.
                 */
                if (Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.Console) ||
                    Trace.Types.Events.isUserTiming(event) || Trace.Types.Extensions.isSyntheticExtensionEntry(event) ||
                    Trace.Types.Events.isProfileCall(event)) {
                    detailsText = null;
                }
                else {
                    details = this.linkifyTopCallFrame(event, target, linkifier, isFreshOrEnhanced) ?? null;
                }
                break;
            }
        }
        if (!details && detailsText) {
            details = document.createTextNode(detailsText);
        }
        return details;
    }
    static linkifyLocation(linkifyOptions) {
        const { scriptId, url, lineNumber, columnNumber, isFreshOrEnhanced, linkifier, target, omitOrigin } = linkifyOptions;
        const options = {
            lineNumber,
            columnNumber,
            showColumnNumber: true,
            inlineFrameIndex: 0,
            className: 'timeline-details',
            tabStop: true,
            omitOrigin,
        };
        if (isFreshOrEnhanced) {
            return linkifier.linkifyScriptLocation(target, scriptId, url, lineNumber, options);
        }
        return LegacyComponents.Linkifier.Linkifier.linkifyURL(url, options);
    }
    static linkifyTopCallFrame(event, target, linkifier, isFreshOrEnhanced = false) {
        let frame = Trace.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event)?.[0];
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
        if (isFreshOrEnhanced) {
            return linkifier.maybeLinkifyConsoleCallFrame(target, frame, { showColumnNumber: true, inlineFrameIndex: 0 });
        }
        return LegacyComponents.Linkifier.Linkifier.linkifyURL(frame.url, options);
    }
    static buildDetailsNodeForMarkerEvents(event) {
        let link = 'https://web.dev/user-centric-performance-metrics/';
        let name = 'page performance metrics';
        switch (event.name) {
            case "largestContentfulPaint::Candidate" /* Trace.Types.Events.Name.MARK_LCP_CANDIDATE */:
                link = 'https://web.dev/lcp/';
                name = 'largest contentful paint';
                break;
            case "firstContentfulPaint" /* Trace.Types.Events.Name.MARK_FCP */:
                link = 'https://web.dev/first-contentful-paint/';
                name = 'first contentful paint';
                break;
            default:
                break;
        }
        const html = UI.Fragment.html `<div>${UI.XLink.XLink.create(link, i18nString(UIStrings.learnMore), undefined, undefined, 'learn-more')} about ${name}.</div>`;
        return html;
    }
    static buildConsumeCacheDetails(eventData, contentHelper) {
        if (typeof eventData.consumedCacheSize === 'number') {
            contentHelper.appendTextRow(i18nString(UIStrings.compilationCacheStatus), i18nString(UIStrings.scriptLoadedFromCache));
            contentHelper.appendTextRow(i18nString(UIStrings.compilationCacheSize), i18n.ByteUtilities.bytesToString(eventData.consumedCacheSize));
            const cacheKind = eventData.cacheKind;
            if (cacheKind) {
                contentHelper.appendTextRow(i18nString(UIStrings.compilationCacheKind), cacheKind);
            }
        }
        else if ('cacheRejected' in eventData && eventData['cacheRejected']) {
            // Version mismatch or similar.
            contentHelper.appendTextRow(i18nString(UIStrings.compilationCacheStatus), i18nString(UIStrings.failedToLoadScriptFromCache));
        }
        else {
            contentHelper.appendTextRow(i18nString(UIStrings.compilationCacheStatus), i18nString(UIStrings.scriptNotEligibleToBeLoadedFromCache));
        }
    }
    static maybeCreateLinkElement(url) {
        const parsedURL = new Common.ParsedURL.ParsedURL(url);
        if (!parsedURL.scheme) {
            return null;
        }
        const splitResult = Common.ParsedURL.ParsedURL.splitLineAndColumn(url);
        if (!splitResult) {
            return null;
        }
        const { url: rawURL, lineNumber, columnNumber } = splitResult;
        const options = {
            lineNumber,
            columnNumber,
            showColumnNumber: true,
            omitOrigin: true,
        };
        return LegacyComponents.Linkifier.Linkifier.linkifyURL(rawURL, options);
    }
    /**
     * Takes an input string and parses it to look for links. It does this by
     * looking for URLs in the input string. The returned fragment will contain
     * the same string but with any links wrapped in clickable links. The text
     * of the link is the URL, so the visible string to the user is unchanged.
     */
    static parseStringForLinks(rawString) {
        const results = TextUtils.TextUtils.Utils.splitStringByRegexes(rawString, [URL_REGEX]);
        const nodes = results.map(result => {
            if (result.regexIndex === -1) {
                return result.value;
            }
            return TimelineUIUtils.maybeCreateLinkElement(result.value) ?? result.value;
        });
        const frag = document.createDocumentFragment();
        frag.append(...nodes);
        return frag;
    }
    static async buildTraceEventDetails(parsedTrace, event, linkifier, canShowPieChart, entityMapper) {
        const maybeTarget = targetForEvent(parsedTrace, event);
        const { duration } = Trace.Helpers.Timing.eventTimingsMicroSeconds(event);
        const selfTime = getEventSelfTime(event, parsedTrace);
        const relatedNodesMap = await Utils.EntryNodes.relatedDOMNodesForEvent(parsedTrace, event);
        let entityAppended = false;
        if (maybeTarget) {
            // @ts-expect-error TODO(crbug.com/1011811): Remove symbol usage.
            if (typeof event[previewElementSymbol] === 'undefined') {
                let previewElement = null;
                const url = Trace.Handlers.Helpers.getNonResolvedURL(event, parsedTrace.data);
                if (url) {
                    previewElement = await LegacyComponents.ImagePreview.ImagePreview.build(url, false, {
                        imageAltText: LegacyComponents.ImagePreview.ImagePreview.defaultAltTextForImageURL(url),
                        precomputedFeatures: undefined,
                        align: "start" /* LegacyComponents.ImagePreview.Align.START */,
                    });
                }
                else if (Trace.Types.Events.isPaint(event)) {
                    previewElement = await TimelineUIUtils.buildPicturePreviewContent(parsedTrace, event, maybeTarget);
                }
                // @ts-expect-error TODO(crbug.com/1011811): Remove symbol usage.
                event[previewElementSymbol] = previewElement;
            }
        }
        // This message may vary per event.name;
        let relatedNodeLabel;
        const contentHelper = new TimelineDetailsContentHelper(targetForEvent(parsedTrace, event), linkifier);
        const defaultColorForEvent = this.eventColor(event);
        const isMarker = parsedTrace && isMarkerEvent(parsedTrace, event);
        const color = isMarker ? TimelineUIUtils.markerStyleForEvent(event).color : defaultColorForEvent;
        contentHelper.addSection(TimelineUIUtils.eventTitle(event), color, event);
        // TODO: as part of the removal of the old engine, produce a typesafe way
        // to look up args and data for events.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsafeEventArgs = event.args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsafeEventData = event.args?.data;
        const initiator = parsedTrace.data.Initiators.eventToInitiator.get(event) ?? null;
        const initiatorFor = parsedTrace.data.Initiators.initiatorToEvents.get(event) ?? null;
        let url = null;
        if (parsedTrace) {
            const warnings = TimelineComponents.DetailsView.buildWarningElementsForEvent(event, parsedTrace);
            for (const warning of warnings) {
                contentHelper.appendElementRow(i18nString(UIStrings.warning), warning, true);
            }
        }
        // Add timestamp to user timings, including custom extensibility markers
        if (Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.UserTiming) ||
            Trace.Types.Extensions.isSyntheticExtensionEntry(event)) {
            const adjustedEventTimeStamp = timeStampForEventAdjustedForClosestNavigationIfPossible(event, parsedTrace);
            contentHelper.appendTextRow(i18nString(UIStrings.timestamp), i18n.TimeUtilities.preciseMillisToString(adjustedEventTimeStamp, 1));
        }
        // Only show total time and self time for events with non-zero durations.
        if (duration !== 0 && !Number.isNaN(duration)) {
            const timeStr = getDurationString(duration, selfTime);
            contentHelper.appendTextRow(i18nString(UIStrings.duration), timeStr);
        }
        if (Trace.Types.Events.isPerformanceMark(event) && event.args.data?.detail) {
            const detailContainer = TimelineUIUtils.renderObjectJson(JSON.parse(event.args.data?.detail));
            contentHelper.appendElementRow(i18nString(UIStrings.details), detailContainer);
        }
        if (Trace.Types.Events.isSyntheticUserTiming(event) && event.args?.data?.beginEvent.args.detail) {
            const detailContainer = TimelineUIUtils.renderObjectJson(JSON.parse(event.args?.data?.beginEvent.args.detail));
            contentHelper.appendElementRow(i18nString(UIStrings.details), detailContainer);
        }
        if (parsedTrace.data.Meta.traceIsGeneric) {
            TimelineUIUtils.renderEventJson(event, contentHelper);
            return contentHelper.fragment;
        }
        if (Trace.Types.Events.isV8Compile(event)) {
            url = event.args.data?.url;
            if (url) {
                const { lineNumber, columnNumber } = Trace.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
                contentHelper.appendLocationRow(i18nString(UIStrings.script), url, lineNumber || 0, columnNumber, undefined, true);
                const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, event);
                if (originWithEntity) {
                    contentHelper.appendElementRow(i18nString(UIStrings.origin), originWithEntity);
                }
                entityAppended = true;
            }
            const isEager = Boolean(event.args.data?.eager);
            if (isEager) {
                contentHelper.appendTextRow(i18nString(UIStrings.eagerCompile), true);
            }
            const isStreamed = Boolean(event.args.data?.streamed);
            contentHelper.appendTextRow(i18nString(UIStrings.streamed), isStreamed + (isStreamed ? '' : `: ${event.args.data?.notStreamedReason || ''}`));
            if (event.args.data) {
                TimelineUIUtils.buildConsumeCacheDetails(event.args.data, contentHelper);
            }
        }
        if (Trace.Types.Extensions.isSyntheticExtensionEntry(event)) {
            // isSyntheticExtensionEntries can be any of: perf.measure, perf.mark or console.timeStamp.
            const userDetail = structuredClone(event.userDetail);
            if (userDetail && Object.keys(userDetail).length) {
                // E.g. console.timeStamp(name, start, end, track, trackGroup, color,
                // {url: 'foo-extension://node/1', description: 'Node'});
                const hasExclusiveLink = typeof userDetail === 'object' && typeof userDetail.url === 'string' &&
                    typeof userDetail.description === 'string';
                if (hasExclusiveLink && Boolean(Root.Runtime.hostConfig.devToolsDeepLinksViaExtensibilityApi?.enabled)) {
                    const linkElement = this.maybeCreateLinkElement(String(userDetail.url));
                    if (linkElement) {
                        contentHelper.appendElementRow(String(userDetail.description), linkElement);
                        // Now remove so we don't render them in renderObjectJson.
                        delete userDetail.url;
                        delete userDetail.description;
                    }
                }
                if (Object.keys(userDetail).length) {
                    // E.g., performance.measure(name, {detail: {important: 42, devtools: {}}})
                    const detailContainer = TimelineUIUtils.renderObjectJson(userDetail);
                    contentHelper.appendElementRow(i18nString(UIStrings.details), detailContainer);
                }
            }
            // E.g. performance.measure(name, {detail: {devtools: {properties: ['Key', 'Value']}}})
            if (event.devtoolsObj.properties) {
                for (const [key, value] of event.devtoolsObj.properties || []) {
                    const renderedValue = typeof value === 'string' ? TimelineUIUtils.parseStringForLinks(value) :
                        TimelineUIUtils.renderObjectJson(value);
                    contentHelper.appendElementRow(key, renderedValue);
                }
            }
        }
        const isFreshOrEnhanced = Boolean(parsedTrace && Tracing.FreshRecording.Tracker.instance().recordingIsFreshOrEnhanced(parsedTrace));
        switch (event.name) {
            case "GCEvent" /* Trace.Types.Events.Name.GC */:
            case "MajorGC" /* Trace.Types.Events.Name.MAJOR_GC */:
            case "MinorGC" /* Trace.Types.Events.Name.MINOR_GC */: {
                const delta = unsafeEventArgs['usedHeapSizeBefore'] - unsafeEventArgs['usedHeapSizeAfter'];
                contentHelper.appendTextRow(i18nString(UIStrings.collected), i18n.ByteUtilities.bytesToString(delta));
                break;
            }
            case "ProfileCall" /* Trace.Types.Events.Name.PROFILE_CALL */: {
                const profileCall = event;
                const resolvedURL = SourceMapsResolver.SourceMapsResolver.resolvedURLForEntry(parsedTrace, profileCall);
                if (!resolvedURL) {
                    break;
                }
                const callFrame = profileCall.callFrame;
                // Render the URL with its location content.
                contentHelper.appendLocationRow(i18nString(UIStrings.source), resolvedURL, callFrame.lineNumber || 0, callFrame.columnNumber, undefined, true);
                const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, profileCall);
                if (originWithEntity) {
                    contentHelper.appendElementRow(i18nString(UIStrings.origin), originWithEntity);
                }
                entityAppended = true;
                break;
            }
            case "FunctionCall" /* Trace.Types.Events.Name.FUNCTION_CALL */: {
                const detailsNode = await TimelineUIUtils.buildDetailsNodeForTraceEvent(event, targetForEvent(parsedTrace, event), linkifier, isFreshOrEnhanced, parsedTrace);
                if (detailsNode) {
                    contentHelper.appendElementRow(i18nString(UIStrings.function), detailsNode);
                    const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, event);
                    if (originWithEntity) {
                        contentHelper.appendElementRow(i18nString(UIStrings.origin), originWithEntity);
                    }
                    entityAppended = true;
                }
                break;
            }
            case "TimerFire" /* Trace.Types.Events.Name.TIMER_FIRE */:
            case "TimerInstall" /* Trace.Types.Events.Name.TIMER_INSTALL */:
            case "TimerRemove" /* Trace.Types.Events.Name.TIMER_REMOVE */: {
                contentHelper.appendTextRow(i18nString(UIStrings.timerId), unsafeEventData.timerId);
                if (event.name === "TimerInstall" /* Trace.Types.Events.Name.TIMER_INSTALL */) {
                    contentHelper.appendTextRow(i18nString(UIStrings.timeout), i18n.TimeUtilities.millisToString(unsafeEventData['timeout']));
                    contentHelper.appendTextRow(i18nString(UIStrings.repeats), !unsafeEventData['singleShot']);
                }
                break;
            }
            case "SchedulePostTaskCallback" /* Trace.Types.Events.Name.SCHEDULE_POST_TASK_CALLBACK */:
            case "RunPostTaskCallback" /* Trace.Types.Events.Name.RUN_POST_TASK_CALLBACK */: {
                contentHelper.appendTextRow(i18nString(UIStrings.delay), i18n.TimeUtilities.millisToString(unsafeEventData['delay']));
                contentHelper.appendTextRow(i18nString(UIStrings.priority), unsafeEventData['priority']);
                break;
            }
            case "FireAnimationFrame" /* Trace.Types.Events.Name.FIRE_ANIMATION_FRAME */: {
                contentHelper.appendTextRow(i18nString(UIStrings.callbackId), unsafeEventData['id']);
                break;
            }
            case "V8.CompileModule" /* Trace.Types.Events.Name.COMPILE_MODULE */: {
                contentHelper.appendLocationRow(i18nString(UIStrings.module), unsafeEventArgs['fileName'], 0);
                break;
            }
            case "V8.CompileScript" /* Trace.Types.Events.Name.COMPILE_SCRIPT */: {
                // This case is handled above
                break;
            }
            case "v8.produceModuleCache" /* Trace.Types.Events.Name.CACHE_MODULE */: {
                url = unsafeEventData && unsafeEventData['url'];
                contentHelper.appendTextRow(i18nString(UIStrings.compilationCacheSize), i18n.ByteUtilities.bytesToString(unsafeEventData['producedCacheSize']));
                break;
            }
            case "v8.produceCache" /* Trace.Types.Events.Name.CACHE_SCRIPT */: {
                url = unsafeEventData && unsafeEventData['url'];
                if (url) {
                    const { lineNumber, columnNumber } = Trace.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
                    contentHelper.appendLocationRow(i18nString(UIStrings.script), url, lineNumber || 0, columnNumber, undefined, true);
                    const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, event);
                    if (originWithEntity) {
                        contentHelper.appendElementRow(i18nString(UIStrings.origin), originWithEntity);
                    }
                    entityAppended = true;
                }
                contentHelper.appendTextRow(i18nString(UIStrings.compilationCacheSize), i18n.ByteUtilities.bytesToString(unsafeEventData['producedCacheSize']));
                break;
            }
            case "EvaluateScript" /* Trace.Types.Events.Name.EVALUATE_SCRIPT */: {
                url = unsafeEventData && unsafeEventData['url'];
                if (url) {
                    const { lineNumber, columnNumber } = Trace.Helpers.Trace.getZeroIndexedLineAndColumnForEvent(event);
                    contentHelper.appendLocationRow(i18nString(UIStrings.script), url, lineNumber || 0, columnNumber, undefined, true);
                    const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, event);
                    if (originWithEntity) {
                        contentHelper.appendElementRow(i18nString(UIStrings.origin), originWithEntity);
                    }
                    entityAppended = true;
                }
                break;
            }
            case "v8.wasm.streamFromResponseCallback" /* Trace.Types.Events.Name.WASM_STREAM_FROM_RESPONSE_CALLBACK */:
            case "v8.wasm.compiledModule" /* Trace.Types.Events.Name.WASM_COMPILED_MODULE */:
            case "v8.wasm.cachedModule" /* Trace.Types.Events.Name.WASM_CACHED_MODULE */:
            case "v8.wasm.moduleCacheHit" /* Trace.Types.Events.Name.WASM_MODULE_CACHE_HIT */:
            case "v8.wasm.moduleCacheInvalid" /* Trace.Types.Events.Name.WASM_MODULE_CACHE_INVALID */: {
                if (unsafeEventData) {
                    url = unsafeEventArgs['url'];
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
            case "Paint" /* Trace.Types.Events.Name.PAINT */:
            case "PaintSetup" /* Trace.Types.Events.Name.PAINT_SETUP */:
            case "Rasterize" /* Trace.Types.Events.Name.RASTERIZE */:
            case "ScrollLayer" /* Trace.Types.Events.Name.SCROLL_LAYER */: {
                relatedNodeLabel = i18nString(UIStrings.layerRoot);
                break;
            }
            case "PaintImage" /* Trace.Types.Events.Name.PAINT_IMAGE */:
            case "Decode LazyPixelRef" /* Trace.Types.Events.Name.DECODE_LAZY_PIXEL_REF */:
            case "Decode Image" /* Trace.Types.Events.Name.DECODE_IMAGE */:
            case "Draw LazyPixelRef" /* Trace.Types.Events.Name.DRAW_LAZY_PIXEL_REF */: {
                relatedNodeLabel = i18nString(UIStrings.ownerElement);
                url = Trace.Handlers.Helpers.getNonResolvedURL(event, parsedTrace.data);
                if (url) {
                    const options = {
                        tabStop: true,
                        showColumnNumber: false,
                        inlineFrameIndex: 0,
                    };
                    contentHelper.appendElementRow(i18nString(UIStrings.imageUrl), LegacyComponents.Linkifier.Linkifier.linkifyURL(url, options));
                }
                break;
            }
            case "ParseAuthorStyleSheet" /* Trace.Types.Events.Name.PARSE_AUTHOR_STYLE_SHEET */: {
                url = unsafeEventData['styleSheetUrl'];
                if (url) {
                    const options = {
                        tabStop: true,
                        showColumnNumber: false,
                        inlineFrameIndex: 0,
                    };
                    contentHelper.appendElementRow(i18nString(UIStrings.stylesheetUrl), LegacyComponents.Linkifier.Linkifier.linkifyURL(url, options));
                }
                break;
            }
            case "UpdateLayoutTree" /* Trace.Types.Events.Name.RECALC_STYLE */: {
                contentHelper.appendTextRow(i18nString(UIStrings.elementsAffected), unsafeEventArgs['elementCount']);
                const selectorStatsSetting = Common.Settings.Settings.instance().createSetting('timeline-capture-selector-stats', false);
                if (!selectorStatsSetting.get()) {
                    const note = document.createElement('span');
                    note.textContent = i18nString(UIStrings.sSelectorStatsInfo, { PH1: selectorStatsSetting.title() });
                    contentHelper.appendElementRow(i18nString(UIStrings.selectorStatsTitle), note);
                }
                break;
            }
            case "Layout" /* Trace.Types.Events.Name.LAYOUT */: {
                const beginData = unsafeEventArgs['beginData'];
                contentHelper.appendTextRow(i18nString(UIStrings.nodesThatNeedLayout), i18nString(UIStrings.sOfS, { PH1: beginData['dirtyObjects'], PH2: beginData['totalObjects'] }));
                relatedNodeLabel = i18nString(UIStrings.layoutRoot);
                break;
            }
            case "ConsoleTime" /* Trace.Types.Events.Name.CONSOLE_TIME */: {
                contentHelper.appendTextRow(i18nString(UIStrings.message), event.name);
                break;
            }
            case "WebSocketCreate" /* Trace.Types.Events.Name.WEB_SOCKET_CREATE */:
            case "WebSocketSendHandshakeRequest" /* Trace.Types.Events.Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST */:
            case "WebSocketReceiveHandshakeResponse" /* Trace.Types.Events.Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST */:
            case "WebSocketSend" /* Trace.Types.Events.Name.WEB_SOCKET_SEND */:
            case "WebSocketReceive" /* Trace.Types.Events.Name.WEB_SOCKET_RECEIVE */:
            case "WebSocketDestroy" /* Trace.Types.Events.Name.WEB_SOCKET_DESTROY */: {
                if (Trace.Types.Events.isWebSocketTraceEvent(event)) {
                    const rows = TimelineComponents.DetailsView.buildRowsForWebSocketEvent(event, parsedTrace);
                    for (const { key, value } of rows) {
                        contentHelper.appendTextRow(key, value);
                    }
                }
                break;
            }
            case "EmbedderCallback" /* Trace.Types.Events.Name.EMBEDDER_CALLBACK */: {
                contentHelper.appendTextRow(i18nString(UIStrings.callbackFunction), unsafeEventData['callbackName']);
                break;
            }
            case "Animation" /* Trace.Types.Events.Name.ANIMATION */: {
                if (!Trace.Types.Events.isSyntheticAnimation(event)) {
                    break;
                }
                const { displayName, nodeName } = event.args.data.beginEvent.args.data;
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
                const unsupportedProperties = new Set(failures.map(f => f.unsupportedProperties).flat().filter(Boolean));
                // The failureReasons can be empty when Blink added a new failure reason that is
                // not supported by DevTools yet
                if (failureReasons.size === 0) {
                    contentHelper.appendElementRow(i18nString(UIStrings.compositingFailed), i18nString(UIStrings.compositingFailedUnknownReason), true);
                }
                else {
                    for (const reason of failureReasons) {
                        let str;
                        switch (reason) {
                            case "ACCELERATED_ANIMATIONS_DISABLED" /* CLSInsight.AnimationFailureReasons.ACCELERATED_ANIMATIONS_DISABLED */:
                                str = i18nString(UIStrings.compositingFailedAcceleratedAnimationsDisabled);
                                break;
                            case "EFFECT_SUPPRESSED_BY_DEVTOOLS" /* CLSInsight.AnimationFailureReasons.EFFECT_SUPPRESSED_BY_DEVTOOLS */:
                                str = i18nString(UIStrings.compositingFailedEffectSuppressedByDevtools);
                                break;
                            case "INVALID_ANIMATION_OR_EFFECT" /* CLSInsight.AnimationFailureReasons.INVALID_ANIMATION_OR_EFFECT */:
                                str = i18nString(UIStrings.compositingFailedInvalidAnimationOrEffect);
                                break;
                            case "EFFECT_HAS_UNSUPPORTED_TIMING_PARAMS" /* CLSInsight.AnimationFailureReasons.EFFECT_HAS_UNSUPPORTED_TIMING_PARAMS */:
                                str = i18nString(UIStrings.compositingFailedEffectHasUnsupportedTimingParams);
                                break;
                            case "EFFECT_HAS_NON_REPLACE_COMPOSITE_MODE" /* CLSInsight.AnimationFailureReasons.EFFECT_HAS_NON_REPLACE_COMPOSITE_MODE */:
                                str = i18nString(UIStrings.compositingFailedEffectHasNonReplaceCompositeMode);
                                break;
                            case "TARGET_HAS_INVALID_COMPOSITING_STATE" /* CLSInsight.AnimationFailureReasons.TARGET_HAS_INVALID_COMPOSITING_STATE */:
                                str = i18nString(UIStrings.compositingFailedTargetHasInvalidCompositingState);
                                break;
                            case "TARGET_HAS_INCOMPATIBLE_ANIMATIONS" /* CLSInsight.AnimationFailureReasons.TARGET_HAS_INCOMPATIBLE_ANIMATIONS */:
                                str = i18nString(UIStrings.compositingFailedTargetHasIncompatibleAnimations);
                                break;
                            case "TARGET_HAS_CSS_OFFSET" /* CLSInsight.AnimationFailureReasons.TARGET_HAS_CSS_OFFSET */:
                                str = i18nString(UIStrings.compositingFailedTargetHasCSSOffset);
                                break;
                            case "ANIMATION_AFFECTS_NON_CSS_PROPERTIES" /* CLSInsight.AnimationFailureReasons.ANIMATION_AFFECTS_NON_CSS_PROPERTIES */:
                                str = i18nString(UIStrings.compositingFailedAnimationAffectsNonCSSProperties);
                                break;
                            case "TRANSFORM_RELATED_PROPERTY_CANNOT_BE_ACCELERATED_ON_TARGET" /* CLSInsight.AnimationFailureReasons.TRANSFORM_RELATED_PROPERTY_CANNOT_BE_ACCELERATED_ON_TARGET */:
                                str = i18nString(UIStrings.compositingFailedTransformRelatedPropertyCannotBeAcceleratedOnTarget);
                                break;
                            case "TRANSFROM_BOX_SIZE_DEPENDENT" /* CLSInsight.AnimationFailureReasons.TRANSFROM_BOX_SIZE_DEPENDENT */:
                                str = i18nString(UIStrings.compositingFailedTransformDependsBoxSize);
                                break;
                            case "FILTER_RELATED_PROPERTY_MAY_MOVE_PIXELS" /* CLSInsight.AnimationFailureReasons.FILTER_RELATED_PROPERTY_MAY_MOVE_PIXELS */:
                                str = i18nString(UIStrings.compositingFailedFilterRelatedPropertyMayMovePixels);
                                break;
                            case "UNSUPPORTED_CSS_PROPERTY" /* CLSInsight.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY */:
                                str = i18nString(UIStrings.compositingFailedUnsupportedCSSProperty, {
                                    propertyCount: unsupportedProperties.size,
                                    properties: new Intl.ListFormat(undefined, { style: 'short', type: 'conjunction' })
                                        .format(unsupportedProperties),
                                });
                                break;
                            case "MIXED_KEYFRAME_VALUE_TYPES" /* CLSInsight.AnimationFailureReasons.MIXED_KEYFRAME_VALUE_TYPES */:
                                str = i18nString(UIStrings.compositingFailedMixedKeyframeValueTypes);
                                break;
                            case "TIMELINE_SOURCE_HAS_INVALID_COMPOSITING_STATE" /* CLSInsight.AnimationFailureReasons.TIMELINE_SOURCE_HAS_INVALID_COMPOSITING_STATE */:
                                str = i18nString(UIStrings.compositingFailedTimelineSourceHasInvalidCompositingState);
                                break;
                            case "ANIMATION_HAS_NO_VISIBLE_CHANGE" /* CLSInsight.AnimationFailureReasons.ANIMATION_HAS_NO_VISIBLE_CHANGE */:
                                str = i18nString(UIStrings.compositingFailedAnimationHasNoVisibleChange);
                                break;
                            case "AFFECTS_IMPORTANT_PROPERTY" /* CLSInsight.AnimationFailureReasons.AFFECTS_IMPORTANT_PROPERTY */:
                                str = i18nString(UIStrings.compositingFailedAffectsImportantProperty);
                                break;
                            case "SVG_TARGET_HAS_INDEPENDENT_TRANSFORM_PROPERTY" /* CLSInsight.AnimationFailureReasons.SVG_TARGET_HAS_INDEPENDENT_TRANSFORM_PROPERTY */:
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
            case "ParseHTML" /* Trace.Types.Events.Name.PARSE_HTML */: {
                const beginData = unsafeEventArgs['beginData'];
                const startLine = beginData['startLine'] - 1;
                const endLine = unsafeEventArgs['endData'] ? unsafeEventArgs['endData']['endLine'] - 1 : undefined;
                url = beginData['url'];
                if (url) {
                    contentHelper.appendLocationRange(i18nString(UIStrings.range), url, startLine, endLine);
                }
                break;
            }
            // @ts-expect-error Fall-through intended.
            case "FireIdleCallback" /* Trace.Types.Events.Name.FIRE_IDLE_CALLBACK */: {
                contentHelper.appendTextRow(i18nString(UIStrings.allottedTime), i18n.TimeUtilities.millisToString(unsafeEventData['allottedMilliseconds']));
                contentHelper.appendTextRow(i18nString(UIStrings.invokedByTimeout), unsafeEventData['timedOut']);
            }
            case "RequestIdleCallback" /* Trace.Types.Events.Name.REQUEST_IDLE_CALLBACK */:
            case "CancelIdleCallback" /* Trace.Types.Events.Name.CANCEL_IDLE_CALLBACK */: {
                contentHelper.appendTextRow(i18nString(UIStrings.callbackId), unsafeEventData['id']);
                if (Trace.Types.Events.isRequestIdleCallback(event)) {
                    contentHelper.appendTextRow(i18nString(UIStrings.requestIdleCallbackTimeout), i18n.TimeUtilities.preciseMillisToString(event.args.data.timeout));
                }
                break;
            }
            case "EventDispatch" /* Trace.Types.Events.Name.EVENT_DISPATCH */: {
                contentHelper.appendTextRow(i18nString(UIStrings.type), unsafeEventData['type']);
                break;
            }
            // @ts-expect-error Fall-through intended.
            case "largestContentfulPaint::Candidate" /* Trace.Types.Events.Name.MARK_LCP_CANDIDATE */: {
                contentHelper.appendTextRow(i18nString(UIStrings.type), String(unsafeEventData['type']));
                contentHelper.appendTextRow(i18nString(UIStrings.size), String(unsafeEventData['size']));
            }
            case "firstPaint" /* Trace.Types.Events.Name.MARK_FIRST_PAINT */:
            case "firstContentfulPaint" /* Trace.Types.Events.Name.MARK_FCP */:
            case "MarkLoad" /* Trace.Types.Events.Name.MARK_LOAD */:
            case "MarkDOMContent" /* Trace.Types.Events.Name.MARK_DOM_CONTENT */: {
                const adjustedEventTimeStamp = timeStampForEventAdjustedForClosestNavigationIfPossible(event, parsedTrace);
                contentHelper.appendTextRow(i18nString(UIStrings.timestamp), i18n.TimeUtilities.preciseMillisToString(adjustedEventTimeStamp, 1));
                if (Trace.Types.Events.isMarkerEvent(event)) {
                    contentHelper.appendElementRow(i18nString(UIStrings.details), TimelineUIUtils.buildDetailsNodeForMarkerEvents(event));
                }
                break;
            }
            case "EventTiming" /* Trace.Types.Events.Name.EVENT_TIMING */: {
                const detailsNode = await TimelineUIUtils.buildDetailsNodeForTraceEvent(event, targetForEvent(parsedTrace, event), linkifier, isFreshOrEnhanced, parsedTrace);
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
            default: {
                const detailsNode = await TimelineUIUtils.buildDetailsNodeForTraceEvent(event, targetForEvent(parsedTrace, event), linkifier, isFreshOrEnhanced, parsedTrace);
                if (detailsNode) {
                    contentHelper.appendElementRow(i18nString(UIStrings.details), detailsNode);
                }
                break;
            }
        }
        const relatedNodes = relatedNodesMap?.values() || [];
        for (const relatedNode of relatedNodes) {
            if (relatedNode) {
                const nodeSpan = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(relatedNode);
                contentHelper.appendElementRow(relatedNodeLabel || i18nString(UIStrings.relatedNode), nodeSpan);
            }
        }
        // @ts-expect-error TODO(crbug.com/1011811): Remove symbol usage.
        if (event[previewElementSymbol]) {
            contentHelper.addSection(i18nString(UIStrings.preview));
            // @ts-expect-error TODO(crbug.com/1011811): Remove symbol usage.
            contentHelper.appendElementRow('', event[previewElementSymbol]);
        }
        if (!entityAppended) {
            const originWithEntity = this.getOriginWithEntity(entityMapper, parsedTrace, event);
            if (originWithEntity) {
                contentHelper.appendElementRow(i18nString(UIStrings.origin), originWithEntity);
            }
        }
        const hasStackTrace = Boolean(Trace.Helpers.Trace.getStackTraceTopCallFrameInEventPayload(event));
        if (Trace.Types.Events.isUserTiming(event) || Trace.Types.Extensions.isSyntheticExtensionEntry(event) ||
            Trace.Types.Events.isProfileCall(event) || initiator || initiatorFor || hasStackTrace ||
            parsedTrace?.data.Invalidations.invalidationsForEvent.get(event)) {
            await TimelineUIUtils.generateCauses(event, contentHelper, parsedTrace);
        }
        if (Root.Runtime.experiments.isEnabled("timeline-debug-mode" /* Root.Runtime.ExperimentName.TIMELINE_DEBUG_MODE */)) {
            TimelineUIUtils.renderEventJson(event, contentHelper);
        }
        const stats = {};
        const showPieChart = canShowPieChart && TimelineUIUtils.aggregatedStatsForTraceEvent(stats, parsedTrace, event);
        if (showPieChart) {
            contentHelper.addSection(i18nString(UIStrings.aggregatedTime));
            const pieChart = TimelineUIUtils.generatePieChart(stats, TimelineUIUtils.eventStyle(event).category, selfTime);
            contentHelper.appendElementRow('', pieChart);
        }
        return contentHelper.fragment;
    }
    static statsForTimeRange(events, startTime, endTime) {
        if (!events.length) {
            return { idle: endTime - startTime };
        }
        buildRangeStatsCacheIfNeeded(events);
        const aggregatedStats = subtractStats(aggregatedStatsAtTime(endTime), aggregatedStatsAtTime(startTime));
        const aggregatedTotal = Object.values(aggregatedStats).reduce((a, b) => a + b, 0);
        aggregatedStats['idle'] = Math.max(0, endTime - startTime - aggregatedTotal);
        return aggregatedStats;
        function aggregatedStatsAtTime(time) {
            const stats = {};
            // @ts-expect-error TODO(crbug.com/1011811): Remove symbol usage.
            const cache = events[categoryBreakdownCacheSymbol];
            for (const category in cache) {
                const categoryCache = cache[category];
                const index = Platform.ArrayUtilities.upperBound(categoryCache.time, time, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
                let value;
                if (index === 0) {
                    value = 0;
                }
                else if (index === categoryCache.time.length) {
                    value = categoryCache.value[categoryCache.value.length - 1];
                }
                else {
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
        function subtractStats(a, b) {
            const result = Object.assign({}, a);
            for (const key in b) {
                result[key] -= b[key];
            }
            return result;
        }
        function buildRangeStatsCacheIfNeeded(events) {
            // @ts-expect-error TODO(crbug.com/1011811): Remove symbol usage.
            if (events[categoryBreakdownCacheSymbol]) {
                return;
            }
            // aggregatedStats is a map by categories. For each category there's an array
            // containing sorted time points which records accumulated value of the category.
            const aggregatedStats = {};
            const categoryStack = [];
            let lastTime = 0;
            Trace.Helpers.Trace.forEachEvent(events, {
                onStartEvent,
                onEndEvent,
            });
            function updateCategory(category, time) {
                let statsArrays = aggregatedStats[category];
                if (!statsArrays) {
                    statsArrays = { time: [], value: [] };
                    aggregatedStats[category] = statsArrays;
                }
                if (statsArrays.time.length && statsArrays.time[statsArrays.time.length - 1] === time || lastTime > time) {
                    return;
                }
                const lastValue = statsArrays.value.length > 0 ? statsArrays.value[statsArrays.value.length - 1] : 0;
                statsArrays.value.push(lastValue + time - lastTime);
                statsArrays.time.push(time);
            }
            function categoryChange(from, to, time) {
                if (from) {
                    updateCategory(from, time);
                }
                lastTime = time;
                if (to) {
                    updateCategory(to, time);
                }
            }
            function onStartEvent(e) {
                const { startTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(e);
                const category = Trace.Styles.getEventStyle(e.name)?.category.name ||
                    Trace.Styles.getCategoryStyles().other.name;
                const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null;
                if (category !== parentCategory) {
                    categoryChange(parentCategory || null, category, startTime);
                }
                categoryStack.push(category);
            }
            function onEndEvent(e) {
                const { endTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(e);
                const category = categoryStack.pop();
                const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null;
                if (category !== parentCategory) {
                    categoryChange(category || null, parentCategory || null, endTime || 0);
                }
            }
            const obj = events;
            // @ts-expect-error TODO(crbug.com/1011811): Remove symbol usage.
            obj[categoryBreakdownCacheSymbol] = aggregatedStats;
        }
    }
    static renderEventJson(event, contentHelper) {
        contentHelper.addSection(i18nString(UIStrings.traceEvent));
        contentHelper.appendElementRow('eventKey', new Trace.EventsSerializer.EventsSerializer().keyForEvent(event) ?? '?');
        const eventWithArgsFirst = {
            ...{ args: event.args },
            ...event,
        };
        const highlightContainer = TimelineUIUtils.renderObjectJson(eventWithArgsFirst);
        contentHelper.appendElementRow('', highlightContainer);
    }
    static renderObjectJson(obj) {
        const indentLength = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get().length;
        // Elide if the data is huge. Then remove the initial new-line for a denser UI
        const eventStr = JSON.stringify(obj, null, indentLength).slice(0, 10_000).replace(/{\n  /, '{ ');
        // Use CodeHighlighter for syntax highlighting.
        const highlightContainer = document.createElement('div');
        const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(highlightContainer, { cssFile: codeHighlighterStyles });
        const elem = shadowRoot.createChild('div');
        elem.classList.add('monospace', 'source-code');
        elem.textContent = eventStr;
        // Highlighting is done async (shrug), but we'll return the container immediately.
        void CodeHighlighter.CodeHighlighter.highlightNode(elem, 'text/javascript').then(() => {
            /**
             * Linkify any URLs within the text nodes.
             * Use a TreeWalker to find all our text nodes
             **/
            function* iterateTreeWalker(walker) {
                while (walker.nextNode()) {
                    yield walker.currentNode;
                }
            }
            const walker = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT);
            // Gather all the nodes first, then we'll potentially replace them.
            for (const node of Array.from(iterateTreeWalker(walker))) {
                const frag = TimelineUIUtils.parseStringForLinks(node.textContent || '');
                node.parentNode?.replaceChild(frag, node);
            }
        });
        return highlightContainer;
    }
    static stackTraceFromCallFrames(callFrames) {
        return { callFrames };
    }
    /** This renders a stack trace... and other cool stuff. */
    static async generateCauses(event, contentHelper, parsedTrace) {
        const { startTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
        let initiatorStackLabel = i18nString(UIStrings.initiatorStackTrace);
        let stackLabel = i18nString(UIStrings.functionStack);
        const stackTraceForEvent = Trace.Extras.StackTraceForEvent.get(event, parsedTrace.data);
        if (stackTraceForEvent?.callFrames.length || stackTraceForEvent?.description || stackTraceForEvent?.parent) {
            contentHelper.addSection(i18nString(UIStrings.functionStack));
            await contentHelper.createChildStackTraceElement(stackTraceForEvent);
            // TODO(andoli): also build stack trace component for other events
            // that have a stack trace using the StackTraceForEvent helper.
        }
        else {
            const stackTrace = Trace.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event);
            if (stackTrace?.length) {
                contentHelper.addSection(stackLabel);
                await contentHelper.createChildStackTraceElement(TimelineUIUtils.stackTraceFromCallFrames(stackTrace));
            }
        }
        switch (event.name) {
            case "TimerFire" /* Trace.Types.Events.Name.TIMER_FIRE */:
                initiatorStackLabel = i18nString(UIStrings.timerInstalled);
                break;
            case "FireAnimationFrame" /* Trace.Types.Events.Name.FIRE_ANIMATION_FRAME */:
                initiatorStackLabel = i18nString(UIStrings.animationFrameRequested);
                break;
            case "FireIdleCallback" /* Trace.Types.Events.Name.FIRE_IDLE_CALLBACK */:
                initiatorStackLabel = i18nString(UIStrings.idleCallbackRequested);
                break;
            case "UpdateLayoutTree" /* Trace.Types.Events.Name.RECALC_STYLE */:
                initiatorStackLabel = i18nString(UIStrings.firstInvalidated);
                stackLabel = i18nString(UIStrings.recalculationForced);
                break;
            case "Layout" /* Trace.Types.Events.Name.LAYOUT */:
                initiatorStackLabel = i18nString(UIStrings.firstLayoutInvalidation);
                stackLabel = i18nString(UIStrings.layoutForced);
                break;
        }
        const initiator = parsedTrace.data.Initiators.eventToInitiator.get(event);
        const initiatorFor = parsedTrace.data.Initiators.initiatorToEvents.get(event);
        const invalidations = parsedTrace.data.Invalidations.invalidationsForEvent.get(event);
        if (initiator) {
            // If we have an initiator for the event, we can show its stack trace, a link to reveal the initiator,
            // and the time since the initiator (Pending For).
            const stackTrace = Trace.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(initiator);
            if (stackTrace) {
                contentHelper.addSection(initiatorStackLabel);
                await contentHelper.createChildStackTraceElement(TimelineUIUtils.stackTraceFromCallFrames(stackTrace));
            }
            const link = this.createEntryLink(initiator);
            contentHelper.appendElementRow(i18nString(UIStrings.initiatedBy), link);
            const { startTime: initiatorStartTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(initiator);
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
        if (invalidations?.length) {
            const totalInvalidations = parsedTrace.data.Invalidations.invalidationCountForEvent.get(event) ??
                0; // Won't be 0, but saves us dealing with undefined.
            contentHelper.addSection(i18nString(UIStrings.invalidations, { PH1: totalInvalidations }));
            await TimelineUIUtils.generateInvalidationsList(invalidations, contentHelper);
        }
    }
    static createEntryLink(entry) {
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
                if (event.key === Platform.KeyboardUtilities.ENTER_KEY) {
                    TimelinePanel.instance().select(selectionFromEvent(entry));
                    event.consume(true);
                }
            });
        }
        if (isEntryHidden) {
            link.textContent = this.eventTitle(entry) + ' ' + i18nString(UIStrings.entryIsHidden);
        }
        else if (isEntryOutsideBreadcrumb) {
            link.textContent = this.eventTitle(entry) + ' ' + i18nString(UIStrings.outsideBreadcrumbRange);
        }
        else {
            link.textContent = this.eventTitle(entry);
        }
        return link;
    }
    static async generateInvalidationsList(invalidations, contentHelper) {
        const { groupedByReason, backendNodeIds } = TimelineComponents.DetailsView.generateInvalidationsList(invalidations);
        let relatedNodesMap = null;
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const domModel = target?.model(SDK.DOMModel.DOMModel);
        if (domModel) {
            relatedNodesMap = await domModel.pushNodesByBackendIdsToFrontend(backendNodeIds);
        }
        Object.keys(groupedByReason).forEach(reason => {
            TimelineUIUtils.generateInvalidationsForReason(reason, groupedByReason[reason], relatedNodesMap, contentHelper);
        });
    }
    static generateInvalidationsForReason(reason, invalidations, relatedNodesMap, contentHelper) {
        function createLinkForInvalidationNode(invalidation) {
            const node = (invalidation.args.data.nodeId && relatedNodesMap) ?
                relatedNodesMap.get(invalidation.args.data.nodeId) :
                null;
            if (node) {
                const nodeSpan = document.createElement('span');
                nodeSpan.appendChild(PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node));
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
        const generatedItems = new Set();
        for (const invalidation of invalidations) {
            const stackTrace = Trace.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(invalidation);
            let scriptLink = null;
            const callFrame = stackTrace?.at(0);
            if (callFrame) {
                scriptLink = contentHelper.linkifier()?.maybeLinkifyScriptLocation(SDK.TargetManager.TargetManager.instance().rootTarget(), callFrame.scriptId, callFrame.url, callFrame.lineNumber) ||
                    null;
            }
            const niceNodeLink = createLinkForInvalidationNode(invalidation);
            const text = scriptLink ?
                uiI18n.getFormatLocalizedString(str_, UIStrings.invalidationWithCallFrame, { PH1: niceNodeLink, PH2: scriptLink }) :
                niceNodeLink;
            // Sometimes we can get different Invalidation events which cause
            // the same text for the same element for the same reason to be
            // generated. Rather than show the user duplicates, if we have
            // generated text that looks identical to this before, we will
            // bail.
            const generatedText = (typeof text === 'string' ? text : text.innerText);
            if (generatedItems.has(generatedText)) {
                continue;
            }
            generatedItems.add(generatedText);
            contentHelper.appendElementRow(reason, text);
        }
    }
    /** Populates the passed object then returns true/false if it makes sense to show the pie chart */
    static aggregatedStatsForTraceEvent(total, parsedTrace, event) {
        const node = parsedTrace.data.Renderer.entryToNode.get(event);
        if (!node) {
            return false;
        }
        // If the event has no children, we cannot calculate a pie chart.
        if (node.children.length === 0) {
            return false;
        }
        const childNodesToVisit = [...node.children];
        while (childNodesToVisit.length) {
            // Traversal order doesn't matter, pop() is more efficient than shift().
            const childNode = childNodesToVisit.pop();
            if (!childNode) {
                continue;
            }
            const childSelfTime = childNode.selfTime ?? 0;
            if (childSelfTime > 0) {
                const categoryName = TimelineUIUtils.eventStyle(childNode.entry).category.name;
                total[categoryName] = (total[categoryName] || 0) + childSelfTime;
            }
            childNodesToVisit.push(...childNode.children);
        }
        if (Trace.Types.Events.isPhaseAsync(event.ph)) {
            let aggregatedTotal = 0;
            for (const categoryName in total) {
                aggregatedTotal += total[categoryName];
            }
            const { startTime, endTime } = Trace.Helpers.Timing.eventTimingsMicroSeconds(event);
            const deltaInMicro = (endTime - startTime);
            total['idle'] = Math.max(0, deltaInMicro - aggregatedTotal);
            return false;
        }
        for (const categoryName in total) {
            const value = total[categoryName];
            // Up until now we've kept the math all in micro integers. Finally switch these sums to milli.
            total[categoryName] = Trace.Helpers.Timing.microToMilli(value);
        }
        return true;
    }
    static async buildPicturePreviewContent(parsedTrace, event, target) {
        const snapshotEvent = parsedTrace.data.LayerTree.paintsToSnapshots.get(event);
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
        const imageURL = await imageURLPromise;
        if (!imageURL) {
            return null;
        }
        const stylesContainer = document.createElement('div');
        const shadowRoot = stylesContainer.attachShadow({ mode: 'open' });
        shadowRoot.createChild('style').textContent = imagePreviewStyles;
        const container = shadowRoot.createChild('div');
        container.classList.add('image-preview-container', 'vbox', 'link');
        const img = container.createChild('img');
        img.src = imageURL;
        img.alt = LegacyComponents.ImagePreview.ImagePreview.defaultAltTextForImageURL(imageURL);
        const paintProfilerButton = container.createChild('a');
        paintProfilerButton.textContent = i18nString(UIStrings.paintProfiler);
        UI.ARIAUtils.markAsLink(container);
        container.tabIndex = 0;
        container.addEventListener('click', () => TimelinePanel.instance().select(selectionFromEvent(event)), false);
        container.addEventListener('keydown', keyEvent => {
            if (keyEvent.key === Platform.KeyboardUtilities.ENTER_KEY) {
                TimelinePanel.instance().select(selectionFromEvent(event));
                keyEvent.consume(true);
            }
        });
        return stylesContainer;
    }
    static createEventDivider(event, zeroTime) {
        const eventDivider = document.createElement('div');
        eventDivider.classList.add('resources-event-divider');
        const { startTime: eventStartTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
        const startTime = i18n.TimeUtilities.millisToString(eventStartTime - zeroTime);
        UI.Tooltip.Tooltip.install(eventDivider, i18nString(UIStrings.sAtS, { PH1: TimelineUIUtils.eventTitle(event), PH2: startTime }));
        const style = TimelineUIUtils.markerStyleForEvent(event);
        if (style.tall) {
            eventDivider.style.backgroundColor = style.color;
        }
        return eventDivider;
    }
    static visibleEventsFilter() {
        return new Trace.Extras.TraceFilter.VisibleEventsFilter(Trace.Styles.visibleTypes());
    }
    // Included only for layout tests.
    // TODO(crbug.com/1386091): Fix/port layout tests and remove.
    static categories() {
        return Trace.Styles.getCategoryStyles();
    }
    static generatePieChart(aggregatedStats, selfCategory, selfTime) {
        let total = 0;
        for (const categoryName in aggregatedStats) {
            total += aggregatedStats[categoryName];
        }
        const element = document.createElement('div');
        element.classList.add('timeline-details-view-pie-chart-wrapper');
        element.classList.add('hbox');
        const pieChart = new PerfUI.PieChart.PieChart();
        const slices = [];
        function appendLegendRow(title, value, color) {
            if (!value) {
                return;
            }
            slices.push({ value, color, title });
        }
        // In case of self time, first add self, then children of the same category.
        if (selfCategory) {
            const selfTimeMilli = Trace.Helpers.Timing.microToMilli(selfTime || 0);
            if (selfTime) {
                appendLegendRow(i18nString(UIStrings.sSelf, { PH1: selfCategory.title }), selfTimeMilli, selfCategory.getCSSValue());
            }
            // Children of the same category.
            const categoryTime = aggregatedStats[selfCategory.name];
            const value = categoryTime - (selfTimeMilli || 0);
            if (value > 0) {
                appendLegendRow(i18nString(UIStrings.sChildren, { PH1: selfCategory.title }), value, selfCategory.getCSSValue());
            }
        }
        // Add other categories.
        for (const categoryName in Trace.Styles.getCategoryStyles()) {
            const category = Trace.Styles.getCategoryStyles()[categoryName];
            if (categoryName === selfCategory?.name) {
                // Do not add an entry for this event's self category because 2
                // entries for it where added just before this for loop (for
                // self and children times).
                continue;
            }
            appendLegendRow(category.title, aggregatedStats[category.name], category.getCSSValue());
        }
        pieChart.data = {
            chartName: i18nString(UIStrings.timeSpentInRendering),
            size: 110,
            formatter: (value) => i18n.TimeUtilities.preciseMillisToString(value),
            showLegend: true,
            total,
            slices,
        };
        const pieChartContainer = element.createChild('div', 'vbox');
        pieChartContainer.appendChild(pieChart);
        return element;
    }
    // Generates a Summary component given a aggregated stats for categories.
    static generateSummaryDetails(aggregatedStats, rangeStart, rangeEnd, selectedEvents, thirdPartyTree) {
        const element = document.createElement('div');
        element.classList.add('timeline-details-range-summary', 'hbox');
        // First, the category bar chart.
        let total = 0;
        let categories = [];
        // Calculate total of all categories.
        for (const categoryName in aggregatedStats) {
            total += aggregatedStats[categoryName];
        }
        // Get stats values from categories.
        for (const categoryName in Trace.Styles.getCategoryStyles()) {
            const category = Trace.Styles.getCategoryStyles()[categoryName];
            if (category.name === Trace.Styles.EventCategory.IDLE) {
                continue;
            }
            const value = aggregatedStats[category.name];
            if (!value) {
                continue;
            }
            const title = category.title;
            const color = category.getCSSValue();
            categories.push({ value, color, title });
        }
        // Keeps the most useful categories on top.
        categories = categories.sort((a, b) => b.value - a.value);
        const start = Trace.Types.Timing.Milli(rangeStart);
        const end = Trace.Types.Timing.Milli(rangeEnd);
        const categorySummaryTable = new TimelineComponents.TimelineSummary.CategorySummary();
        categorySummaryTable.rangeStart = start;
        categorySummaryTable.rangeEnd = end;
        categorySummaryTable.total = total;
        categorySummaryTable.categories = categories;
        element.append(categorySummaryTable.contentElement);
        // Add the 3p datagrid
        const treeView = new ThirdPartyTreeView.ThirdPartyTreeElement();
        treeView.treeView = thirdPartyTree;
        UI.ARIAUtils.setLabel(treeView, i18nString(UIStrings.thirdPartyTable));
        element.append(treeView);
        return element;
    }
    static generateDetailsContentForFrame(frame, filmStrip, filmStripFrame) {
        const contentHelper = new TimelineDetailsContentHelper(null, null);
        contentHelper.addSection(i18nString(UIStrings.frame));
        const duration = TimelineUIUtils.frameDuration(frame);
        contentHelper.appendElementRow(i18nString(UIStrings.duration), duration);
        if (filmStrip && filmStripFrame) {
            const filmStripPreview = document.createElement('div');
            filmStripPreview.classList.add('timeline-filmstrip-preview');
            // TODO(paulirish): Adopt Util.ImageCache
            const uri = Trace.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(filmStripFrame.screenshotEvent);
            void UI.UIUtils.loadImage(uri).then(image => image && filmStripPreview.appendChild(image));
            contentHelper.appendElementRow('', filmStripPreview);
            filmStripPreview.addEventListener('click', frameClicked.bind(null, filmStrip, filmStripFrame), false);
        }
        function frameClicked(filmStrip, filmStripFrame) {
            PerfUI.FilmStripView.Dialog.fromFilmStrip(filmStrip, filmStripFrame.index);
        }
        return contentHelper.fragment;
    }
    static frameDuration(frame) {
        const offsetMilli = Trace.Helpers.Timing.microToMilli(frame.startTimeOffset);
        const durationMilli = Trace.Helpers.Timing.microToMilli(Trace.Types.Timing.Micro(frame.endTime - frame.startTime));
        const durationText = i18nString(UIStrings.sAtSParentheses, {
            PH1: i18n.TimeUtilities.millisToString(durationMilli, true),
            PH2: i18n.TimeUtilities.millisToString(offsetMilli, true),
        });
        return uiI18n.getFormatLocalizedString(str_, UIStrings.emptyPlaceholder, { PH1: durationText });
    }
    static quadWidth(quad) {
        return Math.round(Math.sqrt(Math.pow(quad[0] - quad[2], 2) + Math.pow(quad[1] - quad[3], 2)));
    }
    static quadHeight(quad) {
        return Math.round(Math.sqrt(Math.pow(quad[0] - quad[6], 2) + Math.pow(quad[1] - quad[7], 2)));
    }
    static eventDispatchDesciptors() {
        if (eventDispatchDesciptors) {
            return eventDispatchDesciptors;
        }
        const lightOrange = 'hsl(40,100%,80%)';
        const orange = 'hsl(40,100%,50%)';
        const green = 'hsl(90,100%,40%)';
        const purple = 'hsl(256,100%,75%)';
        eventDispatchDesciptors = [
            new EventDispatchTypeDescriptor(1, lightOrange, ['mousemove', 'mouseenter', 'mouseleave', 'mouseout', 'mouseover']),
            new EventDispatchTypeDescriptor(1, lightOrange, ['pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'pointermove']),
            new EventDispatchTypeDescriptor(2, green, ['wheel']),
            new EventDispatchTypeDescriptor(3, orange, ['click', 'mousedown', 'mouseup']),
            new EventDispatchTypeDescriptor(3, orange, ['touchstart', 'touchend', 'touchmove', 'touchcancel']),
            new EventDispatchTypeDescriptor(3, orange, ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture']),
            new EventDispatchTypeDescriptor(3, purple, ['keydown', 'keyup', 'keypress']),
        ];
        return eventDispatchDesciptors;
    }
    static markerStyleForEvent(event) {
        // Note: keep the colors matching that of `markerDetailsForEvent`.
        const tallMarkerDashStyle = [6, 4];
        const title = TimelineUIUtils.eventTitle(event);
        if (event.name !== "navigationStart" /* Trace.Types.Events.Name.NAVIGATION_START */ &&
            (Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.Console) ||
                Trace.Helpers.Trace.eventHasCategory(event, Trace.Types.Events.Categories.UserTiming))) {
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
            case "navigationStart" /* Trace.Types.Events.Name.NAVIGATION_START */:
                color = 'var(--color-text-primary)';
                tall = true;
                break;
            case "FrameStartedLoading" /* Trace.Types.Events.Name.FRAME_STARTED_LOADING */:
                color = 'green';
                tall = true;
                break;
            case "MarkDOMContent" /* Trace.Types.Events.Name.MARK_DOM_CONTENT */:
                color = 'var(--color-text-disabled)';
                tall = true;
                break;
            case "MarkLoad" /* Trace.Types.Events.Name.MARK_LOAD */:
                color = 'var(--color-text-disabled)';
                tall = true;
                break;
            case "firstPaint" /* Trace.Types.Events.Name.MARK_FIRST_PAINT */:
                color = '#228847';
                tall = true;
                break;
            case "firstContentfulPaint" /* Trace.Types.Events.Name.MARK_FCP */:
                color = 'var(--sys-color-green-bright)';
                tall = true;
                break;
            case "largestContentfulPaint::Candidate" /* Trace.Types.Events.Name.MARK_LCP_CANDIDATE */:
                color = 'var(--sys-color-green)';
                tall = true;
                break;
            case "TimeStamp" /* Trace.Types.Events.Name.TIME_STAMP */:
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
    static colorForId(id) {
        if (!colorGenerator) {
            colorGenerator =
                new Common.Color.Generator({ min: 30, max: 330, count: undefined }, { min: 50, max: 80, count: 3 }, 85);
            colorGenerator.setColorForID('', '#f2ecdc');
        }
        return colorGenerator.colorForID(id);
    }
    static displayNameForFrame(frame, trimAt = 80) {
        const url = frame.url;
        return Common.ParsedURL.schemeIs(url, 'about:') ? `"${Platform.StringUtilities.trimMiddle(frame.name, trimAt)}"` :
            frame.url.slice(0, trimAt);
    }
    static getOriginWithEntity(entityMapper, parsedTrace, event) {
        const resolvedURL = SourceMapsResolver.SourceMapsResolver.resolvedURLForEntry(parsedTrace, event);
        if (!resolvedURL) {
            return null;
        }
        const parsedUrl = URL.parse(resolvedURL);
        if (!parsedUrl) {
            return null;
        }
        const entity = entityMapper?.entityForEvent(event) ?? null;
        if (!entity) {
            return null;
        }
        const originWithEntity = Utils.Helpers.formatOriginWithEntity(parsedUrl, entity, true);
        return originWithEntity;
    }
}
export const aggregatedStatsKey = Symbol('aggregatedStats');
export const previewElementSymbol = Symbol('previewElement');
export class EventDispatchTypeDescriptor {
    priority;
    color;
    eventTypes;
    constructor(priority, color, eventTypes) {
        this.priority = priority;
        this.color = color;
        this.eventTypes = eventTypes;
    }
}
export class TimelineDetailsContentHelper {
    fragment;
    #linkifier;
    target;
    element;
    tableElement;
    constructor(target, linkifier) {
        this.fragment = document.createDocumentFragment();
        this.#linkifier = linkifier;
        this.target = target;
        this.element = document.createElement('div');
        this.element.classList.add('timeline-details-view-block');
        this.tableElement = this.element.createChild('div', 'vbox timeline-details-chip-body');
        this.fragment.appendChild(this.element);
    }
    addSection(title, swatchColor, event) {
        if (!this.tableElement.hasChildNodes()) {
            this.element.removeChildren();
        }
        else {
            this.element = document.createElement('div');
            this.element.classList.add('timeline-details-view-block');
            this.fragment.appendChild(this.element);
        }
        if (title) {
            const titleElement = this.element.createChild('div', 'timeline-details-chip-title');
            if (swatchColor) {
                titleElement.createChild('div').style.backgroundColor = swatchColor;
            }
            const textChild = titleElement.createChild('span');
            textChild.textContent = title;
            if (event) {
                textChild.classList.add('timeline-details-chip-title-reveal-entry');
                textChild.addEventListener('click', function () {
                    TimelinePanel.instance().zoomEvent(event);
                });
            }
        }
        this.tableElement = this.element.createChild('div', 'vbox timeline-details-chip-body');
        this.fragment.appendChild(this.element);
    }
    linkifier() {
        return this.#linkifier;
    }
    appendTextRow(title, value) {
        const rowElement = this.tableElement.createChild('div', 'timeline-details-view-row');
        rowElement.createChild('div', 'timeline-details-view-row-title').textContent = title;
        rowElement.createChild('div', 'timeline-details-view-row-value').textContent = value.toString();
    }
    appendElementRow(title, content, isWarning, isStacked) {
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
        }
        else {
            UI.UIUtils.createTextChild(valueElement, content || '');
        }
    }
    appendLocationRow(title, url, startLine, startColumn, text, omitOrigin) {
        if (!this.#linkifier) {
            return;
        }
        const options = {
            tabStop: true,
            columnNumber: startColumn,
            showColumnNumber: true,
            inlineFrameIndex: 0,
            text,
            omitOrigin,
        };
        const link = this.#linkifier.maybeLinkifyScriptLocation(this.target, null, url, startLine, options);
        if (!link) {
            return;
        }
        this.appendElementRow(title, link);
    }
    appendLocationRange(title, url, startLine, endLine) {
        if (!this.#linkifier || !this.target) {
            return;
        }
        const locationContent = document.createElement('span');
        const link = this.#linkifier.maybeLinkifyScriptLocation(this.target, null, url, startLine, { tabStop: true, inlineFrameIndex: 0 });
        if (!link) {
            return;
        }
        locationContent.appendChild(link);
        UI.UIUtils.createTextChild(locationContent, Platform.StringUtilities.sprintf(' [%s…%s]', startLine + 1, (endLine || 0) + 1 || ''));
        this.appendElementRow(title, locationContent);
    }
    async createChildStackTraceElement(runtimeStackTrace) {
        if (!this.#linkifier) {
            return;
        }
        let callFrameContents;
        if (this.target) {
            const stackTrace = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
                .createStackTraceFromProtocolRuntime(runtimeStackTrace, this.target);
            callFrameContents = new LegacyComponents.JSPresentationUtils.StackTracePreviewContent(undefined, this.target ?? undefined, this.#linkifier, { tabStops: true, showColumnNumber: true });
            callFrameContents.stackTrace = stackTrace;
            await callFrameContents.updateComplete;
        }
        else {
            // I _think_ this only happens during tests.
            // See "TimelineFlameChartView > shows the details for a selected main thread event".
            // For now, just defer to the still-supported legacy runtime stack trace. When
            // that is removed, we could instead create a stub StackTrace ourselves, even
            // without a `target`.
            callFrameContents = new LegacyComponents.JSPresentationUtils.StackTracePreviewContent(undefined, this.target ?? undefined, this.#linkifier, { runtimeStackTrace, tabStops: true, showColumnNumber: true });
        }
        const stackTraceElement = this.tableElement.createChild('div', 'timeline-details-view-row timeline-details-stack-values');
        callFrameContents.markAsRoot();
        callFrameContents.show(stackTraceElement);
    }
}
export const categoryBreakdownCacheSymbol = Symbol('categoryBreakdownCache');
/**
 * Given a particular event, this method can adjust its timestamp by
 * substracting the timestamp of the previous navigation. This helps in cases
 * where the user has navigated multiple times in the trace, so that we can show
 * the LCP (for example) relative to the last navigation.
 **/
export function timeStampForEventAdjustedForClosestNavigationIfPossible(event, parsedTrace) {
    if (!parsedTrace) {
        const { startTime } = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
        return startTime;
    }
    const time = Trace.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(event, parsedTrace.data.Meta.traceBounds, parsedTrace.data.Meta.navigationsByNavigationId, parsedTrace.data.Meta.navigationsByFrameId);
    return Trace.Helpers.Timing.microToMilli(time);
}
/**
 * Determines if an event is potentially a marker event. A marker event here
 * is a single moment in time that we want to highlight on the timeline, such as
 * the LCP time. This method does not filter out events: for example, it treats
 * every LCP Candidate event as a potential marker event.
 **/
export function isMarkerEvent(parsedTrace, event) {
    const { Name } = Trace.Types.Events;
    if (event.name === "TimeStamp" /* Name.TIME_STAMP */ || event.name === "navigationStart" /* Name.NAVIGATION_START */) {
        return true;
    }
    if (Trace.Types.Events.isFirstContentfulPaint(event) || Trace.Types.Events.isFirstPaint(event)) {
        return event.args.frame === parsedTrace.data.Meta.mainFrameId;
    }
    if (Trace.Types.Events.isMarkDOMContent(event) || Trace.Types.Events.isMarkLoad(event) ||
        Trace.Types.Events.isLargestContentfulPaintCandidate(event)) {
        // isOutermostMainFrame was added in 2022, so we fallback to isMainFrame
        // for older traces.
        if (!event.args.data) {
            return false;
        }
        const { isOutermostMainFrame, isMainFrame } = event.args.data;
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
function getEventSelfTime(event, parsedTrace) {
    const mapToUse = Trace.Types.Extensions.isSyntheticExtensionEntry(event) ?
        parsedTrace.data.ExtensionTraceData.entryToNode :
        parsedTrace.data.Renderer.entryToNode;
    const selfTime = mapToUse.get(event)?.selfTime;
    return selfTime ? selfTime : Trace.Types.Timing.Micro(0);
}
//# sourceMappingURL=TimelineUIUtils.js.map