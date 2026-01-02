// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
import * as LiveMetrics from '../../models/live-metrics/live-metrics.js';
import * as Trace from '../../models/trace/trace.js';
import * as PanelCommon from '../../panels/common/common.js';
import * as Tracing from '../../services/tracing/tracing.js';

import * as RecordingMetadata from './RecordingMetadata.js';

const UIStrings = {
  /**
   * @description Text in Timeline Panel of the Performance panel
   */
  initializingTracing: 'Initializing tracing…',
  /**
   * @description Text to indicate the progress of a trace. Informs the user that we are currently
   * creating a performance trace.
   */
  tracing: 'Tracing…',
  /**
   * @description Text in Timeline Controller of the Performance panel indicating that the Performance Panel cannot
   * record a performance trace because the type of target (where possible types are page, service worker and shared
   * worker) doesn't support it.
   */
  tracingNotSupported: 'Performance trace recording not supported for this type of target',
  /**
   * @description Text in a status dialog shown during a performance trace of a web page. It indicates to the user what the tracing is currently waiting on.
   */
  waitingForLoadEvent: 'Waiting for load event…',
  /**
   * @description Text in a status dialog shown during a performance trace of a web page. It indicates to the user what the tracing is currently waiting on.
   */
  waitingForLoadEventPlus5Seconds: 'Waiting for load event (+5s)…',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

type StatusUpdate = string|null;
type Listener = (status: StatusUpdate) => void;

/**
 * Accepts promises with a text label, and reports to a listener as promises resolve.
 * Only returns the label of the first incomplete promise. When no more promises
 * remain, the updated status is null.
 */
class StatusChecker {
  #checkers: Array<{title: string, complete: boolean}> = [];
  #listener: Listener|null = null;
  #currentStatus: StatusUpdate = null;

  add(title: string, promise: Promise<unknown>): void {
    const item = {title, complete: false};
    this.#checkers.push(item);

    void promise.finally(() => {
      item.complete = true;
      this.#evaluate();
    });
  }

  setListener(listener: Listener): void {
    this.#listener = null;
    this.#evaluate();
    this.#listener = listener;
    listener(this.#currentStatus);
  }

  removeListener(): void {
    this.#listener = null;
  }

  #evaluate(): void {
    let nextStatus: StatusUpdate = null;

    // Only report the status of the first incomplete checker.
    for (const checker of this.#checkers) {
      if (!checker.complete) {
        nextStatus = checker.title;
        break;
      }
    }

    if (nextStatus !== this.#currentStatus) {
      this.#currentStatus = nextStatus;
      if (this.#listener) {
        this.#listener(nextStatus);
      }
    }
  }
}

export class TimelineController implements Tracing.TracingManager.TracingManagerClient {
  readonly primaryPageTarget: SDK.Target.Target;
  readonly rootTarget: SDK.Target.Target;
  private tracingManager: Tracing.TracingManager.TracingManager|null;
  #collectedEvents: Trace.Types.Events.Event[] = [];
  #navigationUrls: string[] = [];
  #fieldData: CrUXManager.PageResult[]|null = null;
  #recordingStartTime: number|null = null;
  private readonly client: Client;
  private tracingCompletePromise: PromiseWithResolvers<void>|null = null;

  // These properties are only used for "Reload and record".
  #statusChecker: StatusChecker|null = null;
  #loadEventFiredCb: (() => void)|null = null;

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
  constructor(rootTarget: SDK.Target.Target, primaryPageTarget: SDK.Target.Target, client: Client) {
    this.primaryPageTarget = primaryPageTarget;
    this.rootTarget = rootTarget;
    // Ensure the tracing manager is the one for the Root Target, NOT the
    // primaryPageTarget, as that is the one we have to invoke tracing against.
    this.tracingManager = rootTarget.model(Tracing.TracingManager.TracingManager);
    this.client = client;
  }

  async dispose(): Promise<void> {
    if (this.tracingManager) {
      await this.tracingManager.reset();
    }
  }

  async #navigateToAboutBlank(): Promise<void> {
    const aboutBlankNavigationComplete = new Promise<void>(async (resolve, reject) => {
      const target = this.primaryPageTarget;
      const resourceModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      if (!resourceModel) {
        reject('Could not load resourceModel');
        return;
      }

      /**
       * To clear out the page and any state from prior test runs, we
       * navigate to about:blank before initiating the trace recording.
       * Once we have navigated to about:blank, we start recording and
       * then navigate to the original page URL, to ensure we profile the
       * page load.
       **/
      function waitForAboutBlank(event: Common.EventTarget.EventTargetEvent<SDK.ResourceTreeModel.ResourceTreeFrame>):
          void {
        if (event.data.url === 'about:blank') {
          resolve();
        } else {
          reject(`Unexpected navigation to ${event.data.url}`);
        }
        resourceModel?.removeEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, waitForAboutBlank);
      }
      resourceModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, waitForAboutBlank);
      await resourceModel.navigate('about:blank' as Platform.DevToolsPath.UrlString);
    });

    await aboutBlankNavigationComplete;
  }

  async #navigateWithSDK(url: Platform.DevToolsPath.UrlString): Promise<void> {
    const resourceModel = this.primaryPageTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceModel) {
      throw new Error('expected to find ResourceTreeModel');
    }

    const loadPromiseWithResolvers = Promise.withResolvers<void>();
    this.#loadEventFiredCb = loadPromiseWithResolvers.resolve;
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this.#onLoadEventFired, this);

    // We don't need to await this because we are purposefully showing UI
    // progress as the page loads & tracing is underway.
    void resourceModel.navigate(url);

    await loadPromiseWithResolvers.promise;
  }

  async startRecording(options: RecordingOptions): Promise<void> {
    function disabledByDefault(category: string): string {
      return 'disabled-by-default-' + category;
    }

    this.client.recordingStatus(i18nString(UIStrings.initializingTracing));

    // If we are doing "Reload & record", we first navigate the page to
    // about:blank. This is to ensure any data on the timeline from any
    // previous performance recording is lost, avoiding the problem where a
    // timeline will show data & screenshots from a previous page load that
    // was not relevant.
    if (options.navigateToUrl) {
      await this.#navigateToAboutBlank();
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
      categoriesArray.push(
          disabledByDefault('devtools.timeline.layers'), disabledByDefault('devtools.timeline.picture'),
          disabledByDefault('blink.graphics_context_annotations'));
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

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onFrameNavigated,
        this);

    this.#navigationUrls = [];
    this.#fieldData = null;
    this.#recordingStartTime = Date.now();

    const response = await this.startRecordingWithCategories(categoriesArray.join(','));
    if (response.getError()) {
      await SDK.TargetManager.TargetManager.instance().resumeAllTargets();
      throw new Error(response.getError());
    }

    if (!options.navigateToUrl) {
      this.client.recordingStatus(i18nString(UIStrings.tracing));
      return;
    }

    // If the user hit "Reload & record", by this point we have:
    // 1. Navigated to about:blank
    // 2. Initiated tracing.
    // We therefore now should navigate back to the original URL that the user wants to profile.

    // Setup a status checker so we can wait long enough for the page to settle,
    // and to let users know what is going on.
    this.#statusChecker?.removeListener();
    this.#statusChecker = new StatusChecker();

    const loadEvent = this.#navigateWithSDK(options.navigateToUrl);
    this.#statusChecker.add(i18nString(UIStrings.waitingForLoadEvent), loadEvent);
    this.#statusChecker.add(
        i18nString(UIStrings.waitingForLoadEventPlus5Seconds),
        loadEvent.then(() => new Promise(resolve => setTimeout(resolve, 5000))));

    this.#statusChecker.setListener(status => {
      if (status === null) {
        void this.stopRecording();
      } else {
        this.client.recordingStatus(status);
      }
    });
  }

  async #onFrameNavigated(event: {data: SDK.ResourceTreeModel.ResourceTreeFrame}): Promise<void> {
    if (!event.data.isPrimaryFrame()) {
      return;
    }

    this.#navigationUrls.push(event.data.url);
  }

  async #onLoadEventFired(
      event: Common.EventTarget
          .EventTargetEvent<{resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel, loadTime: number}>):
      Promise<void> {
    if (!event.data.resourceTreeModel.mainFrame?.isPrimaryFrame()) {
      return;
    }

    this.#loadEventFiredCb?.();
  }

  async stopRecording(): Promise<void> {
    this.#statusChecker?.removeListener();
    this.#statusChecker = null;
    this.#loadEventFiredCb = null;

    if (this.tracingManager) {
      this.tracingManager.stop();
    }

    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onFrameNavigated,
        this);
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this.#onLoadEventFired, this);

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

    const [fieldData] =
        await Promise
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

  private async fetchFieldData(): Promise<CrUXManager.PageResult[]|null> {
    const cruxManager = CrUXManager.CrUXManager.instance();
    if (!cruxManager.isEnabled() || !navigator.onLine) {
      return null;
    }

    const urls = [...new Set(this.#navigationUrls)];
    return await Promise.all(urls.map(url => cruxManager.getFieldDataForPage(url)));
  }

  private async waitForTracingToStop(): Promise<void> {
    if (this.tracingManager) {
      await this.tracingCompletePromise?.promise;
    }
  }

  private async startRecordingWithCategories(categories: string): Promise<Protocol.ProtocolResponseWithError> {
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
  async warmupJsProfiler(): Promise<void> {
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

  traceEventsCollected(events: Trace.Types.Events.Event[]): void {
    this.#collectedEvents.push(...events);
  }

  tracingComplete(): void {
    if (!this.tracingCompletePromise) {
      return;
    }
    this.tracingCompletePromise.resolve(undefined);
    this.tracingCompletePromise = null;
  }

  private async allSourcesFinished(): Promise<void> {
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

  tracingBufferUsage(usage: number): void {
    this.client.recordingProgress(usage);
  }

  eventsRetrievalProgress(progress: number): void {
    this.client.loadingProgress(progress);
  }
}

export interface Client {
  recordingProgress(bufferUsage: number): void;
  recordingStatus(status: string): void;
  loadingStarted(): void;
  processingStarted(): void;
  loadingProgress(progress?: number): void;
  loadingComplete(
      collectedEvents: Trace.Types.Events.Event[], exclusiveFilter: Trace.Extras.TraceFilter.TraceFilter|null,
      metadata: Trace.Types.File.MetaData|null): Promise<void>;
  loadingCompleteForTest(): void;
}
export interface RecordingOptions {
  enableJSSampling?: boolean;
  capturePictures?: boolean;
  captureFilmStrip?: boolean;
  captureSelectorStats?: boolean;
  navigateToUrl?: Platform.DevToolsPath.UrlString;
}
