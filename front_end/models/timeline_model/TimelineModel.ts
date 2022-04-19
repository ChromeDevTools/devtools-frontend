/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import {TimelineJSProfileProcessor} from './TimelineJSProfile.js';

const UIStrings = {
  /**
  *@description Text for the name of a thread of the page
  *@example {1} PH1
  */
  threadS: 'Thread {PH1}',
  /**
  *@description Title of a worker in the timeline flame chart of the Performance panel
  *@example {https://google.com} PH1
  */
  workerS: '`Worker` — {PH1}',
  /**
  *@description Title of a worker in the timeline flame chart of the Performance panel
  */
  dedicatedWorker: 'Dedicated `Worker`',
  /**
  *@description Title of a worker in the timeline flame chart of the Performance panel
  *@example {FormatterWorker} PH1
  *@example {https://google.com} PH2
  */
  workerSS: '`Worker`: {PH1} — {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('models/timeline_model/TimelineModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineModelImpl {
  private isGenericTraceInternal!: boolean;
  private tracksInternal!: Track[];
  private namedTracks!: Map<TrackType, Track>;
  private inspectedTargetEventsInternal!: SDK.TracingModel.Event[];
  private timeMarkerEventsInternal!: SDK.TracingModel.Event[];
  private sessionId!: string|null;
  private mainFrameNodeId!: number|null;
  private pageFrames!: Map<string, PageFrame>;
  private cpuProfilesInternal!: SDK.CPUProfileDataModel.CPUProfileDataModel[];
  private workerIdByThread!: WeakMap<SDK.TracingModel.Thread, string>;
  private requestsFromBrowser!: Map<string, SDK.TracingModel.Event>;
  private mainFrame!: PageFrame;
  private minimumRecordTimeInternal: number;
  private maximumRecordTimeInternal: number;
  private totalBlockingTimeInternal: number;
  private estimatedTotalBlockingTime: number;
  private asyncEventTracker!: TimelineAsyncEventTracker;
  private invalidationTracker!: InvalidationTracker;
  private layoutInvalidate!: {
    [x: string]: SDK.TracingModel.Event|null,
  };
  private lastScheduleStyleRecalculation!: {
    [x: string]: SDK.TracingModel.Event,
  };
  private paintImageEventByPixelRefId!: {
    [x: string]: SDK.TracingModel.Event,
  };
  private lastPaintForLayer!: {
    [x: string]: SDK.TracingModel.Event,
  };
  private lastRecalculateStylesEvent!: SDK.TracingModel.Event|null;
  private currentScriptEvent!: SDK.TracingModel.Event|null;
  private eventStack!: SDK.TracingModel.Event[];
  private knownInputEvents!: Set<string>;
  private browserFrameTracking!: boolean;
  private persistentIds!: boolean;
  private legacyCurrentPage!: any;
  private currentTaskLayoutAndRecalcEvents: SDK.TracingModel.Event[];
  private tracingModelInternal: SDK.TracingModel.TracingModel|null;
  private mainFrameLayerTreeId?: any;

  // COHERENT BEGIN
  private scheduledStyleRecalculation!: SDK.TracingModel.Event[];
  private currentLoadedUrls!: string[];
  private scheduledLayoutInvalidate!: SDK.TracingModel.Event[];
  // COHERENT END

  constructor() {
    this.minimumRecordTimeInternal = 0;
    this.maximumRecordTimeInternal = 0;
    this.totalBlockingTimeInternal = 0;
    this.estimatedTotalBlockingTime = 0;

    this.reset();
    this.resetProcessingState();

    this.currentTaskLayoutAndRecalcEvents = [];
    this.tracingModelInternal = null;
  }

  static forEachEvent(
      events: SDK.TracingModel.Event[], onStartEvent: (arg0: SDK.TracingModel.Event) => void,
      onEndEvent: (arg0: SDK.TracingModel.Event) => void,
      onInstantEvent?: ((arg0: SDK.TracingModel.Event, arg1: SDK.TracingModel.Event|null) => any), startTime?: number,
      endTime?: number, filter?: ((arg0: SDK.TracingModel.Event) => boolean)): void {
    startTime = startTime || 0;
    endTime = endTime || Infinity;
    const stack: SDK.TracingModel.Event[] = [];
    const startEvent = TimelineModelImpl.topLevelEventEndingAfter(events, startTime);
    for (let i = startEvent; i < events.length; ++i) {
      const e = events[i];
      if ((e.endTime || e.startTime) < startTime) {
        continue;
      }
      if (e.startTime >= endTime) {
        break;
      }
      if (SDK.TracingModel.TracingModel.isAsyncPhase(e.phase) || SDK.TracingModel.TracingModel.isFlowPhase(e.phase)) {
        continue;
      }
      let last: SDK.TracingModel.Event = stack[stack.length - 1];
      while (last && last.endTime !== undefined && last.endTime <= e.startTime) {
        stack.pop();
        onEndEvent(last);
        last = stack[stack.length - 1];
      }
      if (filter && !filter(e)) {
        continue;
      }
      if (e.duration) {
        onStartEvent(e);
        stack.push(e);
      } else {
        onInstantEvent && onInstantEvent(e, stack[stack.length - 1] || null);
      }
    }
    while (stack.length) {
      const last = stack.pop();
      if (last) {
        onEndEvent(last);
      }
    }
  }

  private static topLevelEventEndingAfter(events: SDK.TracingModel.Event[], time: number): number {
    let index = Platform.ArrayUtilities.upperBound(events, time, (time, event) => time - event.startTime) - 1;
    while (index > 0 && !SDK.TracingModel.TracingModel.isTopLevelEvent(events[index])) {
      index--;
    }
    return Math.max(index, 0);
  }

  isMarkerEvent(event: SDK.TracingModel.Event): boolean {
    switch (event.name) {
      case RecordType.TimeStamp:
        return true;
      case RecordType.MarkFirstPaint:
      case RecordType.MarkFCP:
        return Boolean(this.mainFrame) && event.args.frame === this.mainFrame.frameId && Boolean(event.args.data);
      case RecordType.MarkDOMContent:
      case RecordType.MarkLoad:
      case RecordType.MarkLCPCandidate:
      case RecordType.MarkLCPInvalidate:
        return Boolean(event.args['data']['isMainFrame']);
      default:
        return false;
    }
  }

  isInteractiveTimeEvent(event: SDK.TracingModel.Event): boolean {
    return event.name === RecordType.InteractiveTime;
  }

  isLayoutShiftEvent(event: SDK.TracingModel.Event): boolean {
    return event.name === RecordType.LayoutShift;
  }

  isUserTimingEvent(event: SDK.TracingModel.Event): boolean {
    return event.categoriesString === TimelineModelImpl.Category.UserTiming;
  }
  isParseHTMLEvent(event: SDK.TracingModel.Event): boolean {
    return event.name === RecordType.ParseHTML;
  }

  isLCPCandidateEvent(event: SDK.TracingModel.Event): boolean {
    return event.name === RecordType.MarkLCPCandidate && Boolean(event.args['data']['isMainFrame']);
  }

  isLCPInvalidateEvent(event: SDK.TracingModel.Event): boolean {
    return event.name === RecordType.MarkLCPInvalidate && Boolean(event.args['data']['isMainFrame']);
  }

  isFCPEvent(event: SDK.TracingModel.Event): boolean {
    return event.name === RecordType.MarkFCP && Boolean(this.mainFrame) &&
        event.args['frame'] === this.mainFrame.frameId;
  }

  isLongRunningTask(event: SDK.TracingModel.Event): boolean {
    return event.name === RecordType.Task &&
        TimelineData.forEvent(event).warning === TimelineModelImpl.WarningType.LongTask;
  }

  isNavigationStartEvent(event: SDK.TracingModel.Event): boolean {
    return event.name === RecordType.NavigationStart;
  }

  isMainFrameNavigationStartEvent(event: SDK.TracingModel.Event): boolean {
    return this.isNavigationStartEvent(event) && event.args['data']['isLoadingMainFrame'] &&
        event.args['data']['documentLoaderURL'];
  }

  static globalEventId(event: SDK.TracingModel.Event, field: string): string {
    const data = event.args['data'] || event.args['beginData'];
    const id = data && data[field];
    if (!id) {
      return '';
    }
    return `${event.thread.process().id()}.${id}`;
  }

  static eventFrameId(event: SDK.TracingModel.Event): string {
    const data = event.args['data'] || event.args['beginData'];
    return data && data['frame'] || '';
  }

  cpuProfiles(): SDK.CPUProfileDataModel.CPUProfileDataModel[] {
    return this.cpuProfilesInternal;
  }

  totalBlockingTime(): {
    time: number,
    estimated: boolean,
  } {
    if (this.totalBlockingTimeInternal === -1) {
      return {time: this.estimatedTotalBlockingTime, estimated: true};
    }

    return {time: this.totalBlockingTimeInternal, estimated: false};
  }

  targetByEvent(event: SDK.TracingModel.Event): SDK.Target.Target|null {
    // FIXME: Consider returning null for loaded traces.
    const workerId = this.workerIdByThread.get(event.thread);
    const mainTarget = SDK.TargetManager.TargetManager.instance().mainTarget();
    return workerId ? SDK.TargetManager.TargetManager.instance().targetById(workerId) : mainTarget;
  }

  navStartTimes(): Map<string, SDK.TracingModel.Event> {
    if (!this.tracingModelInternal) {
      return new Map();
    }

    return this.tracingModelInternal.navStartTimes();
  }

  setEvents(tracingModel: SDK.TracingModel.TracingModel): void {
    this.reset();
    this.resetProcessingState();
    this.tracingModelInternal = tracingModel;

    this.minimumRecordTimeInternal = tracingModel.minimumRecordTime();
    this.maximumRecordTimeInternal = tracingModel.maximumRecordTime();

    // Remove LayoutShift events from the main thread list of events because they are
    // represented in the experience track. This is done prior to the main thread being processed for its own events.
    const layoutShiftEvents = [];
    for (const process of tracingModel.sortedProcesses()) {
      if (process.name() !== 'Renderer') {
        continue;
      }

      for (const thread of process.sortedThreads()) {
        const shifts = thread.removeEventsByName(RecordType.LayoutShift);
        layoutShiftEvents.push(...shifts);
      }
    }

    this.processSyncBrowserEvents(tracingModel);
    if (this.browserFrameTracking) {
      this.processThreadsForBrowserFrames(tracingModel);
    } else {
      // The next line is for loading legacy traces recorded before M67.
      // TODO(alph): Drop the support at some point.
      const metadataEvents = this.processMetadataEvents(tracingModel);
      this.isGenericTraceInternal = !metadataEvents;
      if (metadataEvents) {
        this.processMetadataAndThreads(tracingModel, metadataEvents);
      } else {
        this.processGenericTrace(tracingModel);
      }
    }
    this.inspectedTargetEventsInternal.sort(SDK.TracingModel.Event.compareStartTime);
    this.processAsyncBrowserEvents(tracingModel);
    this.buildGPUEvents(tracingModel);
    this.buildLoadingEvents(tracingModel, layoutShiftEvents);
    this.resetProcessingState();
  }

  private processGenericTrace(tracingModel: SDK.TracingModel.TracingModel): void {
    let browserMainThread = SDK.TracingModel.TracingModel.browserMainThread(tracingModel);
    if (!browserMainThread && tracingModel.sortedProcesses().length) {
      browserMainThread = tracingModel.sortedProcesses()[0].sortedThreads()[0];
    }
    for (const process of tracingModel.sortedProcesses()) {
      for (const thread of process.sortedThreads()) {
        this.processThreadEvents(
            tracingModel, [{from: 0, to: Infinity}], thread, thread === browserMainThread, false, true, null);
      }
    }
  }

  private processMetadataAndThreads(tracingModel: SDK.TracingModel.TracingModel, metadataEvents: MetadataEvents): void {
    let startTime = 0;
    for (let i = 0, length = metadataEvents.page.length; i < length; i++) {
      const metaEvent = metadataEvents.page[i];
      const process = metaEvent.thread.process();
      const endTime = i + 1 < length ? metadataEvents.page[i + 1].startTime : Infinity;
      if (startTime === endTime) {
        continue;
      }
      this.legacyCurrentPage = metaEvent.args['data'] && metaEvent.args['data']['page'];
      // COHERENT BEGIN
      // If a thread doesn't have a name set from InspectorTracingAgent,
      // it will be displayed with it's thread id, e.g. Thread 231321511611
      // so we simply set the thread name to something more meaningful
      let workedThreadCounter: number = 0;
      // COHERENT END
      for (const thread of process.sortedThreads()) {
        let workerUrl: null = null;
        // COHERENT BEGIN
        if (thread.name() === "") {
          thread.setName(i18nString(UIStrings.workerS, {PH1: workedThreadCounter}));
          workedThreadCounter++;
        }
        // COHERENT END
        if (thread.name() === TimelineModelImpl.WorkerThreadName ||
            thread.name() === TimelineModelImpl.WorkerThreadNameLegacy) {
          const workerMetaEvent = metadataEvents.workers.find(e => {
            if (e.args['data']['workerThreadId'] !== thread.id()) {
              return false;
            }
            // This is to support old traces.
            if (e.args['data']['sessionId'] === this.sessionId) {
              return true;
            }
            return Boolean(this.pageFrames.get(TimelineModelImpl.eventFrameId(e)));
          });
          if (!workerMetaEvent) {
            continue;
          }
          const workerId = workerMetaEvent.args['data']['workerId'];
          if (workerId) {
            this.workerIdByThread.set(thread, workerId);
          }
          workerUrl = workerMetaEvent.args['data']['url'] || '';
        }
        this.processThreadEvents(
            tracingModel, [{from: startTime, to: endTime}], thread, thread === metaEvent.thread, Boolean(workerUrl),
            true, workerUrl);
      }
      startTime = endTime;
    }
  }

  private processThreadsForBrowserFrames(tracingModel: SDK.TracingModel.TracingModel): void {
    const processData = new Map<number, {
      from: number,
      to: number,
      main: boolean,
      url: string,
    }[]>();
    for (const frame of this.pageFrames.values()) {
      for (let i = 0; i < frame.processes.length; i++) {
        const pid = frame.processes[i].processId;
        let data = processData.get(pid);
        if (!data) {
          data = [];
          processData.set(pid, data);
        }
        const to = i === frame.processes.length - 1 ? (frame.deletedTime || Infinity) : frame.processes[i + 1].time;
        data.push({from: frame.processes[i].time, to: to, main: !frame.parent, url: frame.processes[i].url});
      }
    }
    const allMetadataEvents = tracingModel.devToolsMetadataEvents();
    for (const process of tracingModel.sortedProcesses()) {
      const data = processData.get(process.id());
      if (!data) {
        continue;
      }
      data.sort((a, b) => a.from - b.from || a.to - b.to);
      const ranges = [];
      let lastUrl: string|null = null;
      let lastMainUrl: string|null = null;
      let hasMain = false;
      for (const item of data) {
        const last = ranges[ranges.length - 1];
        if (!last || item.from > last.to) {
          ranges.push({from: item.from, to: item.to});
        } else {
          last.to = item.to;
        }
        if (item.main) {
          hasMain = true;
        }
        if (item.url) {
          if (item.main) {
            lastMainUrl = item.url;
          }
          lastUrl = item.url;
        }
      }

      for (const thread of process.sortedThreads()) {
        if (thread.name() === TimelineModelImpl.RendererMainThreadName) {
          this.processThreadEvents(
              tracingModel, ranges, thread, true /* isMainThread */, false /* isWorker */, hasMain,
              hasMain ? lastMainUrl : lastUrl);
        } else if (
            thread.name() === TimelineModelImpl.WorkerThreadName ||
            thread.name() === TimelineModelImpl.WorkerThreadNameLegacy) {
          const workerMetaEvent = allMetadataEvents.find(e => {
            if (e.name !== TimelineModelImpl.DevToolsMetadataEvent.TracingSessionIdForWorker) {
              return false;
            }
            if (e.thread.process() !== process) {
              return false;
            }
            if (e.args['data']['workerThreadId'] !== thread.id()) {
              return false;
            }
            return Boolean(this.pageFrames.get(TimelineModelImpl.eventFrameId(e)));
          });
          if (!workerMetaEvent) {
            continue;
          }
          this.workerIdByThread.set(thread, workerMetaEvent.args['data']['workerId'] || '');
          this.processThreadEvents(
              tracingModel, ranges, thread, false /* isMainThread */, true /* isWorker */, false /* forMainFrame */,
              workerMetaEvent.args['data']['url'] || '');
        } else {
          this.processThreadEvents(
              tracingModel, ranges, thread, false /* isMainThread */, false /* isWorker */, false /* forMainFrame */,
              null);
        }
      }
    }
  }

  private processMetadataEvents(tracingModel: SDK.TracingModel.TracingModel): MetadataEvents|null {
    const metadataEvents = tracingModel.devToolsMetadataEvents();

    const pageDevToolsMetadataEvents = [];
    const workersDevToolsMetadataEvents = [];
    for (const event of metadataEvents) {
      if (event.name === TimelineModelImpl.DevToolsMetadataEvent.TracingStartedInPage) {
        pageDevToolsMetadataEvents.push(event);
        if (event.args['data'] && event.args['data']['persistentIds']) {
          this.persistentIds = true;
        }
        const frames = ((event.args['data'] && event.args['data']['frames']) || [] as PageFrame[]);
        frames.forEach((payload: PageFrame) => this.addPageFrame(event, payload));
        this.mainFrame = this.rootFrames()[0];
      } else if (event.name === TimelineModelImpl.DevToolsMetadataEvent.TracingSessionIdForWorker) {
        workersDevToolsMetadataEvents.push(event);
      } else if (event.name === TimelineModelImpl.DevToolsMetadataEvent.TracingStartedInBrowser) {
        console.assert(!this.mainFrameNodeId, 'Multiple sessions in trace');
        this.mainFrameNodeId = event.args['frameTreeNodeId'];
      }
    }
    if (!pageDevToolsMetadataEvents.length) {
      return null;
    }

    const sessionId =
        pageDevToolsMetadataEvents[0].args['sessionId'] || pageDevToolsMetadataEvents[0].args['data']['sessionId'];
    this.sessionId = sessionId;

    const mismatchingIds = new Set<any>();
    function checkSessionId(event: SDK.TracingModel.Event): boolean {
      let args = event.args;
      // FIXME: put sessionId into args["data"] for TracingStartedInPage event.
      if (args['data']) {
        args = args['data'];
      }
      const id = args['sessionId'];
      if (id === sessionId) {
        return true;
      }
      mismatchingIds.add(id);
      return false;
    }
    const result = {
      page: pageDevToolsMetadataEvents.filter(checkSessionId).sort(SDK.TracingModel.Event.compareStartTime),
      workers: workersDevToolsMetadataEvents.sort(SDK.TracingModel.Event.compareStartTime),
    };
    if (mismatchingIds.size) {
      Common.Console.Console.instance().error(
          'Timeline recording was started in more than one page simultaneously. Session id mismatch: ' +
          this.sessionId + ' and ' + [...mismatchingIds] + '.');
    }
    return result;
  }

  private processSyncBrowserEvents(tracingModel: SDK.TracingModel.TracingModel): void {
    const browserMain = SDK.TracingModel.TracingModel.browserMainThread(tracingModel);
    if (browserMain) {
      browserMain.events().forEach(this.processBrowserEvent, this);
    }
  }

  private processAsyncBrowserEvents(tracingModel: SDK.TracingModel.TracingModel): void {
    const browserMain = SDK.TracingModel.TracingModel.browserMainThread(tracingModel);
    if (browserMain) {
      this.processAsyncEvents(browserMain, [{from: 0, to: Infinity}]);
    }
  }

  private buildGPUEvents(tracingModel: SDK.TracingModel.TracingModel): void {
    // COHERENT BEGIN
    //const thread = tracingModel.getThreadByName('GPU Process', 'CrGpuMain');
    const  thread = tracingModel.getThreadByName('Cohtml GPU', 'GPU Thread');
    // COHERENT END
    if (!thread) {
      return;
    }
    // COHERENT BEGIN
    //const gpuEventName = RecordType.GPUTask;
    const gpuEventName = RecordType.Coherent_GPU;
    // COHERENT END
    const track = this.ensureNamedTrack(TrackType.GPU);
    track.thread = thread;
    track.events = thread.events().filter(event => event.name === gpuEventName);
  }

  private buildLoadingEvents(tracingModel: SDK.TracingModel.TracingModel, events: SDK.TracingModel.Event[]): void {
    const thread = tracingModel.getThreadByName('Renderer', 'CrRendererMain');
    if (!thread) {
      return;
    }
    const experienceCategory = 'experience';
    const track = this.ensureNamedTrack(TrackType.Experience);
    track.thread = thread;
    track.events = events;

    // Even though the event comes from 'loading', in order to color it differently we
    // rename its category.
    for (const trackEvent of track.events) {
      trackEvent.categoriesString = experienceCategory;
      if (trackEvent.name === RecordType.LayoutShift) {
        const eventData = trackEvent.args['data'] || trackEvent.args['beginData'] || {};
        const timelineData = TimelineData.forEvent(trackEvent);
        if (eventData['impacted_nodes']) {
          for (let i = 0; i < eventData['impacted_nodes'].length; ++i) {
            timelineData.backendNodeIds.push(eventData['impacted_nodes'][i]['node_id']);
          }
        }
      }
    }
  }

  private resetProcessingState(): void {
    this.asyncEventTracker = new TimelineAsyncEventTracker();
    this.invalidationTracker = new InvalidationTracker();
    this.layoutInvalidate = {};
    this.lastScheduleStyleRecalculation = {};
    this.paintImageEventByPixelRefId = {};
    this.lastPaintForLayer = {};
    this.lastRecalculateStylesEvent = null;
    this.currentScriptEvent = null;
    this.eventStack = [];
    this.knownInputEvents = new Set();
    this.browserFrameTracking = false;
    this.persistentIds = false;
    this.legacyCurrentPage = null;

    // COHERENT BEGIN
    this.scheduledStyleRecalculation = [];
    // We don't want to clear neither of the loaded urls
    // or scheduled invalidate layout events, since we
    // have to reuse them between threads
    if (!this.currentLoadedUrls) {
      this.currentLoadedUrls = [];
    }
    if (!this.scheduledLayoutInvalidate) {
      this.scheduledLayoutInvalidate = [];
    }
    // COHERENT END
  }

  private extractCpuProfile(tracingModel: SDK.TracingModel.TracingModel, thread: SDK.TracingModel.Thread):
      SDK.CPUProfileDataModel.CPUProfileDataModel|null {
    const events = thread.events();
    let cpuProfile;
    let target: (SDK.Target.Target|null)|null = null;

    // Check for legacy CpuProfile event format first.
    let cpuProfileEvent: (SDK.TracingModel.Event|undefined)|SDK.TracingModel.Event = events[events.length - 1];
    if (cpuProfileEvent && cpuProfileEvent.name === RecordType.CpuProfile) {
      const eventData = cpuProfileEvent.args['data'];
      cpuProfile = (eventData && eventData['cpuProfile'] as Protocol.Profiler.Profile | null);
      target = this.targetByEvent(cpuProfileEvent);
    }

    if (!cpuProfile) {
      cpuProfileEvent = events.find(e => e.name === RecordType.Profile);
      if (!cpuProfileEvent) {
        return null;
      }
      target = this.targetByEvent(cpuProfileEvent);
      const profileGroup = tracingModel.profileGroup(cpuProfileEvent);
      if (!profileGroup) {
        Common.Console.Console.instance().error('Invalid CPU profile format.');
        return null;
      }
      cpuProfile = ({
        startTime: cpuProfileEvent.startTime * 1000,
        endTime: 0,
        nodes: [],
        samples: [],
        timeDeltas: [],
        lines: [],
      } as any);
      for (const profileEvent of profileGroup.children) {
        const eventData = profileEvent.args['data'];
        if ('startTime' in eventData) {
          // Do not use |eventData['startTime']| as it is in CLOCK_MONOTONIC domain,
          // but use |profileEvent.startTime| (|ts| in the trace event) which has
          // been translated to Perfetto's clock domain.
          //
          // Also convert from ms to us.
          cpuProfile.startTime = profileEvent.startTime * 1000;
        }
        if ('endTime' in eventData) {
          // Do not use |eventData['endTime']| as it is in CLOCK_MONOTONIC domain,
          // but use |profileEvent.startTime| (|ts| in the trace event) which has
          // been translated to Perfetto's clock domain.
          //
          // Despite its name, |profileEvent.startTime| was recorded right after
          // |eventData['endTime']| within v8 and is a reasonable substitute.
          //
          // Also convert from ms to us.
          cpuProfile.endTime = profileEvent.startTime * 1000;
        }
        const nodesAndSamples = eventData['cpuProfile'] || {};
        const samples = nodesAndSamples['samples'] || [];
        const lines = eventData['lines'] || Array(samples.length).fill(0);
        cpuProfile.nodes.push(...(nodesAndSamples['nodes'] || []));
        cpuProfile.lines.push(...lines);
        if (cpuProfile.samples) {
          cpuProfile.samples.push(...samples);
        }
        if (cpuProfile.timeDeltas) {
          cpuProfile.timeDeltas.push(...(eventData['timeDeltas'] || []));
        }
        if (cpuProfile.samples && cpuProfile.timeDeltas && cpuProfile.samples.length !== cpuProfile.timeDeltas.length) {
          Common.Console.Console.instance().error('Failed to parse CPU profile.');
          return null;
        }
      }
      if (!cpuProfile.endTime && cpuProfile.timeDeltas) {
        const timeDeltas: number[] = cpuProfile.timeDeltas;
        cpuProfile.endTime = timeDeltas.reduce((x, y) => x + y, cpuProfile.startTime);
      }
    }

    try {
      const profile = (cpuProfile as Protocol.Profiler.Profile);
      const jsProfileModel = new SDK.CPUProfileDataModel.CPUProfileDataModel(profile, target);
      this.cpuProfilesInternal.push(jsProfileModel);
      return jsProfileModel;
    } catch (e) {
      Common.Console.Console.instance().error('Failed to parse CPU profile.');
    }
    return null;
  }

  private injectJSFrameEvents(tracingModel: SDK.TracingModel.TracingModel, thread: SDK.TracingModel.Thread):
      SDK.TracingModel.Event[] {
    const jsProfileModel = this.extractCpuProfile(tracingModel, thread);
    let events = thread.events();
    const jsSamples =
        jsProfileModel ? TimelineJSProfileProcessor.generateTracingEventsFromCpuProfile(jsProfileModel, thread) : null;
    if (jsSamples && jsSamples.length) {
      events = Platform.ArrayUtilities.mergeOrdered(events, jsSamples, SDK.TracingModel.Event.orderedCompareStartTime);
    }
    if (jsSamples || events.some(e => e.name === RecordType.JSSample)) {
      const jsFrameEvents = TimelineJSProfileProcessor.generateJSFrameEvents(events, {
        showAllEvents: Root.Runtime.experiments.isEnabled('timelineShowAllEvents'),
        showRuntimeCallStats: Root.Runtime.experiments.isEnabled('timelineV8RuntimeCallStats'),
        showNativeFunctions: Common.Settings.Settings.instance().moduleSetting('showNativeFunctionsInJSProfile').get(),
      });
      if (jsFrameEvents && jsFrameEvents.length) {
        events =
            Platform.ArrayUtilities.mergeOrdered(jsFrameEvents, events, SDK.TracingModel.Event.orderedCompareStartTime);
      }
    }
    return events;
  }

  private processThreadEvents(
      tracingModel: SDK.TracingModel.TracingModel, ranges: {
        from: number,
        to: number,
      }[],
      thread: SDK.TracingModel.Thread, isMainThread: boolean, isWorker: boolean, forMainFrame: boolean,
      url: string|null): void {
    const track = new Track();
    track.name = thread.name() || i18nString(UIStrings.threadS, {PH1: thread.id()});
    track.type = TrackType.Other;
    track.thread = thread;
    if (isMainThread) {
      track.type = TrackType.MainThread;
      track.url = url || '';
      track.forMainFrame = forMainFrame;
    } else if (isWorker) {
      track.type = TrackType.Worker;
      track.url = url || '';
      track.name = track.url ? i18nString(UIStrings.workerS, {PH1: track.url}) : i18nString(UIStrings.dedicatedWorker);
    } else if (thread.name().startsWith('CompositorTileWorker')) {
      track.type = TrackType.Raster;
    }
    this.tracksInternal.push(track);

    const events = this.injectJSFrameEvents(tracingModel, thread);
    this.eventStack = [];
    const eventStack = this.eventStack;

    // Get the worker name from the target.
    if (isWorker) {
      const cpuProfileEvent = events.find(event => event.name === RecordType.Profile);
      if (cpuProfileEvent) {
        const target = this.targetByEvent(cpuProfileEvent);
        if (target) {
          track.name = i18nString(UIStrings.workerSS, {PH1: target.name(), PH2: track.url});
        }
      }
    }

    for (const range of ranges) {
      let i = Platform.ArrayUtilities.lowerBound(events, range.from, (time, event) => time - event.startTime);
      for (; i < events.length; i++) {
        const event = events[i];
        if (event.startTime >= range.to) {
          break;
        }

        // There may be several TTI events, only take the first one.
        if (this.isInteractiveTimeEvent(event) && this.totalBlockingTimeInternal === -1) {
          this.totalBlockingTimeInternal = event.args['args']['total_blocking_time_ms'];
        }

        const isLongRunningTask = event.name === RecordType.Task && event.duration && event.duration > 50;
        if (isMainThread && isLongRunningTask && event.duration) {
          // We only track main thread events that are over 50ms, and the amount of time in the
          // event (over 50ms) is what constitutes the blocking time. An event of 70ms, therefore,
          // contributes 20ms to TBT.
          this.estimatedTotalBlockingTime += event.duration - 50;
        }

        let last: SDK.TracingModel.Event = eventStack[eventStack.length - 1];
        while (last && last.endTime !== undefined && last.endTime <= event.startTime) {
          eventStack.pop();
          last = eventStack[eventStack.length - 1];
        }
        if (!this.processEvent(event)) {
          continue;
        }
        if (!SDK.TracingModel.TracingModel.isAsyncPhase(event.phase) && event.duration) {
          if (eventStack.length) {
            const parent = eventStack[eventStack.length - 1];
            if (parent) {
              parent.selfTime -= event.duration;
              if (parent.selfTime < 0) {
                this.fixNegativeDuration(parent, event);
              }
            }
          }
          event.selfTime = event.duration;
          if (!eventStack.length) {
            track.tasks.push(event);
          }
          eventStack.push(event);
        }
        if (this.isMarkerEvent(event)) {
          this.timeMarkerEventsInternal.push(event);
        }

        track.events.push(event);
        this.inspectedTargetEventsInternal.push(event);
      }
    }
    this.processAsyncEvents(thread, ranges);
  }

  private fixNegativeDuration(event: SDK.TracingModel.Event, child: SDK.TracingModel.Event): void {
    const epsilon = 1e-3;
    if (event.selfTime < -epsilon) {
      console.error(
          `Children are longer than parent at ${event.startTime} ` +
          `(${(child.startTime - this.minimumRecordTime()).toFixed(3)} by ${(-event.selfTime).toFixed(3)}`);
    }
    event.selfTime = 0;
  }

  private processAsyncEvents(thread: SDK.TracingModel.Thread, ranges: {
    from: number,
    to: number,
  }[]): void {
    const asyncEvents = thread.asyncEvents();
    const groups = new Map<TrackType, SDK.TracingModel.AsyncEvent[]>();

    function group(type: TrackType): SDK.TracingModel.AsyncEvent[] {
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      return groups.get(type) as SDK.TracingModel.AsyncEvent[];
    }

    for (const range of ranges) {
      let i = Platform.ArrayUtilities.lowerBound(asyncEvents, range.from, function(time, asyncEvent) {
        return time - asyncEvent.startTime;
      });

      for (; i < asyncEvents.length; ++i) {
        const asyncEvent = asyncEvents[i];
        if (asyncEvent.startTime >= range.to) {
          break;
        }

        if (asyncEvent.hasCategory(TimelineModelImpl.Category.Console)) {
          group(TrackType.Console).push(asyncEvent);
          continue;
        }

        if (asyncEvent.hasCategory(TimelineModelImpl.Category.UserTiming)) {
          group(TrackType.Timings).push(asyncEvent);
          continue;
        }

        if (asyncEvent.name === RecordType.Animation) {
          group(TrackType.Animation).push(asyncEvent);
          continue;
        }

        if (asyncEvent.hasCategory(TimelineModelImpl.Category.LatencyInfo) ||
            asyncEvent.name === RecordType.ImplSideFling) {
          const lastStep = asyncEvent.steps[asyncEvent.steps.length - 1];
          if (!lastStep) {
            throw new Error('AsyncEvent.steps access is out of bounds.');
          }
          // FIXME: fix event termination on the back-end instead.
          if (lastStep.phase !== SDK.TracingModel.Phase.AsyncEnd) {
            continue;
          }
          const data = lastStep.args['data'];
          asyncEvent.causedFrame = Boolean(data && data['INPUT_EVENT_LATENCY_RENDERER_SWAP_COMPONENT']);
          if (asyncEvent.hasCategory(TimelineModelImpl.Category.LatencyInfo)) {
            if (lastStep.id && !this.knownInputEvents.has(lastStep.id)) {
              continue;
            }
            if (asyncEvent.name === RecordType.InputLatencyMouseMove && !asyncEvent.causedFrame) {
              continue;
            }
            // Coalesced events are not really been processed, no need to track them.
            if (data['is_coalesced']) {
              continue;
            }
            const rendererMain = data['INPUT_EVENT_LATENCY_RENDERER_MAIN_COMPONENT'];
            if (rendererMain) {
              const time = rendererMain['time'] / 1000;
              TimelineData.forEvent(asyncEvent.steps[0]).timeWaitingForMainThread =
                  time - asyncEvent.steps[0].startTime;
            }
          }
          group(TrackType.Input).push(asyncEvent);
          continue;
        }
      }
    }

    for (const [type, events] of groups) {
      const track = this.ensureNamedTrack(type);
      track.thread = thread;
      track.asyncEvents =
          Platform.ArrayUtilities.mergeOrdered(track.asyncEvents, events, SDK.TracingModel.Event.compareStartTime);
    }
  }

  private processEvent(event: SDK.TracingModel.Event): boolean {
    const eventStack = this.eventStack;

    if (!eventStack.length) {
      if (this.currentTaskLayoutAndRecalcEvents && this.currentTaskLayoutAndRecalcEvents.length) {
        const totalTime = this.currentTaskLayoutAndRecalcEvents.reduce((time, event) => {
          return event.duration === undefined ? time : time + event.duration;
        }, 0);
        if (totalTime > TimelineModelImpl.Thresholds.ForcedLayout) {
          for (const e of this.currentTaskLayoutAndRecalcEvents) {
            const timelineData = TimelineData.forEvent(e);
            timelineData.warning = e.name === RecordType.Layout ? TimelineModelImpl.WarningType.ForcedLayout :
                                                                  TimelineModelImpl.WarningType.ForcedStyle;
          }
        }
      }
      this.currentTaskLayoutAndRecalcEvents = [];
    }

    if (this.currentScriptEvent) {
      if (this.currentScriptEvent.endTime !== undefined && event.startTime > this.currentScriptEvent.endTime) {
        this.currentScriptEvent = null;
      }
    }

    const eventData = event.args['data'] || event.args['beginData'] || {};
    const timelineData = TimelineData.forEvent(event);
    if (eventData['stackTrace']) {
      timelineData.stackTrace = eventData['stackTrace'].map((callFrameOrProfileNode: Protocol.Runtime.CallFrame) => {
        // `callFrameOrProfileNode` can also be a `SDK.ProfileTreeModel.ProfileNode` for JSSample; that class
        // has accessors to mimic a `CallFrame`, but apparently we don't adjust stack traces in that case. Whether
        // we should is unclear.
        if (event.name !== RecordType.JSSample) {
          // We need to copy the data so we can safely modify it below.
          const frame = {...callFrameOrProfileNode};
          // TraceEvents come with 1-based line & column numbers. The frontend code
          // requires 0-based ones. Adjust the values.
          --frame.lineNumber;
          --frame.columnNumber;
          return frame;
        }
        return callFrameOrProfileNode;
      });
    }
    let pageFrameId = TimelineModelImpl.eventFrameId(event);
    const last = eventStack[eventStack.length - 1];
    if (!pageFrameId && last) {
      pageFrameId = TimelineData.forEvent(last).frameId;
    }
    timelineData.frameId = pageFrameId || (this.mainFrame && this.mainFrame.frameId) || '';
    this.asyncEventTracker.processEvent(event);

    if (this.isMarkerEvent(event)) {
      this.ensureNamedTrack(TrackType.Timings);
    }

    switch (event.name) {
      // COHERENT BEGIN
      case RecordType.Coherent_InitializingURL: {
        this.currentLoadedUrls.push(event.args['name']);
        break;
      }
      case RecordType.Coherent_ScheduleStyleRecalculation: {
        let urlIndex = parseInt(event.args['int1']);
        if (urlIndex != -1) {
          let scheduleStyleRecalcTimelineData = TimelineData.forEvent(event);
          scheduleStyleRecalcTimelineData.setUrl(this.currentLoadedUrls[urlIndex]);
        }
        // since we have many initiators, some may happen during
        // style recalculation and they will get processed in the
        // current style recalculation event
        if (this.lastRecalculateStylesEvent
          && this.lastRecalculateStylesEvent.endTime
          && event.endTime
          && this.lastRecalculateStylesEvent.startTime < event.startTime
          && this.lastRecalculateStylesEvent.endTime > event.endTime) {
            let recalcStylesTimelineData = TimelineData.forEvent(this.lastRecalculateStylesEvent);
            recalcStylesTimelineData.addInitiator(event);
        }
        else {
          this.scheduledStyleRecalculation.push(event);
        }
        this.lastRecalculateStylesEvent = event;
        break;
      }
      case RecordType.Coherent_RecalculateStyles: {
        if (this.scheduledStyleRecalculation) {
          let initiators = this.scheduledStyleRecalculation;
          this.scheduledStyleRecalculation = [];
          timelineData.setInitiators(initiators);
        }

        this.lastRecalculateStylesEvent = event;
        break;
      }
      case RecordType.Coherent_InvalidateLayout: {
        // Coherent: This is chromium comment:
        // Consider style recalculation as a reason for layout invalidation,
        // but only if we had no earlier layout invalidation records.

        // Coherent: Since there can be other layout thread, that gets
        // processed after this thread, we don't check if there are any
        // existing earlier layout invalidation records, but invalidations
        // with additional information are priority
        let urlIndex = parseInt(event.args['int1']);
        if (urlIndex != -1) {
          let invalidateLayoutEventTimelineData = TimelineData.forEvent(event);
          invalidateLayoutEventTimelineData.setUrl(this.currentLoadedUrls[urlIndex])
          this.scheduledLayoutInvalidate.push(event);
        } else if (this.lastRecalculateStylesEvent
          && this.lastRecalculateStylesEvent.endTime
          && this.lastRecalculateStylesEvent.endTime > event.startTime) {
            let recalcInitiators = TimelineData.forEvent(this.lastRecalculateStylesEvent).initiators();
            if (recalcInitiators) {
              for (let i = 0; i < recalcInitiators.length; i++) {
                // sometimes we might schedule layout tasks that were
                // triggered during recalculate styles, but they will end
                // here, so no duplicates
                if (this.scheduledLayoutInvalidate.indexOf(recalcInitiators[i]) == -1) {
                    this.scheduledLayoutInvalidate.push(recalcInitiators[i]);
                }
            }
            // Coherent: and hide this event since we won't need it on the timeline
            event.name = RecordType.Coherent_Disabled;
          }

        } else {
            this.scheduledLayoutInvalidate.push(event);
        }
        break;
      }
      case RecordType.Coherent_Layout: {
        // This event can be sent from a different thread than the one
        // creating the initiators, in this case, we need to look up to
        // certain timeStamp and only the last frame id
        if (this.scheduledLayoutInvalidate) {
            var lastInitiatorIndex = this.scheduledLayoutInvalidate.findIndex(initiator =>
              (initiator.endTime && initiator.endTime > event.startTime || initiator.args['int0'] != event.args['int0']));
            if (lastInitiatorIndex > 0) {
                let initiators = this.scheduledLayoutInvalidate.splice(0, lastInitiatorIndex);
                timelineData.setInitiators(initiators);
            }
        }

        break;
      }
      // COHERENT END
      case RecordType.ResourceSendRequest:
      case RecordType.WebSocketCreate: {
        timelineData.setInitiator(eventStack[eventStack.length - 1] || null);
        timelineData.url = eventData['url'];
        break;
      }

      case RecordType.ScheduleStyleRecalculation: {
        this.lastScheduleStyleRecalculation[eventData['frame']] = event;
        break;
      }

      case RecordType.UpdateLayoutTree:
      case RecordType.RecalculateStyles: {
        this.invalidationTracker.didRecalcStyle(event);
        if (event.args['beginData']) {
          timelineData.setInitiator(this.lastScheduleStyleRecalculation[event.args['beginData']['frame']]);
        }
        this.lastRecalculateStylesEvent = event;
        if (this.currentScriptEvent) {
          this.currentTaskLayoutAndRecalcEvents.push(event);
        }
        break;
      }

      case RecordType.ScheduleStyleInvalidationTracking:
      case RecordType.StyleRecalcInvalidationTracking:
      case RecordType.StyleInvalidatorInvalidationTracking:
      case RecordType.LayoutInvalidationTracking: {
        this.invalidationTracker.addInvalidation(new InvalidationTrackingEvent(event, timelineData));
        break;
      }

      case RecordType.InvalidateLayout: {
        // Consider style recalculation as a reason for layout invalidation,
        // but only if we had no earlier layout invalidation records.
        let layoutInitator: (SDK.TracingModel.Event|null)|SDK.TracingModel.Event = event;
        const frameId = eventData['frame'];
        if (!this.layoutInvalidate[frameId] && this.lastRecalculateStylesEvent &&
            this.lastRecalculateStylesEvent.endTime !== undefined &&
            this.lastRecalculateStylesEvent.endTime > event.startTime) {
          layoutInitator = TimelineData.forEvent(this.lastRecalculateStylesEvent).initiator();
        }
        this.layoutInvalidate[frameId] = layoutInitator;
        break;
      }

      case RecordType.Layout: {
        this.invalidationTracker.didLayout(event);
        const frameId = event.args['beginData']['frame'];
        timelineData.setInitiator(this.layoutInvalidate[frameId]);
        // In case we have no closing Layout event, endData is not available.
        if (event.args['endData']) {
          if (event.args['endData']['layoutRoots']) {
            for (let i = 0; i < event.args['endData']['layoutRoots'].length; ++i) {
              timelineData.backendNodeIds.push(event.args['endData']['layoutRoots'][i]['nodeId']);
            }
          } else {
            timelineData.backendNodeIds.push(event.args['endData']['rootNode']);
          }
        }
        this.layoutInvalidate[frameId] = null;
        if (this.currentScriptEvent) {
          this.currentTaskLayoutAndRecalcEvents.push(event);
        }
        break;
      }

      case RecordType.Task: {
        if (event.duration !== undefined && event.duration > TimelineModelImpl.Thresholds.LongTask) {
          timelineData.warning = TimelineModelImpl.WarningType.LongTask;
        }
        break;
      }

      case RecordType.EventDispatch: {
        if (event.duration !== undefined && event.duration > TimelineModelImpl.Thresholds.RecurringHandler) {
          timelineData.warning = TimelineModelImpl.WarningType.LongHandler;
        }
        break;
      }

      case RecordType.TimerFire:
      case RecordType.FireAnimationFrame: {
        if (event.duration !== undefined && event.duration > TimelineModelImpl.Thresholds.RecurringHandler) {
          timelineData.warning = TimelineModelImpl.WarningType.LongRecurringHandler;
        }
        break;
      }
      // @ts-ignore fallthrough intended.
      case RecordType.FunctionCall: {
        // Compatibility with old format.
        if (typeof eventData['scriptName'] === 'string') {
          eventData['url'] = eventData['scriptName'];
        }
        if (typeof eventData['scriptLine'] === 'number') {
          eventData['lineNumber'] = eventData['scriptLine'];
        }
      }

      case RecordType.EvaluateScript:
      // @ts-ignore fallthrough intended.
      case RecordType.CompileScript: {
        if (typeof eventData['lineNumber'] === 'number') {
          --eventData['lineNumber'];
        }
        if (typeof eventData['columnNumber'] === 'number') {
          --eventData['columnNumber'];
        }
      }

      case RecordType.RunMicrotasks: {
        // Microtasks technically are not necessarily scripts, but for purpose of
        // forced sync style recalc or layout detection they are.
        if (!this.currentScriptEvent) {
          this.currentScriptEvent = event;
        }
        break;
      }

      case RecordType.SetLayerTreeId: {
        // This is to support old traces.
        if (this.sessionId && eventData['sessionId'] && this.sessionId === eventData['sessionId']) {
          this.mainFrameLayerTreeId = eventData['layerTreeId'];
          break;
        }

        // We currently only show layer tree for the main frame.
        const frameId = TimelineModelImpl.eventFrameId(event);
        const pageFrame = this.pageFrames.get(frameId);
        if (!pageFrame || pageFrame.parent) {
          return false;
        }
        this.mainFrameLayerTreeId = eventData['layerTreeId'];
        break;
      }

      case RecordType.Paint: {
        this.invalidationTracker.didPaint = true;
        timelineData.backendNodeIds.push(eventData['nodeId']);
        // Only keep layer paint events, skip paints for subframes that get painted to the same layer as parent.
        if (!eventData['layerId']) {
          break;
        }
        const layerId = eventData['layerId'];
        this.lastPaintForLayer[layerId] = event;
        break;
      }

      case RecordType.DisplayItemListSnapshot:
      case RecordType.PictureSnapshot: {
        const layerUpdateEvent = this.findAncestorEvent(RecordType.UpdateLayer);
        if (!layerUpdateEvent || layerUpdateEvent.args['layerTreeId'] !== this.mainFrameLayerTreeId) {
          break;
        }
        const paintEvent = this.lastPaintForLayer[layerUpdateEvent.args['layerId']];
        if (paintEvent) {
          TimelineData.forEvent(paintEvent).picture = (event as SDK.TracingModel.ObjectSnapshot);
        }
        break;
      }

      case RecordType.ScrollLayer: {
        timelineData.backendNodeIds.push(eventData['nodeId']);
        break;
      }

      case RecordType.PaintImage: {
        timelineData.backendNodeIds.push(eventData['nodeId']);
        timelineData.url = eventData['url'];
        break;
      }

      case RecordType.DecodeImage:
      case RecordType.ResizeImage: {
        let paintImageEvent = this.findAncestorEvent(RecordType.PaintImage);
        if (!paintImageEvent) {
          const decodeLazyPixelRefEvent = this.findAncestorEvent(RecordType.DecodeLazyPixelRef);
          paintImageEvent =
              decodeLazyPixelRefEvent && this.paintImageEventByPixelRefId[decodeLazyPixelRefEvent.args['LazyPixelRef']];
        }
        if (!paintImageEvent) {
          break;
        }
        const paintImageData = TimelineData.forEvent(paintImageEvent);
        timelineData.backendNodeIds.push(paintImageData.backendNodeIds[0]);
        timelineData.url = paintImageData.url;
        break;
      }

      case RecordType.DrawLazyPixelRef: {
        const paintImageEvent = this.findAncestorEvent(RecordType.PaintImage);
        if (!paintImageEvent) {
          break;
        }
        this.paintImageEventByPixelRefId[event.args['LazyPixelRef']] = paintImageEvent;
        const paintImageData = TimelineData.forEvent(paintImageEvent);
        timelineData.backendNodeIds.push(paintImageData.backendNodeIds[0]);
        timelineData.url = paintImageData.url;
        break;
      }

      case RecordType.FrameStartedLoading: {
        if (timelineData.frameId !== event.args['frame']) {
          return false;
        }
        break;
      }

      case RecordType.MarkLCPCandidate: {
        timelineData.backendNodeIds.push(eventData['nodeId']);
        break;
      }

      case RecordType.MarkDOMContent:
      case RecordType.MarkLoad: {
        const frameId = TimelineModelImpl.eventFrameId(event);
        if (!this.pageFrames.has(frameId)) {
          return false;
        }
        break;
      }

      case RecordType.CommitLoad: {
        if (this.browserFrameTracking) {
          break;
        }
        const frameId = TimelineModelImpl.eventFrameId(event);
        const isMainFrame = Boolean(eventData['isMainFrame']);
        const pageFrame = this.pageFrames.get(frameId);
        if (pageFrame) {
          pageFrame.update(event.startTime, eventData);
        } else {
          // We should only have one main frame which has persistent id,
          // unless it's an old trace without 'persistentIds' flag.
          if (!this.persistentIds) {
            if (eventData['page'] && eventData['page'] !== this.legacyCurrentPage) {
              return false;
            }
          } else if (isMainFrame) {
            return false;
          } else if (!this.addPageFrame(event, eventData)) {
            return false;
          }
        }
        if (isMainFrame) {
          const frame = this.pageFrames.get(frameId);
          if (frame) {
            this.mainFrame = frame;
          }
        }
        break;
      }

      case RecordType.FireIdleCallback: {
        if (event.duration !== undefined &&
            event.duration > eventData['allottedMilliseconds'] + TimelineModelImpl.Thresholds.IdleCallbackAddon) {
          timelineData.warning = TimelineModelImpl.WarningType.IdleDeadlineExceeded;
        }
        break;
      }
    }
    return true;
  }

  private processBrowserEvent(event: SDK.TracingModel.Event): void {
    if (event.name === RecordType.LatencyInfoFlow) {
      const frameId = event.args['frameTreeNodeId'];
      if (typeof frameId === 'number' && frameId === this.mainFrameNodeId && event.bind_id) {
        this.knownInputEvents.add(event.bind_id);
      }
      return;
    }

    if (event.name === RecordType.ResourceWillSendRequest) {
      const requestId = event.args?.data?.requestId;
      if (typeof requestId === 'string') {
        this.requestsFromBrowser.set(requestId, event);
      }
      return;
    }

    if (event.hasCategory(SDK.TracingModel.DevToolsMetadataEventCategory) && event.args['data']) {
      const data = event.args['data'];
      if (event.name === TimelineModelImpl.DevToolsMetadataEvent.TracingStartedInBrowser) {
        if (!data['persistentIds']) {
          return;
        }
        this.browserFrameTracking = true;
        this.mainFrameNodeId = data['frameTreeNodeId'];
        const frames: any[] = data['frames'] || [];
        frames.forEach(payload => {
          const parent = payload['parent'] && this.pageFrames.get(payload['parent']);
          if (payload['parent'] && !parent) {
            return;
          }
          let frame = this.pageFrames.get(payload['frame']);
          if (!frame) {
            frame = new PageFrame(payload);
            this.pageFrames.set(frame.frameId, frame);
            if (parent) {
              parent.addChild(frame);
            } else {
              this.mainFrame = frame;
            }
          }
          // TODO(dgozman): this should use event.startTime, but due to races between tracing start
          // in different processes we cannot do this yet.
          frame.update(this.minimumRecordTimeInternal, payload);
        });
        return;
      }
      if (event.name === TimelineModelImpl.DevToolsMetadataEvent.FrameCommittedInBrowser && this.browserFrameTracking) {
        let frame = this.pageFrames.get(data['frame']);
        if (!frame) {
          const parent = data['parent'] && this.pageFrames.get(data['parent']);
          if (!parent) {
            return;
          }
          frame = new PageFrame(data);
          this.pageFrames.set(frame.frameId, frame);
          parent.addChild(frame);
        }
        frame.update(event.startTime, data);
        return;
      }
      if (event.name === TimelineModelImpl.DevToolsMetadataEvent.ProcessReadyInBrowser && this.browserFrameTracking) {
        const frame = this.pageFrames.get(data['frame']);
        if (frame) {
          frame.processReady(data['processPseudoId'], data['processId']);
        }
        return;
      }
      if (event.name === TimelineModelImpl.DevToolsMetadataEvent.FrameDeletedInBrowser && this.browserFrameTracking) {
        const frame = this.pageFrames.get(data['frame']);
        if (frame) {
          frame.deletedTime = event.startTime;
        }
        return;
      }
    }
  }

  private ensureNamedTrack(type: TrackType): Track {
    let track = this.namedTracks.get(type);
    if (track) {
      return track;
    }

    track = new Track();
    track.type = type;
    this.tracksInternal.push(track);
    this.namedTracks.set(type, track);
    return track;
  }

  private findAncestorEvent(name: string): SDK.TracingModel.Event|null {
    for (let i = this.eventStack.length - 1; i >= 0; --i) {
      const event = this.eventStack[i];
      if (event.name === name) {
        return event;
      }
    }
    return null;
  }

  private addPageFrame(event: SDK.TracingModel.Event, payload: any): boolean {
    const parent = payload['parent'] && this.pageFrames.get(payload['parent']);
    if (payload['parent'] && !parent) {
      return false;
    }
    const pageFrame = new PageFrame(payload);
    this.pageFrames.set(pageFrame.frameId, pageFrame);
    pageFrame.update(event.startTime, payload);
    if (parent) {
      parent.addChild(pageFrame);
    }
    return true;
  }

  private reset(): void {
    this.isGenericTraceInternal = false;
    this.tracksInternal = [];
    this.namedTracks = new Map();
    this.inspectedTargetEventsInternal = [];
    this.timeMarkerEventsInternal = [];
    this.sessionId = null;
    this.mainFrameNodeId = null;
    this.cpuProfilesInternal = [];
    this.workerIdByThread = new WeakMap();
    this.pageFrames = new Map();
    this.requestsFromBrowser = new Map();

    this.minimumRecordTimeInternal = 0;
    this.maximumRecordTimeInternal = 0;

    this.totalBlockingTimeInternal = -1;
    this.estimatedTotalBlockingTime = 0;
  }

  isGenericTrace(): boolean {
    return this.isGenericTraceInternal;
  }

  tracingModel(): SDK.TracingModel.TracingModel|null {
    return this.tracingModelInternal;
  }

  minimumRecordTime(): number {
    return this.minimumRecordTimeInternal;
  }

  maximumRecordTime(): number {
    return this.maximumRecordTimeInternal;
  }

  inspectedTargetEvents(): SDK.TracingModel.Event[] {
    return this.inspectedTargetEventsInternal;
  }

  tracks(): Track[] {
    return this.tracksInternal;
  }

  isEmpty(): boolean {
    return this.minimumRecordTime() === 0 && this.maximumRecordTime() === 0;
  }

  timeMarkerEvents(): SDK.TracingModel.Event[] {
    return this.timeMarkerEventsInternal;
  }

  rootFrames(): PageFrame[] {
    return Array.from(this.pageFrames.values()).filter(frame => !frame.parent);
  }

  pageURL(): string {
    return this.mainFrame && this.mainFrame.url || '';
  }

  pageFrameById(frameId: string): PageFrame|null {
    return frameId ? this.pageFrames.get(frameId) || null : null;
  }

  networkRequests(): NetworkRequest[] {
    if (this.isGenericTrace()) {
      return [];
    }
    const requests = new Map<string, NetworkRequest>();
    const requestsList: NetworkRequest[] = [];
    const zeroStartRequestsList: NetworkRequest[] = [];
    const resourceTypes = new Set<string>([
      RecordType.ResourceWillSendRequest,
      RecordType.ResourceSendRequest,
      RecordType.ResourceReceiveResponse,
      RecordType.ResourceReceivedData,
      RecordType.ResourceFinish,
      RecordType.ResourceMarkAsCached,
    ]);
    const events = this.inspectedTargetEvents();
    for (let i = 0; i < events.length; ++i) {
      const e = events[i];
      if (!resourceTypes.has(e.name)) {
        continue;
      }
      const id = TimelineModelImpl.globalEventId(e, 'requestId');
      const requestId = e.args?.data?.requestId;
      if (e.name === RecordType.ResourceSendRequest && requestId && this.requestsFromBrowser.has(requestId)) {
        const event = this.requestsFromBrowser.get(requestId);
        if (event) {
          addRequest(event, id);
        }
      }
      addRequest(e, id);
    }
    function addRequest(e: SDK.TracingModel.Event, id: string): void {
      let request = requests.get(id);
      if (request) {
        request.addEvent(e);
      } else {
        request = new NetworkRequest(e);
        requests.set(id, request);
        if (request.startTime) {
          requestsList.push(request);
        } else {
          zeroStartRequestsList.push(request);
        }
      }
    }
    return zeroStartRequestsList.concat(requestsList);
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum RecordType {
  Task = 'RunTask',
  Program = 'Program',
  EventDispatch = 'EventDispatch',

  GPUTask = 'GPUTask',

  Animation = 'Animation',
  RequestMainThreadFrame = 'RequestMainThreadFrame',
  BeginFrame = 'BeginFrame',
  NeedsBeginFrameChanged = 'NeedsBeginFrameChanged',
  BeginMainThreadFrame = 'BeginMainThreadFrame',
  ActivateLayerTree = 'ActivateLayerTree',
  DrawFrame = 'DrawFrame',
  DroppedFrame = 'DroppedFrame',
  HitTest = 'HitTest',
  ScheduleStyleRecalculation = 'ScheduleStyleRecalculation',
  RecalculateStyles = 'RecalculateStyles',
  UpdateLayoutTree = 'UpdateLayoutTree',
  InvalidateLayout = 'InvalidateLayout',
  Layout = 'Layout',
  LayoutShift = 'LayoutShift',
  UpdateLayer = 'UpdateLayer',
  UpdateLayerTree = 'UpdateLayerTree',
  PaintSetup = 'PaintSetup',
  Paint = 'Paint',
  PaintImage = 'PaintImage',
  Rasterize = 'Rasterize',
  RasterTask = 'RasterTask',
  ScrollLayer = 'ScrollLayer',
  CompositeLayers = 'CompositeLayers',
  ComputeIntersections = 'IntersectionObserverController::computeIntersections',
  InteractiveTime = 'InteractiveTime',

  ScheduleStyleInvalidationTracking = 'ScheduleStyleInvalidationTracking',
  StyleRecalcInvalidationTracking = 'StyleRecalcInvalidationTracking',
  StyleInvalidatorInvalidationTracking = 'StyleInvalidatorInvalidationTracking',
  LayoutInvalidationTracking = 'LayoutInvalidationTracking',

  ParseHTML = 'ParseHTML',
  ParseAuthorStyleSheet = 'ParseAuthorStyleSheet',

  TimerInstall = 'TimerInstall',
  TimerRemove = 'TimerRemove',
  TimerFire = 'TimerFire',

  XHRReadyStateChange = 'XHRReadyStateChange',
  XHRLoad = 'XHRLoad',
  CompileScript = 'v8.compile',
  CompileCode = 'V8.CompileCode',
  OptimizeCode = 'V8.OptimizeCode',
  EvaluateScript = 'EvaluateScript',
  CompileModule = 'v8.compileModule',
  EvaluateModule = 'v8.evaluateModule',
  WasmStreamFromResponseCallback = 'v8.wasm.streamFromResponseCallback',
  WasmCompiledModule = 'v8.wasm.compiledModule',
  WasmCachedModule = 'v8.wasm.cachedModule',
  WasmModuleCacheHit = 'v8.wasm.moduleCacheHit',
  WasmModuleCacheInvalid = 'v8.wasm.moduleCacheInvalid',

  FrameStartedLoading = 'FrameStartedLoading',
  CommitLoad = 'CommitLoad',
  MarkLoad = 'MarkLoad',
  MarkDOMContent = 'MarkDOMContent',
  MarkFirstPaint = 'firstPaint',
  MarkFCP = 'firstContentfulPaint',
  MarkLCPCandidate = 'largestContentfulPaint::Candidate',
  MarkLCPInvalidate = 'largestContentfulPaint::Invalidate',
  NavigationStart = 'navigationStart',

  TimeStamp = 'TimeStamp',
  ConsoleTime = 'ConsoleTime',
  UserTiming = 'UserTiming',

  ResourceWillSendRequest = 'ResourceWillSendRequest',
  ResourceSendRequest = 'ResourceSendRequest',
  ResourceReceiveResponse = 'ResourceReceiveResponse',
  ResourceReceivedData = 'ResourceReceivedData',
  ResourceFinish = 'ResourceFinish',
  ResourceMarkAsCached = 'ResourceMarkAsCached',

  RunMicrotasks = 'RunMicrotasks',
  FunctionCall = 'FunctionCall',
  GCEvent = 'GCEvent',
  MajorGC = 'MajorGC',
  MinorGC = 'MinorGC',
  JSFrame = 'JSFrame',
  JSSample = 'JSSample',
  // V8Sample events are coming from tracing and contain raw stacks with function addresses.
  // After being processed with help of JitCodeAdded and JitCodeMoved events they
  // get translated into function infos and stored as stacks in JSSample events.
  V8Sample = 'V8Sample',
  JitCodeAdded = 'JitCodeAdded',
  JitCodeMoved = 'JitCodeMoved',
  StreamingCompileScript = 'v8.parseOnBackground',
  StreamingCompileScriptWaiting = 'v8.parseOnBackgroundWaiting',
  StreamingCompileScriptParsing = 'v8.parseOnBackgroundParsing',
  V8Execute = 'V8.Execute',

  UpdateCounters = 'UpdateCounters',

  RequestAnimationFrame = 'RequestAnimationFrame',
  CancelAnimationFrame = 'CancelAnimationFrame',
  FireAnimationFrame = 'FireAnimationFrame',

  RequestIdleCallback = 'RequestIdleCallback',
  CancelIdleCallback = 'CancelIdleCallback',
  FireIdleCallback = 'FireIdleCallback',

  WebSocketCreate = 'WebSocketCreate',
  WebSocketSendHandshakeRequest = 'WebSocketSendHandshakeRequest',
  WebSocketReceiveHandshakeResponse = 'WebSocketReceiveHandshakeResponse',
  WebSocketDestroy = 'WebSocketDestroy',

  EmbedderCallback = 'EmbedderCallback',

  SetLayerTreeId = 'SetLayerTreeId',
  TracingStartedInPage = 'TracingStartedInPage',
  TracingSessionIdForWorker = 'TracingSessionIdForWorker',

  DecodeImage = 'Decode Image',
  ResizeImage = 'Resize Image',
  DrawLazyPixelRef = 'Draw LazyPixelRef',
  DecodeLazyPixelRef = 'Decode LazyPixelRef',

  LazyPixelRef = 'LazyPixelRef',
  LayerTreeHostImplSnapshot = 'cc::LayerTreeHostImpl',
  PictureSnapshot = 'cc::Picture',
  DisplayItemListSnapshot = 'cc::DisplayItemList',
  LatencyInfo = 'LatencyInfo',
  LatencyInfoFlow = 'LatencyInfo.Flow',
  InputLatencyMouseMove = 'InputLatency::MouseMove',
  InputLatencyMouseWheel = 'InputLatency::MouseWheel',
  ImplSideFling = 'InputHandlerProxy::HandleGestureFling::started',
  GCCollectGarbage = 'BlinkGC.AtomicPhase',

  CryptoDoEncrypt = 'DoEncrypt',
  CryptoDoEncryptReply = 'DoEncryptReply',
  CryptoDoDecrypt = 'DoDecrypt',
  CryptoDoDecryptReply = 'DoDecryptReply',
  CryptoDoDigest = 'DoDigest',
  CryptoDoDigestReply = 'DoDigestReply',
  CryptoDoSign = 'DoSign',
  CryptoDoSignReply = 'DoSignReply',
  CryptoDoVerify = 'DoVerify',
  CryptoDoVerifyReply = 'DoVerifyReply',

  // CpuProfile is a virtual event created on frontend to support
  // serialization of CPU Profiles within tracing timeline data.
  CpuProfile = 'CpuProfile',
  Profile = 'Profile',

  AsyncTask = 'AsyncTask',

  // COHERENT BEGIN
  Coherent_Advance = 'Coherent_Advance',
  Coherent_JSEvent = 'Coherent_JSEvent',
  Coherent_ExecuteScript = 'Coherent_ExecuteScript',
  Coherent_SynchronizeModels = 'Coherent_SynchronizeModels',
  Coherent_BindingsReady = 'Coherent_BindingsReady',
  Coherent_TriggerEvent = 'Coherent_TriggerEvent',
  Coherent_ScheduleStyleRecalculation = 'Coherent_ScheduleStyleRecalculation',
  Coherent_RecalculateStyles = 'Coherent_RecalculateStyles',
  Coherent_RecalcVisualStyle = 'Coherent_RecalcVisualStyle',
  Coherent_MatchElements = 'Coherent_MatchElements',
  Coherent_UpdateNodeTransforms = 'Coherent_UpdateNodeTransforms',
  Coherent_ExecuteTimers = 'Coherent_ExecuteTimers',
  Coherent_InvalidateLayout = 'Coherent_InvalidateLayout',
  Coherent_Layout = 'Coherent_Layout',
  Coherent_RecordRendering = 'Coherent_RecordRendering',
  Coherent_Paint = 'Coherent_Paint',
  Coherent_WaitPendingFrame = 'Coherent_WaitPendingFrame',
  Coherent_ExecuteBuffers = 'Coherent_ExecuteBuffers',
  Coherent_Frontend = 'Coherent_Frontend',
  Coherent_Backend = 'Coherent_Backend',
  Coherent_GPU = 'Coherent_GPU',
  Coherent_BuildDOM = 'Coherent_BuildDOM',
  Coherent_InitializingURL = 'Coherent_InitializingURL',
  Coherent_CustomAttributeInit = 'Coherent_CustomAttributeInit',
  Coherent_CustomAttributeUpdate = 'Coherent_CustomAttributeUpdate',
  Coherent_CustomAttributeDeinit = 'Coherent_CustomAttributeDeinit',
  Coherent_Disabled = 'Coherent_Disabled',
  Coherent_ProcessFrontendCommands = 'Coherent_ProcessFrontendCommands',
  Coherent_ProcessLayer = 'Coherent_ProcessLayer',
  Coherent_BatchCommands = 'Coherent_BatchCommands',
  Coherent_DistributeLayers = 'Coherent_DistributeLayers',

  Coherent_SubmitGlyphs = 'Coherent_SubmitGlyphs',
  Coherent_SubmitManagerChanges = 'Coherent_SubmitManagerChanges',
  Coherent_ProcessFrontendCommandsOnly = 'Coherent_ProcessFrontendCommandsOnly',
  Coherent_DrawSDFGlyphs = 'Coherent_DrawSDFGlyphs',
  Coherent_DrawSubLayerWithShaderFilter = 'Coherent_DrawSubLayerWithShaderFilter',
  Coherent_Backend_Execute = 'Coherent_Backend_Execute',
  Coherent_ProcessSimpleSublayer = 'Coherent_ProcessSimpleSublayer',
  Coherent_ExecuteBackendBuffers = 'Coherent_ExecuteBackendBuffers',
  Coherent_CaptureTextureData = 'Coherent_CaptureTextureData',

  Coherent_TextureCreated = 'Coherent_TextureCreated',
  Coherent_TextureDestroyed = 'Coherent_TextureDestroyed',
  Coherent_VBCreated = 'Coherent_VBCreated',
  Coherent_VBDestroyed = 'Coherent_VBDestroyed',

  // COHERENT END
}

export namespace TimelineModelImpl {
  export const Category = {
    Console: 'blink.console',
    UserTiming: 'blink.user_timing',
    LatencyInfo: 'latencyInfo',
    Loading: 'loading',
  };

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line rulesdir/const_enum
  export enum WarningType {
    LongTask = 'LongTask',
    ForcedStyle = 'ForcedStyle',
    ForcedLayout = 'ForcedLayout',
    IdleDeadlineExceeded = 'IdleDeadlineExceeded',
    LongHandler = 'LongHandler',
    LongRecurringHandler = 'LongRecurringHandler',
    V8Deopt = 'V8Deopt',
  }

  export const WorkerThreadName = 'DedicatedWorker thread';
  export const WorkerThreadNameLegacy = 'DedicatedWorker Thread';
  export const RendererMainThreadName = 'CrRendererMain';
  export const BrowserMainThreadName = 'CrBrowserMain';

  export const DevToolsMetadataEvent = {
    TracingStartedInBrowser: 'TracingStartedInBrowser',
    TracingStartedInPage: 'TracingStartedInPage',
    TracingSessionIdForWorker: 'TracingSessionIdForWorker',
    FrameCommittedInBrowser: 'FrameCommittedInBrowser',
    ProcessReadyInBrowser: 'ProcessReadyInBrowser',
    FrameDeletedInBrowser: 'FrameDeletedInBrowser',
  };

  export const Thresholds = {
    LongTask: 50,
    Handler: 150,
    RecurringHandler: 50,
    ForcedLayout: 30,
    IdleCallbackAddon: 5,
  };
}

export class Track {
  name: string;
  type: TrackType;
  forMainFrame: boolean;
  url: string;
  events: SDK.TracingModel.Event[];
  asyncEvents: SDK.TracingModel.AsyncEvent[];
  tasks: SDK.TracingModel.Event[];
  private syncEventsInternal: SDK.TracingModel.Event[]|null;
  thread: SDK.TracingModel.Thread|null;
  constructor() {
    this.name = '';
    this.type = TrackType.Other;
    // TODO(dgozman): replace forMainFrame with a list of frames, urls and time ranges.
    this.forMainFrame = false;
    this.url = '';
    // TODO(dgozman): do not distinguish between sync and async events.
    this.events = [];
    this.asyncEvents = [];
    this.tasks = [];
    this.syncEventsInternal = null;
    this.thread = null;
  }

  syncEvents(): SDK.TracingModel.Event[] {
    if (this.events.length) {
      return this.events;
    }

    if (this.syncEventsInternal) {
      return this.syncEventsInternal;
    }

    const stack: SDK.TracingModel.Event[] = [];

    function peekLastEndTime(): number {
      const last = stack[stack.length - 1];
      if (last !== undefined) {
        const endTime = last.endTime;
        if (endTime !== undefined) {
          return endTime;
        }
      }
      throw new Error('End time does not exist on event.');
    }

    this.syncEventsInternal = [];
    for (const event of this.asyncEvents) {
      const startTime = event.startTime;
      let endTime: number|(number | undefined) = event.endTime;
      if (endTime === undefined) {
        endTime = startTime;
      }
      while (stack.length && startTime >= peekLastEndTime()) {
        stack.pop();
      }
      if (stack.length && endTime > peekLastEndTime()) {
        this.syncEventsInternal = [];
        break;
      }
      const syncEvent = new SDK.TracingModel.Event(
          event.categoriesString, event.name, SDK.TracingModel.Phase.Complete, startTime, event.thread);
      syncEvent.setEndTime(endTime);
      syncEvent.addArgs(event.args);
      this.syncEventsInternal.push(syncEvent);
      stack.push(syncEvent);
    }
    return this.syncEventsInternal;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum TrackType {
  MainThread = 'MainThread',
  Worker = 'Worker',
  Input = 'Input',
  Animation = 'Animation',
  Timings = 'Timings',
  Console = 'Console',
  Raster = 'Raster',
  GPU = 'GPU',
  Experience = 'Experience',
  Other = 'Other',
}

export class PageFrame {
  frameId: any;
  url: any;
  name: any;
  children: PageFrame[];
  parent: PageFrame|null;
  processes: {
    time: number,
    processId: number,
    processPseudoId: string|null,
    url: string,
  }[];
  deletedTime: number|null;
  ownerNode: SDK.DOMModel.DeferredDOMNode|null;
  constructor(payload: any) {
    this.frameId = payload['frame'];
    this.url = payload['url'] || '';
    this.name = payload['name'];
    this.children = [];
    this.parent = null;
    this.processes = [];
    this.deletedTime = null;
    // TODO(dgozman): figure this out.
    // this.ownerNode = target && payload['nodeId'] ? new SDK.DOMModel.DeferredDOMNode(target, payload['nodeId']) : null;
    this.ownerNode = null;
  }

  update(time: number, payload: any): void {
    this.url = payload['url'] || '';
    this.name = payload['name'];
    if (payload['processId']) {
      this.processes.push(
          {time: time, processId: payload['processId'], processPseudoId: '', url: payload['url'] || ''});
    } else {
      this.processes.push(
          {time: time, processId: -1, processPseudoId: payload['processPseudoId'], url: payload['url'] || ''});
    }
  }

  processReady(processPseudoId: string, processId: number): void {
    for (const process of this.processes) {
      if (process.processPseudoId === processPseudoId) {
        process.processPseudoId = '';
        process.processId = processId;
      }
    }
  }

  addChild(child: PageFrame): void {
    this.children.push(child);
    child.parent = this;
  }
}

export class NetworkRequest {
  startTime: number;
  endTime: number;
  encodedDataLength: number;
  decodedBodyLength: number;
  children: SDK.TracingModel.Event[];
  timing!: {
    pushStart: number,
    requestTime: number,
    sendStart: number,
    receiveHeadersEnd: number,
  };
  mimeType!: string;
  url!: string;
  requestMethod!: string;
  private transferSize: number;
  private maybeDiskCached: boolean;
  private memoryCachedInternal: boolean;
  priority?: any;
  finishTime?: number;
  responseTime?: number;
  fromServiceWorker?: boolean;
  hasCachedResource?: boolean;
  constructor(event: SDK.TracingModel.Event) {
    const isInitial =
        event.name === RecordType.ResourceSendRequest || event.name === RecordType.ResourceWillSendRequest;
    this.startTime = isInitial ? event.startTime : 0;
    this.endTime = Infinity;
    this.encodedDataLength = 0;
    this.decodedBodyLength = 0;
    this.children = [];
    this.transferSize = 0;
    this.maybeDiskCached = false;
    this.memoryCachedInternal = false;
    this.addEvent(event);
  }

  addEvent(event: SDK.TracingModel.Event): void {
    this.children.push(event);
    // This Math.min is likely because of BUG(chromium:865066).
    this.startTime = Math.min(this.startTime, event.startTime);
    const eventData = event.args['data'];
    if (eventData['mimeType']) {
      this.mimeType = eventData['mimeType'];
    }
    if ('priority' in eventData) {
      this.priority = eventData['priority'];
    }
    if (event.name === RecordType.ResourceFinish) {
      this.endTime = event.startTime;
    }
    if (eventData['finishTime']) {
      this.finishTime = eventData['finishTime'] * 1000;
    }
    if (!this.responseTime &&
        (event.name === RecordType.ResourceReceiveResponse || event.name === RecordType.ResourceReceivedData)) {
      this.responseTime = event.startTime;
    }
    const encodedDataLength = eventData['encodedDataLength'] || 0;
    if (event.name === RecordType.ResourceMarkAsCached) {
      // This is a reliable signal for memory caching.
      this.memoryCachedInternal = true;
    }
    if (event.name === RecordType.ResourceReceiveResponse) {
      if (eventData['fromCache']) {
        // See BUG(chromium:998397): back-end over-approximates caching.
        this.maybeDiskCached = true;
      }
      if (eventData['fromServiceWorker']) {
        this.fromServiceWorker = true;
      }
      if (eventData['hasCachedResource']) {
        this.hasCachedResource = true;
      }
      this.encodedDataLength = encodedDataLength;
    }
    if (event.name === RecordType.ResourceReceivedData) {
      this.encodedDataLength += encodedDataLength;
    }
    if (event.name === RecordType.ResourceFinish && encodedDataLength) {
      this.encodedDataLength = encodedDataLength;
      // If a ResourceFinish event with an encoded data length is received,
      // then the resource was not cached; it was fetched before it was
      // requested, e.g. because it was pushed in this navigation.
      this.transferSize = encodedDataLength;
    }
    const decodedBodyLength = eventData['decodedBodyLength'];
    if (event.name === RecordType.ResourceFinish && decodedBodyLength) {
      this.decodedBodyLength = decodedBodyLength;
    }
    if (!this.url) {
      this.url = eventData['url'];
    }
    if (!this.requestMethod) {
      this.requestMethod = eventData['requestMethod'];
    }
    if (!this.timing) {
      this.timing = eventData['timing'];
    }
    if (eventData['fromServiceWorker']) {
      this.fromServiceWorker = true;
    }
  }

  /**
   * Return whether this request was cached. This works around BUG(chromium:998397),
   * which reports pushed resources, and resources serverd by a service worker as
   * disk cached. Pushed resources that were not disk cached, however, have a non-zero
   * `transferSize`.
   */
  cached(): boolean {
    return Boolean(this.memoryCachedInternal) ||
        (Boolean(this.maybeDiskCached) && !this.transferSize && !this.fromServiceWorker);
  }

  /**
   * Return whether this request was served from a memory cache.
   */
  memoryCached(): boolean {
    return this.memoryCachedInternal;
  }

  /**
   * Get the timing information for this request. If the request was cached,
   * the timing refers to the original (uncached) load, and should not be used.
   */
  getSendReceiveTiming(): {
    sendStartTime: number,
    headersEndTime: number,
  } {
    if (this.cached() || !this.timing) {
      // If the request is served from cache, the timing refers to the original
      // resource load, and should not be used.
      return {sendStartTime: this.startTime, headersEndTime: this.startTime};
    }
    const requestTime = this.timing.requestTime * 1000;
    const sendStartTime = requestTime + this.timing.sendStart;
    const headersEndTime = requestTime + this.timing.receiveHeadersEnd;
    return {sendStartTime, headersEndTime};
  }

  /**
   * Get the start time of this request, i.e. the time when the browser or
   * renderer queued this request. There are two cases where request time is
   * earlier than `startTime`: (1) if the request is served from cache, because
   * it refers to the original load of the resource. (2) if the request was
   * initiated by the browser instead of the renderer. Only in case (2) the
   * the request time must be used instead of the start time to work around
   * BUG(chromium:865066).
   */
  getStartTime(): number {
    return Math.min(this.startTime, !this.cached() && this.timing && this.timing.requestTime * 1000 || Infinity);
  }

  /**
   * Returns the time where the earliest event belonging to this request starts.
   * This differs from `getStartTime()` if a previous HTTP/2 request pushed the
   * resource proactively: Then `beginTime()` refers to the time the push was received.
   */
  beginTime(): number {
    // `pushStart` is referring to the original push if the request was cached (i.e. in
    // general not the most recent push), and should hence only be used for requests that were not cached.
    return Math.min(this.getStartTime(), !this.cached() && this.timing && this.timing.pushStart * 1000 || Infinity);
  }
}

export class InvalidationTrackingEvent {
  type: string;
  startTime: number;
  readonly tracingEvent: SDK.TracingModel.Event;
  frame: number;
  nodeId: number|null;
  nodeName: string|null;
  invalidationSet: number|null;
  invalidatedSelectorId: string|null;
  changedId: string|null;
  changedClass: string|null;
  changedAttribute: string|null;
  changedPseudo: string|null;
  selectorPart: string|null;
  extraData: string|null;
  invalidationList: {
    [x: string]: number,
  }[]|null;
  cause: InvalidationCause;
  linkedRecalcStyleEvent: boolean;
  linkedLayoutEvent: boolean;
  constructor(event: SDK.TracingModel.Event, timelineData: TimelineData) {
    this.type = event.name;
    this.startTime = event.startTime;
    this.tracingEvent = event;

    const eventData = event.args['data'];

    this.frame = eventData['frame'];
    this.nodeId = eventData['nodeId'];
    this.nodeName = eventData['nodeName'];
    this.invalidationSet = eventData['invalidationSet'];
    this.invalidatedSelectorId = eventData['invalidatedSelectorId'];
    this.changedId = eventData['changedId'];
    this.changedClass = eventData['changedClass'];
    this.changedAttribute = eventData['changedAttribute'];
    this.changedPseudo = eventData['changedPseudo'];
    this.selectorPart = eventData['selectorPart'];
    this.extraData = eventData['extraData'];
    this.invalidationList = eventData['invalidationList'];
    this.cause = {reason: eventData['reason'], stackTrace: timelineData.stackTrace};
    this.linkedRecalcStyleEvent = false;
    this.linkedLayoutEvent = false;

    // FIXME: Move this to TimelineUIUtils.js.
    if (!this.cause.reason && this.cause.stackTrace && this.type === RecordType.LayoutInvalidationTracking) {
      this.cause.reason = 'Layout forced';
    }
  }
}

export class InvalidationTracker {
  private lastRecalcStyle: SDK.TracingModel.Event|null;
  private lastPaintWithLayer: SDK.TracingModel.Event|null;
  didPaint: boolean;
  private invalidations: {
    [x: string]: InvalidationTrackingEvent[],
  };
  private invalidationsByNodeId: {
    [x: number]: InvalidationTrackingEvent[],
  };
  constructor() {
    this.lastRecalcStyle = null;
    this.lastPaintWithLayer = null;
    this.didPaint = false;
    this.initializePerFrameState();
    this.invalidations = {};
    this.invalidationsByNodeId = {};
  }

  static invalidationEventsFor(event: SDK.TracingModel.Event): InvalidationTrackingEvent[]|null {
    return eventToInvalidation.get(event) || null;
  }

  addInvalidation(invalidation: InvalidationTrackingEvent): void {
    this.startNewFrameIfNeeded();

    if (!invalidation.nodeId) {
      console.error('Invalidation lacks node information.');
      console.error(invalidation);
      return;
    }

    // Suppress StyleInvalidator StyleRecalcInvalidationTracking invalidations because they
    // will be handled by StyleInvalidatorInvalidationTracking.
    // FIXME: Investigate if we can remove StyleInvalidator invalidations entirely.
    if (invalidation.type === RecordType.StyleRecalcInvalidationTracking &&
        invalidation.cause.reason === 'StyleInvalidator') {
      return;
    }

    // Style invalidation events can occur before and during recalc style. didRecalcStyle
    // handles style invalidations that occur before the recalc style event but we need to
    // handle style recalc invalidations during recalc style here.
    const styleRecalcInvalidation =
        (invalidation.type === RecordType.ScheduleStyleInvalidationTracking ||
         invalidation.type === RecordType.StyleInvalidatorInvalidationTracking ||
         invalidation.type === RecordType.StyleRecalcInvalidationTracking);
    if (styleRecalcInvalidation) {
      const duringRecalcStyle = invalidation.startTime && this.lastRecalcStyle &&
          this.lastRecalcStyle.endTime !== undefined && invalidation.startTime >= this.lastRecalcStyle.startTime &&
          invalidation.startTime <= this.lastRecalcStyle.endTime;
      if (duringRecalcStyle) {
        this.associateWithLastRecalcStyleEvent(invalidation);
      }
    }

    // Record the invalidation so later events can look it up.
    if (this.invalidations[invalidation.type]) {
      this.invalidations[invalidation.type].push(invalidation);
    } else {
      this.invalidations[invalidation.type] = [invalidation];
    }
    if (invalidation.nodeId) {
      if (this.invalidationsByNodeId[invalidation.nodeId]) {
        this.invalidationsByNodeId[invalidation.nodeId].push(invalidation);
      } else {
        this.invalidationsByNodeId[invalidation.nodeId] = [invalidation];
      }
    }
  }

  didRecalcStyle(recalcStyleEvent: SDK.TracingModel.Event): void {
    this.lastRecalcStyle = recalcStyleEvent;
    const types = [
      RecordType.ScheduleStyleInvalidationTracking,
      RecordType.StyleInvalidatorInvalidationTracking,
      RecordType.StyleRecalcInvalidationTracking,
    ];
    for (const invalidation of this.invalidationsOfTypes(types)) {
      this.associateWithLastRecalcStyleEvent(invalidation);
    }
  }

  private associateWithLastRecalcStyleEvent(invalidation: InvalidationTrackingEvent): void {
    if (invalidation.linkedRecalcStyleEvent) {
      return;
    }

    if (!this.lastRecalcStyle) {
      throw new Error('Last recalculate style event not set.');
    }
    const recalcStyleFrameId = this.lastRecalcStyle.args['beginData']['frame'];
    if (invalidation.type === RecordType.StyleInvalidatorInvalidationTracking) {
      // Instead of calling addInvalidationToEvent directly, we create synthetic
      // StyleRecalcInvalidationTracking events which will be added in addInvalidationToEvent.
      this.addSyntheticStyleRecalcInvalidations(this.lastRecalcStyle, recalcStyleFrameId, invalidation);
    } else if (invalidation.type === RecordType.ScheduleStyleInvalidationTracking) {
      // ScheduleStyleInvalidationTracking events are only used for adding information to
      // StyleInvalidatorInvalidationTracking events. See: addSyntheticStyleRecalcInvalidations.
    } else {
      this.addInvalidationToEvent(this.lastRecalcStyle, recalcStyleFrameId, invalidation);
    }

    invalidation.linkedRecalcStyleEvent = true;
  }

  private addSyntheticStyleRecalcInvalidations(
      event: SDK.TracingModel.Event, frameId: number, styleInvalidatorInvalidation: InvalidationTrackingEvent): void {
    if (!styleInvalidatorInvalidation.invalidationList) {
      this.addSyntheticStyleRecalcInvalidation(styleInvalidatorInvalidation.tracingEvent, styleInvalidatorInvalidation);
      return;
    }
    if (!styleInvalidatorInvalidation.nodeId) {
      console.error('Invalidation lacks node information.');
      console.error(styleInvalidatorInvalidation);
      return;
    }
    for (let i = 0; i < styleInvalidatorInvalidation.invalidationList.length; i++) {
      const setId = styleInvalidatorInvalidation.invalidationList[i]['id'];
      let lastScheduleStyleRecalculation;
      const nodeInvalidations = this.invalidationsByNodeId[styleInvalidatorInvalidation.nodeId] || [];
      for (let j = 0; j < nodeInvalidations.length; j++) {
        const invalidation = nodeInvalidations[j];
        if (invalidation.frame !== frameId || invalidation.invalidationSet !== setId ||
            invalidation.type !== RecordType.ScheduleStyleInvalidationTracking) {
          continue;
        }
        lastScheduleStyleRecalculation = invalidation;
      }
      if (!lastScheduleStyleRecalculation) {
        console.error('Failed to lookup the event that scheduled a style invalidator invalidation.');
        continue;
      }
      this.addSyntheticStyleRecalcInvalidation(
          lastScheduleStyleRecalculation.tracingEvent, styleInvalidatorInvalidation);
    }
  }

  private addSyntheticStyleRecalcInvalidation(
      baseEvent: SDK.TracingModel.Event, styleInvalidatorInvalidation: InvalidationTrackingEvent): void {
    const timelineData = TimelineData.forEvent(baseEvent);
    const invalidation = new InvalidationTrackingEvent(baseEvent, timelineData);
    invalidation.type = RecordType.StyleRecalcInvalidationTracking;
    if (styleInvalidatorInvalidation.cause.reason) {
      invalidation.cause.reason = styleInvalidatorInvalidation.cause.reason;
    }
    if (styleInvalidatorInvalidation.selectorPart) {
      invalidation.selectorPart = styleInvalidatorInvalidation.selectorPart;
    }

    this.addInvalidation(invalidation);
    if (!invalidation.linkedRecalcStyleEvent) {
      this.associateWithLastRecalcStyleEvent(invalidation);
    }
  }

  didLayout(layoutEvent: SDK.TracingModel.Event): void {
    const layoutFrameId = layoutEvent.args['beginData']['frame'];
    for (const invalidation of this.invalidationsOfTypes([RecordType.LayoutInvalidationTracking])) {
      if (invalidation.linkedLayoutEvent) {
        continue;
      }
      this.addInvalidationToEvent(layoutEvent, layoutFrameId, invalidation);
      invalidation.linkedLayoutEvent = true;
    }
  }

  private addInvalidationToEvent(
      event: SDK.TracingModel.Event, eventFrameId: number, invalidation: InvalidationTrackingEvent): void {
    if (eventFrameId !== invalidation.frame) {
      return;
    }
    const invalidations = eventToInvalidation.get(event);
    if (!invalidations) {
      eventToInvalidation.set(event, [invalidation]);
    } else {
      invalidations.push(invalidation);
    }
  }

  private invalidationsOfTypes(types?: string[]): Generator<InvalidationTrackingEvent, any, any> {
    const invalidations = this.invalidations;
    if (!types) {
      types = Object.keys(invalidations);
    }
    function* generator(): Generator<InvalidationTrackingEvent, void, unknown> {
      if (!types) {
        return;
      }
      for (let i = 0; i < types.length; ++i) {
        const invalidationList = invalidations[types[i]] || [];
        for (let j = 0; j < invalidationList.length; ++j) {
          yield invalidationList[j];
        }
      }
    }
    return generator();
  }

  private startNewFrameIfNeeded(): void {
    if (!this.didPaint) {
      return;
    }

    this.initializePerFrameState();
  }

  private initializePerFrameState(): void {
    this.invalidations = {};
    this.invalidationsByNodeId = {};

    this.lastRecalcStyle = null;
    this.lastPaintWithLayer = null;
    this.didPaint = false;
  }
}

export class TimelineAsyncEventTracker {
  private readonly initiatorByType: Map<RecordType, Map<RecordType, SDK.TracingModel.Event>>;
  constructor() {
    TimelineAsyncEventTracker.initialize();
    this.initiatorByType = new Map();
    if (TimelineAsyncEventTracker.asyncEvents) {
      for (const initiator of TimelineAsyncEventTracker.asyncEvents.keys()) {
        this.initiatorByType.set(initiator, new Map());
      }
    }
  }

  private static initialize(): void {
    if (TimelineAsyncEventTracker.asyncEvents) {
      return;
    }

    const events = new Map<RecordType, {
      causes: RecordType[],
      joinBy: string,
    }>();

    events.set(RecordType.TimerInstall, {causes: [RecordType.TimerFire], joinBy: 'timerId'});
    events.set(RecordType.ResourceSendRequest, {
      causes: [
        RecordType.ResourceMarkAsCached,
        RecordType.ResourceReceiveResponse,
        RecordType.ResourceReceivedData,
        RecordType.ResourceFinish,
      ],
      joinBy: 'requestId',
    });
    events.set(RecordType.RequestAnimationFrame, {causes: [RecordType.FireAnimationFrame], joinBy: 'id'});
    events.set(RecordType.RequestIdleCallback, {causes: [RecordType.FireIdleCallback], joinBy: 'id'});
    events.set(RecordType.WebSocketCreate, {
      causes: [
        RecordType.WebSocketSendHandshakeRequest,
        RecordType.WebSocketReceiveHandshakeResponse,
        RecordType.WebSocketDestroy,
      ],
      joinBy: 'identifier',
    });

    TimelineAsyncEventTracker.asyncEvents = events;
    TimelineAsyncEventTracker.typeToInitiator = new Map();
    for (const entry of events) {
      const types = entry[1].causes;
      for (const currentType of types) {
        TimelineAsyncEventTracker.typeToInitiator.set(currentType, entry[0]);
      }
    }
  }

  processEvent(event: SDK.TracingModel.Event): void {
    if (!TimelineAsyncEventTracker.typeToInitiator || !TimelineAsyncEventTracker.asyncEvents) {
      return;
    }
    let initiatorType: RecordType|undefined = TimelineAsyncEventTracker.typeToInitiator.get((event.name as RecordType));
    const isInitiator = !initiatorType;
    if (!initiatorType) {
      initiatorType = (event.name as RecordType);
    }
    const initiatorInfo = TimelineAsyncEventTracker.asyncEvents.get(initiatorType);
    if (!initiatorInfo) {
      return;
    }
    const id = (TimelineModelImpl.globalEventId(event, initiatorInfo.joinBy) as RecordType);
    if (!id) {
      return;
    }
    const initiatorMap: Map<RecordType, SDK.TracingModel.Event>|undefined = this.initiatorByType.get(initiatorType);
    if (initiatorMap) {
      if (isInitiator) {
        initiatorMap.set(id, event);
        return;
      }
      const initiator = initiatorMap.get(id);
      const timelineData = TimelineData.forEvent(event);
      timelineData.setInitiator(initiator ? initiator : null);
      if (!timelineData.frameId && initiator) {
        timelineData.frameId = TimelineModelImpl.eventFrameId(initiator);
      }
    }
  }

  private static asyncEvents: Map<RecordType, {causes: RecordType[], joinBy: string}>|null = null;
  private static typeToInitiator: Map<RecordType, RecordType>|null = null;
}

export class TimelineData {
  warning: string|null;
  previewElement: Element|null;
  url: string|null;
  backendNodeIds: Protocol.DOM.BackendNodeId[];
  stackTrace: Protocol.Runtime.CallFrame[]|null;
  picture: SDK.TracingModel.ObjectSnapshot|null;
  private initiatorInternal: SDK.TracingModel.Event|null;
  frameId: string;
  timeWaitingForMainThread?: number;
  // COHERENT BEGIN
  private initiatorsInternal: SDK.TracingModel.Event[]|null;
  // COHERENT END

  constructor() {
    this.warning = null;
    this.previewElement = null;
    this.url = null;
    this.backendNodeIds = [];
    this.stackTrace = null;
    this.picture = null;
    this.initiatorInternal = null;
    this.frameId = '';

    // COHERENT BEGIN
    this.initiatorsInternal = [];
    // COHERENT END
  }

  // COHERENT BEGIN

  setUrl(url: string): void {
    this.url = url;
  }

  addInitiator(initiator: SDK.TracingModel.Event|null): void {
      if (!initiator || !this.initiatorsInternal) {
        return;
      }
      this.initiatorsInternal.push(initiator);
  }

  setInitiators(initiators: SDK.TracingModel.Event[]|null): void {
      this.initiatorsInternal = initiators;
  }

  initiators(): SDK.TracingModel.Event[]|null {
      return this.initiatorsInternal;
  }

  // COHERENT END

  setInitiator(initiator: SDK.TracingModel.Event|null): void {
    this.initiatorInternal = initiator;
    if (!initiator || this.url) {
      return;
    }
    const initiatorURL = TimelineData.forEvent(initiator).url;
    if (initiatorURL) {
      this.url = initiatorURL;
    }
  }

  initiator(): SDK.TracingModel.Event|null {
    return this.initiatorInternal;
  }

  topFrame(): Protocol.Runtime.CallFrame|null {
    const stackTrace = this.stackTraceForSelfOrInitiator();
    return stackTrace && stackTrace[0] || null;
  }

  stackTraceForSelfOrInitiator(): Protocol.Runtime.CallFrame[]|null {
    return this.stackTrace || (this.initiatorInternal && TimelineData.forEvent(this.initiatorInternal).stackTrace);
  }

  static forEvent(event: SDK.TracingModel.Event): TimelineData {
    let data = eventToData.get(event);
    if (!data) {
      data = new TimelineData();
      eventToData.set(event, data);
    }
    return data;
  }
}

const eventToData = new WeakMap();
const eventToInvalidation = new WeakMap();
export interface InvalidationCause {
  reason: string;
  stackTrace: Protocol.Runtime.CallFrame[]|null;
}
export interface MetadataEvents {
  page: SDK.TracingModel.Event[];
  workers: SDK.TracingModel.Event[];
}
