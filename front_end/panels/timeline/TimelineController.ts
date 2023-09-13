// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';

import {PerformanceModel} from './PerformanceModel.js';

const UIStrings = {
  /**
   *@description Text in Timeline Controller of the Performance panel indicating that the Performance Panel cannot
   * record a performance trace because the type of target (where possible types are page, service worker and shared
   * worker) doesn't support it.
   */
  tracingNotSupported: 'Performance trace recording not supported for this type of target',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineController implements TraceEngine.TracingManager.TracingManagerClient {
  readonly primaryPageTarget: SDK.Target.Target;
  readonly rootTarget: SDK.Target.Target;
  private tracingManager: TraceEngine.TracingManager.TracingManager|null;
  private performanceModel: PerformanceModel;
  private readonly client: Client;
  private readonly tracingModel: TraceEngine.Legacy.TracingModel;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tracingCompleteCallback?: ((value: any) => void)|null;

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
   * The problems with with using primary page target for tracing are:
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
    this.tracingManager = rootTarget.model(TraceEngine.TracingManager.TracingManager);
    this.performanceModel = new PerformanceModel();
    this.performanceModel.setMainTarget(rootTarget);
    this.client = client;
    this.tracingModel = new TraceEngine.Legacy.TracingModel();
  }

  async dispose(): Promise<void> {
    if (this.tracingManager) {
      await this.tracingManager.reset();
    }
  }

  async startRecording(options: RecordingOptions): Promise<Protocol.ProtocolResponseWithError> {
    function disabledByDefault(category: string): string {
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
      Root.Runtime.experiments.isEnabled('timelineShowAllEvents') ? '*' : '-*',
      TimelineModel.TimelineModel.TimelineModelImpl.Category.Console,
      TimelineModel.TimelineModel.TimelineModelImpl.Category.UserTiming,
      'devtools.timeline',
      disabledByDefault('devtools.timeline'),
      disabledByDefault('devtools.timeline.frame'),
      disabledByDefault('devtools.timeline.stack'),
      disabledByDefault('v8.compile'),
      disabledByDefault('v8.cpu_profiler.hires'),
      TimelineModel.TimelineModel.TimelineModelImpl.Category.Loading,
      disabledByDefault('lighthouse'),
      'v8.execute',
      'v8',
    ];

    if (Root.Runtime.experiments.isEnabled('timelineV8RuntimeCallStats') && options.enableJSSampling) {
      categoriesArray.push(disabledByDefault('v8.runtime_stats_sampling'));
    }
    if (options.enableJSSampling) {
      categoriesArray.push(disabledByDefault('v8.cpu_profiler'));
    }
    if (Root.Runtime.experiments.isEnabled('timelineInvalidationTracking')) {
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

    this.performanceModel.setRecordStartTime(Date.now());
    const response = await this.startRecordingWithCategories(categoriesArray.join(','));
    if (response.getError()) {
      await this.waitForTracingToStop(false);
      await SDK.TargetManager.TargetManager.instance().resumeAllTargets();
    }
    return response;
  }

  async stopRecording(): Promise<PerformanceModel> {
    if (this.tracingManager) {
      this.tracingManager.stop();
    }

    this.client.loadingStarted();
    await this.waitForTracingToStop(true);
    await this.allSourcesFinished();
    return this.performanceModel;
  }

  getPerformanceModel(): PerformanceModel {
    return this.performanceModel;
  }

  private async waitForTracingToStop(awaitTracingCompleteCallback: boolean): Promise<void> {
    const tracingStoppedPromises = [];
    if (this.tracingManager && awaitTracingCompleteCallback) {
      tracingStoppedPromises.push(new Promise(resolve => {
        this.tracingCompleteCallback = resolve;
      }));
    }

    await Promise.all(tracingStoppedPromises);
  }

  private async startRecordingWithCategories(categories: string): Promise<Protocol.ProtocolResponseWithError> {
    if (!this.tracingManager) {
      throw new Error(i18nString(UIStrings.tracingNotSupported));
    }
    // There might be a significant delay in the beginning of timeline recording
    // caused by starting CPU profiler, that needs to traverse JS heap to collect
    // all the functions data.
    await SDK.TargetManager.TargetManager.instance().suspendAllTargets('performance-timeline');
    return this.tracingManager.start(this, categories, '');
  }

  traceEventsCollected(events: TraceEngine.TracingManager.EventPayload[]): void {
    this.tracingModel.addEvents(events);
  }

  tracingComplete(): void {
    if (!this.tracingCompleteCallback) {
      return;
    }
    this.tracingCompleteCallback(undefined);
    this.tracingCompleteCallback = null;
  }

  private async allSourcesFinished(): Promise<void> {
    this.client.processingStarted();
    await this.finalizeTrace();
  }

  private async finalizeTrace(): Promise<void> {
    await SDK.TargetManager.TargetManager.instance().resumeAllTargets();
    this.tracingModel.tracingComplete();
    await this.client.loadingComplete(this.tracingModel, /* exclusiveFilter= */ null, /* isCpuProfile= */ false);
    this.client.loadingCompleteForTest();
  }

  tracingBufferUsage(usage: number): void {
    this.client.recordingProgress(usage);
  }

  eventsRetrievalProgress(progress: number): void {
    this.client.loadingProgress(progress);
  }
}

export interface Client {
  recordingProgress(usage: number): void;
  loadingStarted(): void;
  processingStarted(): void;
  loadingProgress(progress?: number): void;
  loadingComplete(
      tracingModel: TraceEngine.Legacy.TracingModel|null,
      exclusiveFilter: TimelineModel.TimelineModelFilter.TimelineModelFilter|null,
      isCpuProfile: boolean): Promise<void>;
  loadingCompleteForTest(): void;
}
export interface RecordingOptions {
  enableJSSampling?: boolean;
  capturePictures?: boolean;
  captureFilmStrip?: boolean;
}
