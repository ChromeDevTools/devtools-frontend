// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
import * as LiveMetrics from '../../models/live-metrics/live-metrics.js';
import * as Trace from '../../models/trace/trace.js';
import * as PanelCommon from '../../panels/common/common.js';
import * as Tracing from '../../services/tracing/tracing.js';
import * as RecordingMetadata from './RecordingMetadata.js';
const UIStrings = {
    /**
     * @description Text in Timeline Controller of the Performance panel indicating that the Performance Panel cannot
     * record a performance trace because the type of target (where possible types are page, service worker and shared
     * worker) doesn't support it.
     */
    tracingNotSupported: 'Performance trace recording not supported for this type of target',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineController {
    primaryPageTarget;
    rootTarget;
    tracingManager;
    #collectedEvents = [];
    #navigationUrls = [];
    #fieldData = null;
    #recordingStartTime = null;
    client;
    tracingCompletePromise = null;
    /**
     * We always need to profile against the DevTools root target, which is
     * the target that DevTools is attached to.
     *
     * In most cases, this will be the tab that DevTools is inspecting.
     * Now pre-rendering is active, tabs can have multiple pages - only one
     * of which the user is being shown. This is the "primary page" and hence
     * why in code we have "primaryPageTarget". When there's a prerendered
     * page in a background, tab target would have multiple subtargets, one
     * of them being primaryPageTarget.
     *
     * The problems with using primary page target for tracing are:
     * 1. Performance trace doesn't include information from the other pages on
     *    the tab which is probably not what the user wants as it does not
     *    reflect reality.
     * 2. Capturing trace never finishes after prerendering activation as
     *    we've started on one target and ending on another one, and
     *    tracingComplete event never gets processed.
     *
     * However, when we want to look at the URL of the current page, we need
     * to use the primaryPageTarget to ensure we get the URL of the tab and
     * the tab's page that is being shown to the user. This is because the tab
     * target (which is what rootTarget is) only exposes the Target and Tracing
     * domains. We need the Page target to navigate as it implements the Page
     * domain. That is why here we have to store both.
     **/
    constructor(rootTarget, primaryPageTarget, client) {
        this.primaryPageTarget = primaryPageTarget;
        this.rootTarget = rootTarget;
        // Ensure the tracing manager is the one for the Root Target, NOT the
        // primaryPageTarget, as that is the one we have to invoke tracing against.
        this.tracingManager = rootTarget.model(Tracing.TracingManager.TracingManager);
        this.client = client;
    }
    async dispose() {
        if (this.tracingManager) {
            await this.tracingManager.reset();
        }
    }
    async startRecording(options) {
        function disabledByDefault(category) {
            return 'disabled-by-default-' + category;
        }
        // The following categories are also used in other tools, but this panel
        // offers the possibility of turning them off (see below).
        // 'disabled-by-default-devtools.screenshot'
        //   └ default: on, option: captureFilmStrip
        // 'disabled-by-default-devtools.timeline.invalidationTracking'
        //   └ default: off, experiment: timelineInvalidationTracking
        // 'disabled-by-default-v8.cpu_profiler'
        //   └ default: on, option: enableJSSampling
        const categoriesArray = [
            Root.Runtime.experiments.isEnabled('timeline-show-all-events') ? '*' : '-*',
            Trace.Types.Events.Categories.Console,
            Trace.Types.Events.Categories.Loading,
            Trace.Types.Events.Categories.UserTiming,
            'devtools.timeline',
            disabledByDefault('devtools.target-rundown'),
            disabledByDefault('devtools.timeline.frame'),
            disabledByDefault('devtools.timeline.stack'),
            disabledByDefault('devtools.timeline'),
            disabledByDefault('devtools.v8-source-rundown-sources'),
            disabledByDefault('devtools.v8-source-rundown'),
            disabledByDefault('layout_shift.debug'),
            // Looking for disabled-by-default-v8.compile? We disabled it: crbug.com/414330508.
            disabledByDefault('v8.inspector'),
            disabledByDefault('v8.cpu_profiler.hires'),
            disabledByDefault('lighthouse'),
            'v8.execute',
            'v8',
            'cppgc',
            'navigation,rail',
        ];
        if (Root.Runtime.experiments.isEnabled('timeline-v8-runtime-call-stats') && options.enableJSSampling) {
            categoriesArray.push(disabledByDefault('v8.runtime_stats_sampling'));
        }
        if (options.enableJSSampling) {
            categoriesArray.push(disabledByDefault('v8.cpu_profiler'));
        }
        if (Root.Runtime.experiments.isEnabled('timeline-invalidation-tracking')) {
            categoriesArray.push(disabledByDefault('devtools.timeline.invalidationTracking'));
        }
        if (options.capturePictures) {
            categoriesArray.push(disabledByDefault('devtools.timeline.layers'), disabledByDefault('devtools.timeline.picture'), disabledByDefault('blink.graphics_context_annotations'));
        }
        if (options.captureFilmStrip) {
            categoriesArray.push(disabledByDefault('devtools.screenshot'));
        }
        if (options.captureSelectorStats) {
            categoriesArray.push(disabledByDefault('blink.debug'));
            // enable invalidation nodes
            categoriesArray.push(disabledByDefault('devtools.timeline.invalidationTracking'));
        }
        await LiveMetrics.LiveMetrics.instance().disable();
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onFrameNavigated, this);
        this.#navigationUrls = [];
        this.#fieldData = null;
        this.#recordingStartTime = Date.now();
        const response = await this.startRecordingWithCategories(categoriesArray.join(','));
        if (response.getError()) {
            await SDK.TargetManager.TargetManager.instance().resumeAllTargets();
        }
        return response;
    }
    async #onFrameNavigated(event) {
        if (!event.data.isPrimaryFrame()) {
            return;
        }
        this.#navigationUrls.push(event.data.url);
    }
    async stopRecording() {
        if (this.tracingManager) {
            this.tracingManager.stop();
        }
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onFrameNavigated, this);
        // When throttling is applied to the main renderer, it can slow down the
        // collection of trace events once tracing has completed. Therefore we
        // temporarily disable throttling whilst the final trace event collection
        // takes place. Once it is done, we re-enable it (this is the existing
        // behaviour within DevTools; the throttling settling is sticky + global).
        const throttlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
        const optionDuringRecording = throttlingManager.cpuThrottlingOption();
        throttlingManager.setCPUThrottlingOption(SDK.CPUThrottlingManager.NoThrottlingOption);
        this.client.loadingStarted();
        // Give `TimelinePanel.#executeNewTrace` a chance to retain source maps from SDK.SourceMap.SourceMapManager.
        SDK.SourceMap.SourceMap.retainRawSourceMaps = true;
        const [fieldData] = await Promise
            .all([
            this.fetchFieldData(),
            // TODO(crbug.com/366072294): Report the progress of this resumption, as it can be lengthy on heavy pages.
            SDK.TargetManager.TargetManager.instance().resumeAllTargets(),
            this.waitForTracingToStop(),
        ])
            .catch(e => {
            // Normally set false in allSourcesFinished, but just in case something fails, catch it here.
            SDK.SourceMap.SourceMap.retainRawSourceMaps = false;
            throw e;
        });
        this.#fieldData = fieldData;
        // Now we re-enable throttling again to maintain the setting being persistent.
        throttlingManager.setCPUThrottlingOption(optionDuringRecording);
        await this.allSourcesFinished();
        await LiveMetrics.LiveMetrics.instance().enable();
    }
    async fetchFieldData() {
        const cruxManager = CrUXManager.CrUXManager.instance();
        if (!cruxManager.isEnabled() || !navigator.onLine) {
            return null;
        }
        const urls = [...new Set(this.#navigationUrls)];
        return await Promise.all(urls.map(url => cruxManager.getFieldDataForPage(url)));
    }
    async waitForTracingToStop() {
        if (this.tracingManager) {
            await this.tracingCompletePromise?.promise;
        }
    }
    async startRecordingWithCategories(categories) {
        if (!this.tracingManager) {
            throw new Error(i18nString(UIStrings.tracingNotSupported));
        }
        // There might be a significant delay in the beginning of timeline recording
        // caused by starting CPU profiler, that needs to traverse JS heap to collect
        // all the functions data.
        await SDK.TargetManager.TargetManager.instance().suspendAllTargets('performance-timeline');
        this.tracingCompletePromise = Promise.withResolvers();
        const response = await this.tracingManager.start(this, categories);
        await this.warmupJsProfiler();
        PanelCommon.ExtensionServer.ExtensionServer.instance().profilingStarted();
        return response;
    }
    // CPUProfiler::StartProfiling has a non-trivial cost and we'd prefer it not happen within an
    // interaction as that complicates debugging interaction latency.
    // To trigger the StartProfiling interrupt and get the warmup cost out of the way, we send a
    // very soft invocation to V8.https://crbug.com/1358602
    async warmupJsProfiler() {
        // primaryPageTarget has RuntimeModel whereas rootTarget (Tab) does not.
        const runtimeModel = this.primaryPageTarget.model(SDK.RuntimeModel.RuntimeModel);
        if (!runtimeModel) {
            return;
        }
        await runtimeModel.agent.invoke_evaluate({
            expression: '(async function(){ await 1; })()',
            throwOnSideEffect: true,
        });
    }
    traceEventsCollected(events) {
        this.#collectedEvents.push(...events);
    }
    tracingComplete() {
        if (!this.tracingCompletePromise) {
            return;
        }
        this.tracingCompletePromise.resolve(undefined);
        this.tracingCompletePromise = null;
    }
    async allSourcesFinished() {
        PanelCommon.ExtensionServer.ExtensionServer.instance().profilingStopped();
        this.client.processingStarted();
        const metadata = await RecordingMetadata.forTrace({
            recordingStartTime: this.#recordingStartTime ?? undefined,
            cruxFieldData: this.#fieldData ?? undefined,
        });
        await this.client.loadingComplete(this.#collectedEvents, /* exclusiveFilter= */ null, metadata);
        this.client.loadingCompleteForTest();
        SDK.SourceMap.SourceMap.retainRawSourceMaps = false;
    }
    tracingBufferUsage(usage) {
        this.client.recordingProgress(usage);
    }
    eventsRetrievalProgress(progress) {
        this.client.loadingProgress(progress);
    }
}
//# sourceMappingURL=TimelineController.js.map